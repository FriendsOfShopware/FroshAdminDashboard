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
