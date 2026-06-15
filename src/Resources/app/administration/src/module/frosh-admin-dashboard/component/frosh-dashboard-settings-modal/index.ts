import './frosh-dashboard-settings-modal.scss';
import template from './frosh-dashboard-settings-modal.html.twig';
import type { PropType } from 'vue';
import type { DashboardWidget } from '../../../../core/widget-registry';

/**
 * Generic, schema-driven settings modal. Renders one input per
 * `DashboardWidget.settings` entry, edits a local copy and emits the full
 * settings object on save so the grid can persist it.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    emits: ['save', 'close'],

    props: {
        definition: {
            type: Object as PropType<DashboardWidget>,
            required: true,
        },
        modelValue: {
            type: Object as PropType<Record<string, unknown>>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { draft: Record<string, unknown> } {
        return {
            // Work on a copy so a cancel discards changes.
            draft: { ...this.modelValue },
        };
    },

    computed: {
        title(): string {
            return this.$tc('frosh-admin-dashboard.settingsModal.title', { widget: this.$tc(this.definition.label) });
        },
    },

    methods: {
        valueOf(name: string): unknown {
            return this.draft[name];
        },

        updateValue(name: string, value: unknown): void {
            this.draft = { ...this.draft, [name]: value };
        },

        onSave(): void {
            this.$emit('save', this.draft);
        },
    },
});
