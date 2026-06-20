import { test, expect } from '@shopware-ag/acceptance-test-suite';
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
        // Number of orders). Their core sw-chart-card range <select> appears only
        // once data has loaded, and the widget then labels it asynchronously
        // (the runtime workaround for the unlabelled core select). Wait until both
        // selects exist AND are labelled before scanning — checking only
        // "no unlabelled selects" would pass while none have rendered yet and let
        // axe race the labelling on slower (CI) machines (false select-name).
        const labelledSelects = AdminPage.locator(
            '.frosh-dashboard-grid select[aria-label]:not([aria-label=""]), .frosh-dashboard-grid select[aria-labelledby]',
        );
        await expect.poll(async () => labelledSelects.count(), { timeout: 30_000 }).toBe(2);

        const results = await new AxeBuilder({ page: AdminPage })
            .include('.frosh-dashboard-grid')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        const blocking = results.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
        );

        const summary = blocking
            .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
            .join('\n');

        expect(blocking, `axe violations:\n${summary}`).toHaveLength(0);
    });
});
