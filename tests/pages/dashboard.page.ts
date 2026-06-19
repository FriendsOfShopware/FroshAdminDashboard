// Import the Page/Locator types from the acceptance suite so they resolve to
// the same `playwright-core` copy the suite's `AdminPage` fixture uses
// (avoids "two playwright-core" type clashes).
import type { Page, Locator } from '@shopware-ag/acceptance-test-suite';

/**
 * Page object for the modular dashboard. Selectors map to the plugin's own
 * BEM classes so the tests don't depend on snippet text (which is localized).
 */
export class DashboardPage {
    readonly page: Page;
    readonly grid: Locator;
    readonly customizeButton: Locator;
    readonly addWidgetButton: Locator;
    readonly addWidgetModal: Locator;
    readonly widgets: Locator;

    constructor(page: Page) {
        this.page = page;
        this.grid = page.locator('.frosh-dashboard-grid');
        // Toolbar has [Add widget] (edit mode only) + the customize/done toggle.
        this.customizeButton = page.locator('.frosh-dashboard-grid__toolbar-actions button').last();
        this.addWidgetButton = page.locator('.frosh-dashboard-grid__toolbar-actions button').first();
        this.addWidgetModal = page.locator('.frosh-dashboard-add-widget-modal');
        this.widgets = page.locator('.frosh-dashboard-widget');
    }

    async goto(): Promise<void> {
        // The suite's AdminPage is already authenticated and on the admin SPA;
        // build an absolute admin URL so we don't double the `/admin` segment.
        const adminUrl = new URL('admin', process.env.APP_URL).href;
        await this.page.goto(`${adminUrl}#/sw/dashboard/index`);
        await this.grid.waitFor({ state: 'visible', timeout: 30_000 });
        // Wait for the initial layout (or default) to render at least one widget.
        await this.widgets.first().waitFor({ state: 'visible', timeout: 30_000 });
    }

    /** Enter edit mode (idempotent-ish: only clicks when not already editing). */
    async enterEditMode(): Promise<void> {
        if (!(await this.grid.evaluate((el) => el.classList.contains('frosh-dashboard-grid--editing')))) {
            await this.customizeButton.click();
            await this.page.locator('.frosh-dashboard-grid--editing').waitFor({ state: 'visible' });
        }
    }

    async leaveEditMode(): Promise<void> {
        if (await this.grid.evaluate((el) => el.classList.contains('frosh-dashboard-grid--editing'))) {
            await this.customizeButton.click();
        }
    }

    async openAddWidgetModal(): Promise<void> {
        await this.enterEditMode();
        await this.addWidgetButton.click();
        await this.addWidgetModal.waitFor({ state: 'visible' });
    }

    /** A widget card by its (English) header label. */
    widgetByLabel(label: string): Locator {
        return this.page.locator('.frosh-dashboard-widget', {
            has: this.page.locator('.frosh-dashboard-widget__title', { hasText: label }),
        });
    }

    /** A pickable widget button in the add-widget modal, by its label. */
    pickerCard(label: string): Locator {
        return this.addWidgetModal.locator('.frosh-dashboard-add-widget-modal__card', { hasText: label });
    }

    async removeWidget(label: string): Promise<void> {
        await this.enterEditMode();
        const widget = this.widgetByLabel(label);
        await widget.locator('.frosh-dashboard-widget__control--danger').click();
    }
}
