// Import the Page/Locator types from the acceptance suite so they resolve to
// the same `playwright-core` copy the suite's `AdminPage` fixture uses
// (avoids "two playwright-core" type clashes).
import type { Page, Locator } from '@shopware-ag/acceptance-test-suite';

/**
 * Page object for the modular dashboard.
 *
 * Prefers role/name locators (`getByRole`) over CSS selectors: this exercises
 * the same accessibility tree a screen reader uses, so the tests double as an
 * a11y smoke check. Each widget is an `aria-labelledby` region (role "group")
 * whose name is its `<h2>` title; controls are named buttons. A couple of
 * structural anchors still use the plugin's BEM classes (grid container,
 * editing state) where no stable role exists.
 *
 * Labels assume the English admin locale.
 */
export class DashboardPage {
    readonly page: Page;
    readonly grid: Locator;
    readonly customizeButton: Locator;
    readonly doneButton: Locator;
    readonly addWidgetButton: Locator;
    readonly addWidgetModal: Locator;
    readonly widgets: Locator;

    constructor(page: Page) {
        this.page = page;
        this.grid = page.locator('.frosh-dashboard-grid');
        this.customizeButton = page.getByRole('button', { name: 'Customize' });
        this.doneButton = page.getByRole('button', { name: 'Done' });
        this.addWidgetButton = page.getByRole('button', { name: 'Add widget' });
        this.addWidgetModal = page.getByRole('dialog');
        // Every placed widget is a labelled region.
        this.widgets = page.getByRole('group');
    }

    async goto(): Promise<void> {
        // The suite's AdminPage is already authenticated and on the admin SPA;
        // build an absolute admin URL so we don't double the `/admin` segment.
        const adminUrl = new URL('admin', process.env.APP_URL).href;
        await this.page.goto(`${adminUrl}#/sw/dashboard/index`);
        await this.grid.waitFor({ state: 'visible', timeout: 30_000 });
        await this.widgets.first().waitFor({ state: 'visible', timeout: 30_000 });
    }

    private async isEditing(): Promise<boolean> {
        return this.grid.evaluate((el) => el.classList.contains('frosh-dashboard-grid--editing'));
    }

    async enterEditMode(): Promise<void> {
        if (!(await this.isEditing())) {
            await this.customizeButton.click();
            await this.page.locator('.frosh-dashboard-grid--editing').waitFor({ state: 'visible' });
        }
    }

    async leaveEditMode(): Promise<void> {
        if (await this.isEditing()) {
            await this.doneButton.click();
        }
    }

    async openAddWidgetModal(): Promise<void> {
        await this.enterEditMode();
        await this.addWidgetButton.click();
        await this.addWidgetModal.waitFor({ state: 'visible' });
    }

    /** A placed widget region, addressed by its accessible name (the heading). */
    widgetByLabel(label: string): Locator {
        return this.page.getByRole('group', { name: label });
    }

    /** A pickable widget button in the add-widget dialog, by its name. */
    pickerCard(label: string): Locator {
        return this.addWidgetModal.getByRole('button', { name: new RegExp(`^${label}`) });
    }

    async removeWidget(label: string): Promise<void> {
        await this.enterEditMode();
        await this.widgetByLabel(label).getByRole('button', { name: 'Remove' }).click();
    }
}
