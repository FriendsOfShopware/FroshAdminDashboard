import './frosh-widget-notes.scss';
import template from './frosh-widget-notes.html.twig';
import type { PropType } from 'vue';

/**
 * A free-text notepad. Persists its content into the placement's `settings`
 * via the `update-settings` event, debounced so we don't hit the API on every
 * keystroke.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    emits: ['update-settings'],

    props: {
        settings: {
            type: Object as PropType<{ text?: string; accent?: string }>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { text: string; debounce: number | null } {
        return {
            text: this.settings.text ?? '',
            debounce: null,
        };
    },

    computed: {
        accent(): string {
            return this.settings.accent || '#fbd34d';
        },
    },

    beforeUnmount() {
        this.flushPendingSave();
    },

    methods: {
        flushPendingSave(): void {
            if (this.debounce === null) {
                return;
            }

            window.clearTimeout(this.debounce);
            this.debounce = null;
            this.$emit('update-settings', { text: this.text });
        },

        onInput(): void {
            if (this.debounce !== null) {
                window.clearTimeout(this.debounce);
            }

            this.debounce = window.setTimeout(() => {
                this.debounce = null;
                this.$emit('update-settings', { text: this.text });
            }, 600);
        },
    },
});
