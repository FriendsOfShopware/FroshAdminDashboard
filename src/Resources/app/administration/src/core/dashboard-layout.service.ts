/**
 * Reads and writes the per-user dashboard layout.
 *
 * The layout is stored in the existing `user_config` entity through the
 * `userConfigService` (REST endpoint `/_info/config-me`). Each user has a row
 * with the key below; the value is the JSON encoded list of placed widgets.
 */

import type { WidgetSize } from './widget-registry';

export const LAYOUT_CONFIG_KEY = 'frosh-admin-dashboard.layout';

export interface PlacedWidget {
    /** Instance id — unique per placement so a widget can appear multiple times. */
    uid: string;
    /** References DashboardWidget.id in the registry. */
    widgetId: string;
    /** Column span of the widget in the grid. */
    size: WidgetSize;
    /** Arbitrary, widget-owned persisted state (e.g. notes text). */
    settings: Record<string, unknown>;
}

interface UserConfigSearchResponse {
    data: Record<string, unknown>;
}

interface UserConfigServiceLike {
    search(keys: string[]): Promise<UserConfigSearchResponse>;
    upsert(data: Record<string, unknown>): Promise<void>;
}

export default class DashboardLayoutService {
    private readonly userConfigService: UserConfigServiceLike;

    constructor(userConfigService: UserConfigServiceLike) {
        this.userConfigService = userConfigService;
    }

    async load(): Promise<PlacedWidget[] | null> {
        const response = await this.userConfigService.search([LAYOUT_CONFIG_KEY]);
        const value = response?.data?.[LAYOUT_CONFIG_KEY];

        if (!Array.isArray(value)) {
            // No layout stored yet — caller falls back to the default layout.
            return null;
        }

        return value
            .filter((entry): entry is PlacedWidget => {
                return Boolean(entry) && typeof entry === 'object' && typeof (entry as PlacedWidget).widgetId === 'string';
            })
            .map((entry) => ({
                uid: entry.uid,
                widgetId: entry.widgetId,
                size: entry.size ?? 'medium',
                settings: entry.settings ?? {},
            }));
    }

    async save(layout: PlacedWidget[]): Promise<void> {
        // The endpoint expects { key: value }; the value itself is the array.
        await this.userConfigService.upsert({
            [LAYOUT_CONFIG_KEY]: layout,
        });
    }
}
