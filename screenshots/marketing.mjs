// Wraps the raw admin captures (src/Resources/store/_raw/img-*.png) into
// marketing-ready store images with a branded background + headline.
// Run from a dir where @playwright/test resolves (e.g. tests/acceptance):
//   node /path/to/screenshots/marketing.mjs
// Requires a Chrome started with --remote-debugging-port=9222.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STORE = process.env.STORE_DIR || resolve(SCRIPT_DIR, '../src/Resources/store');
const W = 1600;
const H = 1000;

// Captions per locale. Output files: en -> img-N.png, de -> img-de-N.png.
const SLIDE_SETS = {
    en: {
        prefix: 'img',
        slides: [
            {
                src: '_raw/img-0.png',
                eyebrow: 'MODULAR ADMIN DASHBOARD',
                title: 'Build the dashboard you actually need',
                subtitle: 'Drag & drop widgets into a layout that is saved per user.',
            },
            {
                src: '_raw/img-1.png',
                eyebrow: 'FULL CONTROL',
                title: 'Add, resize and rearrange in seconds',
                subtitle: 'An edit mode with per-widget settings — no code required.',
            },
            {
                src: '_raw/img-2.png',
                eyebrow: '20+ WIDGETS',
                title: 'A widget for every job',
                subtitle: 'Pick from analytics, operations and productivity — grouped and searchable.',
            },
            {
                src: '_raw/img-3.png',
                eyebrow: '12 ANALYTICS CHARTS',
                title: 'Your KPIs, right on the dashboard',
                subtitle: 'Sales, orders, customers and more — each with its own range & channel filter.',
            },
            {
                src: '_raw/img-4.png',
                eyebrow: 'GET THINGS DONE',
                title: 'Act without leaving the dashboard',
                subtitle: 'Approve reviews, handle B2B requests, keep notes and tasks in one place.',
            },
        ],
    },
    de: {
        prefix: 'img-de',
        slides: [
            {
                src: '_raw/img-de-0.png',
                eyebrow: 'MODULARES ADMIN-DASHBOARD',
                title: 'Baue das Dashboard, das du wirklich brauchst',
                subtitle: 'Widgets per Drag & Drop anordnen — die Anordnung wird pro Benutzer gespeichert.',
            },
            {
                src: '_raw/img-de-1.png',
                eyebrow: 'VOLLE KONTROLLE',
                title: 'Hinzufügen, skalieren und anordnen in Sekunden',
                subtitle: 'Ein Bearbeitungsmodus mit Widget-Einstellungen — ganz ohne Code.',
            },
            {
                src: '_raw/img-de-2.png',
                eyebrow: '20+ WIDGETS',
                title: 'Für jede Aufgabe das passende Widget',
                subtitle: 'Wähle aus Analyse, Betrieb und Produktivität — gruppiert und übersichtlich.',
            },
            {
                src: '_raw/img-de-3.png',
                eyebrow: '12 ANALYSE-DIAGRAMME',
                title: 'Deine Kennzahlen direkt im Dashboard',
                subtitle: 'Umsatz, Bestellungen, Kunden und mehr — je mit eigenem Zeitraum & Kanalfilter.',
            },
            {
                src: '_raw/img-de-4.png',
                eyebrow: 'DINGE ERLEDIGEN',
                title: 'Handeln, ohne das Dashboard zu verlassen',
                subtitle: 'Bewertungen freigeben, B2B-Anfragen bearbeiten, Notizen & Aufgaben an einem Ort.',
            },
        ],
    },
};

const dataUrl = (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`;

const html = (slide) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; }
  body {
    font-family:'Inter',-apple-system,system-ui,sans-serif;
    background: radial-gradient(1200px 700px at 80% -10%, #2f6bff 0%, #163e9e 55%, #0d2a6b 100%);
    color:#fff; overflow:hidden; position:relative;
  }
  .glow { position:absolute; inset:0;
    background: radial-gradient(700px 400px at 12% 8%, rgba(120,170,255,.35), transparent 60%); }
  .wrap { position:relative; height:100%; display:flex; flex-direction:column; padding:64px 72px 0; }
  .eyebrow { font-size:18px; font-weight:600; letter-spacing:.18em; color:#aecbff; margin-bottom:14px; }
  .title { font-size:50px; font-weight:800; line-height:1.05; max-width:1100px; letter-spacing:-.01em; }
  .subtitle { font-size:23px; font-weight:400; color:#d7e3ff; margin-top:16px; max-width:1000px; }
  .shot { margin-top:46px; align-self:center; width:1380px; border-radius:14px; overflow:hidden;
    box-shadow: 0 40px 90px rgba(3,16,48,.55), 0 0 0 1px rgba(255,255,255,.08); background:#fff; }
  .shot img { display:block; width:100%; height:auto; }
  .badge { position:absolute; right:64px; top:60px; display:flex; align-items:center; gap:12px;
    font-size:20px; font-weight:600; color:#eaf1ff; opacity:.9; }
  .badge .dot { width:30px;height:30px;border-radius:8px;
    background:linear-gradient(135deg,#7fc0ff,#2f6bff); display:inline-block; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="badge"><span class="dot"></span>Frosh Admin Dashboard</div>
  <div class="wrap">
    <div class="eyebrow">${slide.eyebrow}</div>
    <div class="title">${slide.title}</div>
    <div class="subtitle">${slide.subtitle}</div>
    <div class="shot"><img src="${dataUrl(join(STORE, slide.src))}"></div>
  </div>
</body></html>`;

const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://localhost:9222');
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();
await page.setViewportSize({ width: W, height: H });

// Optionally render a single locale via LOCALES=de; defaults to both.
const locales = (process.env.LOCALES || 'en,de').split(',').map((l) => l.trim());

for (const locale of locales) {
    const set = SLIDE_SETS[locale];
    if (!set) {
        continue;
    }

    for (let i = 0; i < set.slides.length; i += 1) {
        const slide = set.slides[i];
        const out = `${set.prefix}-${i}.png`;
        await page.setContent(html(slide), { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(STORE, out), clip: { x: 0, y: 0, width: W, height: H } });
        console.log('rendered', out);
    }
}

await page.close();
await browser.close().catch(() => {});
console.log('done');
