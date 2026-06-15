import './frosh-dashboard-widget.scss';
import template from './frosh-dashboard-widget.html.twig';
import type { PropType } from 'vue';
import type { PlacedWidget } from '../../../../core/dashboard-layout.service';
import type { DashboardWidget, WidgetSize } from '../../../../core/widget-registry';
import { ALL_SIZES, widgetRegistry } from '../../../../core/widget-registry';

const SIZE_LABELS: Record<WidgetSize, string> = {
    small: 'frosh-admin-dashboard.size.small',
    medium: 'frosh-admin-dashboard.size.medium',
    large: 'frosh-admin-dashboard.size.large',
    full: 'frosh-admin-dashboard.size.full',
};

/**
 * Renders the chrome (header, drag handle, controls) around a single placed
 * widget and mounts the registered widget component as its body. Settings
 * changes from the body are bubbled up so the grid can persist them.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    emits: ['remove', 'resize', 'configure', 'update-settings'],

    props: {
        placed: {
            type: Object as PropType<PlacedWidget>,
            required: true,
        },
        definition: {
            type: Object as PropType<DashboardWidget | undefined>,
            required: false,
            default: undefined,
        },
        editing: {
            type: Boolean,
            required: false,
            default: false,
        },
    },

    computed: {
        isKnown(): boolean {
            return Boolean(this.definition);
        },

        label(): string {
            return this.definition ? this.$tc(this.definition.label) : this.placed.widgetId;
        },

        /** Sizes this widget opted into (registry already defaults to all). */
        supportedSizes(): WidgetSize[] {
            return this.definition?.supportedSizes ?? [...ALL_SIZES];
        },

        /** Only offer a size picker when there is more than one choice. */
        canResize(): boolean {
            return this.supportedSizes.length > 1;
        },

        /** Show the gear only when the widget declares a settings schema. */
        hasSettings(): boolean {
            return Boolean(this.definition?.settings?.length);
        },

        /** False when the user lacks an ACL privilege the widget requires. */
        hasAccess(): boolean {
            return this.definition ? widgetRegistry.hasAccess(this.definition) : true;
        },

        missingPrivileges(): string[] {
            return this.definition ? widgetRegistry.missingPrivileges(this.definition) : [];
        },
    },

    methods: {
        sizeLabel(size: WidgetSize): string {
            return this.$tc(SIZE_LABELS[size]);
        },

        onSettingsUpdate(settings: Record<string, unknown>): void {
            this.$emit('update-settings', settings);
        },
    },
});
