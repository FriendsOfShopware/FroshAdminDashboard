import './frosh-dashboard-add-widget-modal.scss';
import template from './frosh-dashboard-add-widget-modal.html.twig';
import type { PropType } from 'vue';
import type { DashboardWidget, WidgetGroup } from '../../../../core/widget-registry';
import { widgetRegistry, FALLBACK_GROUP_ID } from '../../../../core/widget-registry';

interface WidgetGroupSection {
    group: WidgetGroup;
    widgets: DashboardWidget[];
}

/** Picker modal listing every registered widget that can still be added. */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['acl'],

    emits: ['add', 'close'],

    props: {
        widgets: {
            type: Array as PropType<DashboardWidget[]>,
            required: true,
        },
    },

    methods: {
        hasAccess(widget: DashboardWidget): boolean {
            return widgetRegistry.hasAccess(widget);
        },

        /** Tooltip text listing the privileges the user is missing. */
        missingPrivilegesTooltip(widget: DashboardWidget): string {
            const missing = widgetRegistry.missingPrivileges(widget);
            return this.$tc('frosh-admin-dashboard.addModal.missingPrivileges', { privileges: missing.join(', ') });
        },

        onSelect(widget: DashboardWidget): void {
            if (!this.hasAccess(widget)) {
                return;
            }
            this.$emit('add', widget.id);
        },
    },

    computed: {
        /** Available widgets bucketed by group, in group order, empty groups dropped. */
        groupedWidgets(): WidgetGroupSection[] {
            const byGroup = new Map<string, DashboardWidget[]>();

            this.widgets.forEach((widget) => {
                const groupId = widget.group && widgetRegistry.getGroup(widget.group) ? widget.group : FALLBACK_GROUP_ID;
                const bucket = byGroup.get(groupId) ?? [];
                bucket.push(widget);
                byGroup.set(groupId, bucket);
            });

            return widgetRegistry
                .getGroups()
                .filter((group) => byGroup.has(group.id))
                .map((group) => ({ group, widgets: byGroup.get(group.id) as DashboardWidget[] }));
        },
    },
});
