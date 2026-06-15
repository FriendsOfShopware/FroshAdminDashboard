/**
 * Central registry for dashboard widgets.
 *
 * A widget is a self-contained, registrable unit that renders inside the
 * modular dashboard grid. Widgets are registered by id and can be added,
 * removed and re-ordered by the user. Because the registry is a plain
 * singleton attached to the Shopware namespace, *other* plugins can register
 * their own widgets too:
 *
 *   Shopware.FroshDashboard.registerWidget({
 *       id: 'my-plugin-widget',
 *       label: 'my-plugin.dashboard.widget.label',
 *       icon: 'regular-chart-bar',
 *       component: 'my-plugin-widget',
 *       defaultSize: 'medium',
 *       supportedSizes: ['medium', 'large'],
 *       settings: [
 *           { name: 'title', type: 'text', label: 'my-plugin.dashboard.widget.titleLabel', default: '' },
 *       ],
 *   });
 */

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export const ALL_SIZES: WidgetSize[] = ['small', 'medium', 'large', 'full'];

export type WidgetSettingType = 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'colorpicker' | 'entity';

export interface WidgetSettingOption {
    /** Stored value. */
    value: string | number;
    /** Snippet key (or literal) for the human readable label. */
    label: string;
}

/**
 * Declarative description of a single configurable field of a widget. The grid
 * renders a generic settings modal from these definitions, so a widget gets a
 * config UI for free without building its own form.
 */
export interface WidgetSetting {
    /** Key inside the placement's `settings` object. */
    name: string;
    /** Input type the generic settings modal renders. */
    type: WidgetSettingType;
    /** Snippet key for the field label. */
    label: string;
    /** Optional snippet key for a helper text. */
    helpText?: string;
    /** Default value applied when the widget is first placed. */
    default?: unknown;
    /** Options for `select` fields. */
    options?: WidgetSettingOption[];
    /** Entity name for `entity` fields (e.g. `sales_channel`). */
    entity?: string;
}

export interface DashboardWidget {
    /** Stable, unique identifier. Persisted in the user config. */
    id: string;
    /** Snippet key for the human readable label shown in the picker. */
    label: string;
    /** Meteor icon name shown in the picker and widget header. */
    icon: string;
    /** Registered admin component name to render as the widget body. */
    component: string;
    /** Default column span when the widget is first added. */
    defaultSize?: WidgetSize;
    /**
     * Column spans the widget opts into. The resize picker only offers these.
     * Defaults to all sizes when omitted.
     */
    supportedSizes?: WidgetSize[];
    /** Optional snippet key with a short description for the picker. */
    description?: string;
    /** When true the widget may only be placed once. Defaults to false. */
    unique?: boolean;
    /**
     * Declarative settings schema. When present (and non-empty) the widget gets
     * a gear icon that opens the generic settings modal.
     */
    settings?: WidgetSetting[];
    /**
     * Id of the group the widget is listed under in the "Add widget" picker.
     * References a group registered via `registerGroup`. Unknown or omitted
     * groups fall back to the built-in `other` group.
     */
    group?: string;
    /**
     * ACL privileges the user needs to use this widget (e.g. `order.viewer`).
     * Widgets the user lacks access to are shown greyed-out in the picker and
     * render a "missing permission" notice instead of their body.
     */
    acl?: string[];
}

export interface WidgetGroup {
    /** Stable, unique identifier referenced by `DashboardWidget.group`. */
    id: string;
    /** Snippet key for the group heading shown in the picker. */
    label: string;
    /** Lower numbers sort first. Defaults to 100. */
    position?: number;
}

/** Built-in group every uncategorised widget falls back to. */
export const FALLBACK_GROUP_ID = 'other';

class WidgetRegistry {
    private readonly widgets: Map<string, DashboardWidget> = new Map();

    private readonly groups: Map<string, WidgetGroup> = new Map([
        [FALLBACK_GROUP_ID, { id: FALLBACK_GROUP_ID, label: 'frosh-admin-dashboard.group.other', position: 1000 }],
    ]);

    registerGroup(group: WidgetGroup): void {
        if (!group.id) {
            throw new Error('[FroshAdminDashboard] A widget group needs an "id".');
        }

        this.groups.set(group.id, { position: 100, ...group });
    }

    getGroup(id: string): WidgetGroup | undefined {
        return this.groups.get(id);
    }

    /** Groups ordered by position, then label. */
    getGroups(): WidgetGroup[] {
        return [...this.groups.values()].sort((a, b) => (a.position ?? 100) - (b.position ?? 100));
    }

    registerWidget(widget: DashboardWidget): void {
        if (!widget.id || !widget.component) {
            throw new Error('[FroshAdminDashboard] A widget needs at least an "id" and a "component".');
        }

        if (this.widgets.has(widget.id)) {
            // Last registration wins so plugins can override built-in widgets.
            console.warn(`[FroshAdminDashboard] Widget "${widget.id}" is already registered and will be overridden.`);
        }

        const supportedSizes = widget.supportedSizes?.length ? widget.supportedSizes : [...ALL_SIZES];
        // Keep the default size valid: fall back to the first supported size.
        const defaultSize =
            widget.defaultSize && supportedSizes.includes(widget.defaultSize) ? widget.defaultSize : supportedSizes[0];

        this.widgets.set(widget.id, {
            unique: false,
            ...widget,
            supportedSizes,
            defaultSize,
        });
    }

    getWidget(id: string): DashboardWidget | undefined {
        return this.widgets.get(id);
    }

    getWidgets(): DashboardWidget[] {
        return [...this.widgets.values()];
    }

    hasWidget(id: string): boolean {
        return this.widgets.has(id);
    }

    /** Privileges the current user is missing for the widget (empty = full access). */
    missingPrivileges(widget: DashboardWidget): string[] {
        if (!widget.acl?.length) {
            return [];
        }

        const acl = Shopware.Service('acl') as { can: (privilege: string) => boolean };
        return widget.acl.filter((privilege) => !acl.can(privilege));
    }

    /** Whether the current user may use the widget. */
    hasAccess(widget: DashboardWidget): boolean {
        return this.missingPrivileges(widget).length === 0;
    }
}

export const widgetRegistry = new WidgetRegistry();

export default widgetRegistry;
