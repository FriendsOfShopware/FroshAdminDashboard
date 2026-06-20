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

        // The core sw-chart-card renders its range <select> only once data has
        // loaded, and the widget then labels it asynchronously (the runtime
        // workaround for the unlabelled core select). Wait until every rendered
        // select has its accessible name before scanning, otherwise axe can race
        // the labeling on slower (CI) machines and report a false select-name.
        await expect
            .poll(async () =>
                AdminPage.locator('.frosh-dashboard-grid select:not([aria-label]):not([aria-labelledby])').count(),
            )
            .toBe(0);

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
