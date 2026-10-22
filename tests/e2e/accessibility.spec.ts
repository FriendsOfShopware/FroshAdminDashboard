import { test, expect } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * Accessibility smoke check for the dashboard, using axe-core (WCAG 2 A/AA).
 * Scoped to the plugin's grid so core-admin issues outside our control don't
 * fail the suite. Fails on any serious/critical violation in our markup.
 */
test.describe('Frosh Admin Dashboard — accessibility', () => {
    test('dashboard grid has no serious or critical axe violations', async ({ AdminPage }) => {
        const dashboard = new DashboardPage(AdminPage);
        await dashboard.goto();

        // The default dashboard renders two time-series widgets (Total sales,
        // Number of orders). Their core sw-chart-card range picker appears only
        // once data has loaded, and the widget then labels it asynchronously
        // (the runtime workaround for the unlabelled core picker). Wait until both
        // pickers exist AND are labelled before scanning — checking only
        // "no unlabelled fields" would pass while none have rendered yet and let
        // axe race the labelling on slower (CI) machines (false select-name/label).
        // The picker is a native <select> up to Shopware 6.7.13 and an mt-select
        // text input from 6.7.14 on, so match both markups.
        const labelledRangePickers = AdminPage.locator(
            '.frosh-dashboard-grid select[aria-label]:not([aria-label=""]), ' +
                '.frosh-dashboard-grid select[aria-labelledby], ' +
                '.frosh-dashboard-grid .mt-select-selection-list__input[aria-label]:not([aria-label=""])',
        );
        await expect.poll(async () => labelledRangePickers.count(), { timeout: 30_000 }).toBe(2);

        const axe = new AxeBuilder({ page: AdminPage })
            .include('.frosh-dashboard-grid')
            .withTags(['wcag2a', 'wcag2aa']);
        // axe's default finishRun opens a second blank page. Lightpanda rejects
        // that with TargetAlreadyLoaded (one page per context), so stay in the
        // page under test. Same-origin grid only; cross-origin frames are out of
        // scope for this scan either way.
        if (process.env.PLAYWRIGHT_CDP_ENDPOINT) {
            axe.setLegacyMode(true);
        }
        const results = await axe.analyze();

        const blocking = results.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
        );

        const summary = blocking
            .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
            .join('\n');

        expect(blocking, `axe violations:\n${summary}`).toHaveLength(0);
    });
});
