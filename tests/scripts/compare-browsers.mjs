/**
 * Run the Playwright suite once in installed Google Chrome and once against
 * a local Lightpanda CDP server, then print pass/fail, duration, and peak RSS.
 *
 *   node scripts/compare-browsers.mjs
 *   node scripts/compare-browsers.mjs --only chrome
 *   node scripts/compare-browsers.mjs --only lightpanda
 *
 * Lightpanda is started on 127.0.0.1:9222 unless PLAYWRIGHT_CDP_ENDPOINT is
 * already set (for example a Lightpanda Cloud wss:// URL). A cloud browser
 * cannot reach a shop that is only bound to localhost.
 */
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const testsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(testsDir, '.env') });

const outDir = path.join(testsDir, '.compare');
const lightpandaPort = Number(process.env.LIGHTPANDA_PORT || 9222);
const lightpandaBin =
    process.env.LIGHTPANDA_BIN || path.join(os.homedir(), '.local/bin/lightpanda');
const only = readOnly();

function readOnly() {
    const flag = process.argv.indexOf('--only');
    if (flag === -1) {
        return null;
    }
    const value = process.argv[flag + 1];
    if (value !== 'chrome' && value !== 'lightpanda') {
        throw new Error('--only expects "chrome" or "lightpanda"');
    }
    return value;
}

function waitForPort(port, host, timeoutMs) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = net.connect({ port, host }, () => {
                socket.end();
                resolve();
            });
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() - started > timeoutMs) {
                    reject(new Error(`Lightpanda did not listen on ${host}:${port}`));
                    return;
                }
                setTimeout(attempt, 100);
            });
        };
        attempt();
    });
}

function startLightpanda() {
    const logPath = path.join(outDir, 'lightpanda.log');
    const log = createWriteStream(logPath);
    const child = spawn(
        lightpandaBin,
        [
            'serve',
            '--host',
            '127.0.0.1',
            '--port',
            String(lightpandaPort),
            // Shopware's admin shell and axe-core both push CDP messages
            // past Lightpanda's 1 MiB default.
            '--cdp-max-message-size',
            String(64 * 1024 * 1024),
            '--cdp-max-http-message-size',
            String(64 * 1024 * 1024),
        ],
        {
            env: { ...process.env, LIGHTPANDA_DISABLE_TELEMETRY: 'true' },
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.on('error', (error) => {
        process.stderr.write(`Failed to start Lightpanda (${lightpandaBin}): ${error.message}\n`);
    });
    return child;
}

async function sampleRss(matches) {
    const entries = await readdir('/proc');
    let sumKb = 0;
    let count = 0;
    for (const entry of entries) {
        if (!/^\d+$/.test(entry)) {
            continue;
        }
        let command = '';
        try {
            command = await readFile(`/proc/${entry}/cmdline`, 'utf8');
        } catch {
            continue;
        }
        command = command.replaceAll('\0', ' ');
        if (!matches(command)) {
            continue;
        }
        let status = '';
        try {
            status = await readFile(`/proc/${entry}/status`, 'utf8');
        } catch {
            continue;
        }
        const rss = status.match(/^VmRSS:\s+(\d+)\s+kB/m);
        if (!rss) {
            continue;
        }
        sumKb += Number(rss[1]);
        count += 1;
    }
    return { sumKb, count };
}

function runPlaywright(label, extraEnv, matches) {
    const jsonPath = path.join(outDir, `${label}.json`);
    const playwrightBin = path.join(testsDir, 'node_modules/.bin/playwright');
    return new Promise((resolve) => {
        const out = createWriteStream(jsonPath);
        const stderr = [];
        const child = spawn(playwrightBin, ['test', '--reporter=json'], {
            cwd: testsDir,
            env: { ...process.env, ...extraEnv },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        child.stdout.pipe(out);
        child.stderr.on('data', (chunk) => {
            stderr.push(chunk);
            process.stderr.write(chunk);
        });
        const memory = { peakKb: 0, peakProcesses: 0 };
        const timer = setInterval(() => {
            sampleRss(matches)
                .then((sample) => {
                    if (sample.sumKb > memory.peakKb) {
                        memory.peakKb = sample.sumKb;
                        memory.peakProcesses = sample.count;
                    }
                })
                .catch(() => undefined);
        }, 250);
        child.on('close', (code) => {
            clearInterval(timer);
            const finish = () => {
                resolve({
                    code: code ?? 1,
                    memory,
                    jsonPath,
                    stderr: Buffer.concat(stderr).toString(),
                });
            };
            // Register the callback before ending. Attaching it afterwards
            // misses a synchronous 'finish' and Node then exits while the
            // suite promise is still pending.
            out.end(finish);
        });
    });
}

function flattenSpecs(suite, prefix, rows) {
    const title = [prefix, suite.title].filter(Boolean).join(' > ');
    for (const spec of suite.specs ?? []) {
        const result = spec.tests?.[0]?.results?.at(-1);
        rows.push({
            title: [title, spec.title].filter(Boolean).join(' > '),
            status: result?.status ?? spec.tests?.[0]?.status ?? 'missing',
            durationMs: result?.duration ?? 0,
            error: failureDetail(result),
        });
    }
    for (const child of suite.suites ?? []) {
        flattenSpecs(child, title, rows);
    }
}

function stripAnsi(value) {
    return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function firstLine(value) {
    if (!value) {
        return '';
    }
    const line = stripAnsi(value).split('\n').find((part) => part.trim().length > 0) ?? '';
    return line.replace(/\s+/g, ' ').slice(0, 220);
}

function failureDetail(result) {
    const messages = [];
    for (const error of result?.errors ?? []) {
        if (error?.message) {
            messages.push(error.message);
        }
    }
    if (result?.error?.message) {
        messages.push(result.error.message);
    }
    const specific = messages
        .map((message) => firstLine(message))
        .find((line) => line && !line.includes('Test timeout of'));
    return specific || firstLine(messages[0] || '');
}

async function readReport(jsonPath) {
    const raw = await readFile(jsonPath, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error(`Playwright wrote an empty report to ${jsonPath}`);
    }
    const report = JSON.parse(trimmed);
    const rows = [];
    for (const suite of report.suites ?? []) {
        flattenSpecs(suite, '', rows);
    }
    return {
        stats: report.stats ?? {},
        errors: report.errors ?? [],
        rows,
    };
}

function formatMs(ms) {
    if (!Number.isFinite(ms)) {
        return '—';
    }
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatMb(kb) {
    if (!kb) {
        return '—';
    }
    return `${(kb / 1024).toFixed(1)} MiB`;
}

function statusCell(row) {
    if (!row) {
        return 'not run';
    }
    const timing = formatMs(row.durationMs);
    if (row.status === 'passed') {
        return `${timing} passed`;
    }
    const detail = row.error ? ` — ${row.error}` : '';
    return `${timing} ${row.status}${detail}`;
}

function printComparison(results) {
    const titles = new Set();
    for (const result of results) {
        for (const row of result.report?.rows ?? []) {
            titles.add(row.title);
        }
    }

    const header = ['Test', ...results.map((result) => result.label)];
    const lines = [
        `# Playwright browser comparison`,
        ``,
        `Shop: ${process.env.APP_URL || '(APP_URL unset)'}`,
        ``,
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
    ];
    for (const title of titles) {
        const cells = results.map((result) => {
            const row = result.report?.rows.find((item) => item.title === title);
            return statusCell(row).replaceAll('|', '\\|');
        });
        lines.push(`| ${title.replaceAll('|', '\\|')} | ${cells.join(' | ')} |`);
    }
    lines.push('');
    lines.push('|  | ' + results.map((result) => result.label).join(' | ') + ' |');
    lines.push('| --- | ' + results.map(() => '---').join(' | ') + ' |');
    lines.push(
        '| Suite duration | ' +
            results
                .map((result) => formatMs(result.report?.stats?.duration))
                .join(' | ') +
            ' |',
    );
    lines.push(
        '| Passed | ' +
            results.map((result) => String(result.report?.stats?.expected ?? '—')).join(' | ') +
            ' |',
    );
    lines.push(
        '| Failed | ' +
            results
                .map((result) => String(result.report?.stats?.unexpected ?? '—'))
                .join(' | ') +
            ' |',
    );
    lines.push(
        '| Peak RSS (sum of browser processes) | ' +
            results
                .map((result) => `${formatMb(result.memory.peakKb)} (${result.memory.peakProcesses} proc)`)
                .join(' | ') +
            ' |',
    );
    lines.push('');
    const text = lines.join('\n');
    process.stdout.write(`${text}\n`);
    return text;
}

const chromeMatch = (command) =>
    command.includes('/opt/google/chrome/chrome') || command.includes('google-chrome');
const lightpandaMatch = (command) =>
    command.includes('/lightpanda') || command.includes('lightpanda serve');

async function main() {
    if (!process.env.APP_URL) {
        throw new Error('APP_URL is required. Copy tests/.env.dist to tests/.env.');
    }
    await mkdir(outDir, { recursive: true });

    const results = [];
    let lightpanda;

    if (only !== 'lightpanda') {
        process.stderr.write('\n=== Google Chrome ===\n');
        const run = await runPlaywright('chrome', { PLAYWRIGHT_CHANNEL: 'chrome', PLAYWRIGHT_CDP_ENDPOINT: '' }, chromeMatch);
        results.push({
            label: 'Chrome',
            ...run,
            report: await readReport(run.jsonPath).catch((error) => ({
                stats: {},
                errors: [{ message: `${error.message}\n${run.stderr.slice(-2000)}` }],
                rows: [],
            })),
        });
    }

    if (only !== 'chrome') {
        const externalEndpoint = process.env.PLAYWRIGHT_CDP_ENDPOINT;
        const endpoint = externalEndpoint || `ws://127.0.0.1:${lightpandaPort}`;
        if (!externalEndpoint) {
            process.stderr.write(`\n=== Starting Lightpanda (${lightpandaBin}) ===\n`);
            lightpanda = startLightpanda();
            await waitForPort(lightpandaPort, '127.0.0.1', 20_000);
        }
        process.stderr.write(`\n=== Lightpanda ${endpoint} ===\n`);
        const run = await runPlaywright(
            'lightpanda',
            { PLAYWRIGHT_CDP_ENDPOINT: endpoint, PLAYWRIGHT_CHANNEL: '' },
            lightpandaMatch,
        );
        results.push({
            label: 'Lightpanda',
            ...run,
            report: await readReport(run.jsonPath).catch((error) => ({
                stats: {},
                errors: [{ message: `${error.message}\n${run.stderr.slice(-2000)}` }],
                rows: [],
            })),
        });
    }

    if (lightpanda && !lightpanda.killed) {
        lightpanda.kill('SIGTERM');
    }

    const markdown = printComparison(results);
    await writeFile(path.join(outDir, 'summary.md'), markdown);
    const failed = results.some((result) => result.code !== 0);
    process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
});
