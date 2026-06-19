import { test, expect } from '@shopware-ag/acceptance-test-suite';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * Smoke + placement coverage for the modular dashboard.
 *
 * Uses the official Shopware acceptance suite, which provides an already
 * logged-in `AdminPage`. Selectors come from the plugin's own BEM classes;
 * widget labels assume the English admin locale.
 */
test.describe('Frosh Admin Dashboard', () => {
    test('replaces the dashboard with the modular grid and renders widgets', async ({ AdminPage }) => {
        const consoleErrors: string[] = [];
        AdminPage.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        const dashboard = new DashboardPage(AdminPage);
        await dashboard.goto();

        // The modular grid replaced the core dashboard.
        await expect(dashboard.grid).toBeVisible();
        // At least the default-layout widgets are present.
        expect(await dashboard.widgets.count()).toBeGreaterThan(0);
        await expect(dashboard.customizeButton).toBeVisible();

        expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toHaveLength(0);
    });

    test('edit mode exposes the toolbar and the add-widget picker', async ({ AdminPage }) => {
        const dashboard = new DashboardPage(AdminPage);
        await dashboard.goto();

        await dashboard.enterEditMode();
        await expect(AdminPage.locator('.frosh-dashboard-grid--editing')).toBeVisible();
        await expect(dashboard.addWidgetButton).toBeVisible();

        await dashboard.openAddWidgetModal();
        await expect(dashboard.addWidgetModal).toBeVisible();
        // The picker groups widgets (analytics, productivity, …).
        await expect(dashboard.addWidgetModal.locator('.frosh-dashboard-add-widget-modal__card').first()).toBeVisible();
    });

    // A widget not seeded into the first-run default layout, so it is always
    // available in the picker.
    const ADDABLE_LABEL = 'Recent orders';

    test('adding a widget places it and the layout persists across reload', async ({ AdminPage }) => {
        const dashboard = new DashboardPage(AdminPage);
        await dashboard.goto();

        // Make sure it is not already on the board from a previous run.
        if ((await dashboard.widgetByLabel(ADDABLE_LABEL).count()) > 0) {
            await dashboard.removeWidget(ADDABLE_LABEL);
            await dashboard.leaveEditMode();
            await expect(dashboard.widgetByLabel(ADDABLE_LABEL)).toHaveCount(0);
        }

        await dashboard.openAddWidgetModal();
        await dashboard.pickerCard(ADDABLE_LABEL).first().click();

        await expect(dashboard.addWidgetModal).toBeHidden();
        await expect(dashboard.widgetByLabel(ADDABLE_LABEL)).toBeVisible();

        // Reload — the layout is persisted per user in user_config.
        await dashboard.goto();
        await expect(dashboard.widgetByLabel(ADDABLE_LABEL)).toBeVisible();
    });

    test('removing a widget takes it off the board', async ({ AdminPage }) => {
        const dashboard = new DashboardPage(AdminPage);
        await dashboard.goto();

        // Ensure the widget is present first.
        if ((await dashboard.widgetByLabel(ADDABLE_LABEL).count()) === 0) {
            await dashboard.openAddWidgetModal();
            await dashboard.pickerCard(ADDABLE_LABEL).first().click();
            await expect(dashboard.widgetByLabel(ADDABLE_LABEL)).toBeVisible();
        }

        await dashboard.removeWidget(ADDABLE_LABEL);
        await expect(dashboard.widgetByLabel(ADDABLE_LABEL)).toHaveCount(0);
    });
});
