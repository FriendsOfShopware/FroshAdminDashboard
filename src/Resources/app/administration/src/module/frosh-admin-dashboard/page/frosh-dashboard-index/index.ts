import './frosh-dashboard-index.scss';
import template from './frosh-dashboard-index.html.twig';

/** Config domain for this plugin (matches src/Resources/config/config.xml). */
const CONFIG_DOMAIN = 'FroshAdminDashboard.config';

/**
 * Page shell rendered for the dashboard route; hosts the widget grid and
 * optional core injection points (Services banner / extension sections).
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    data(): {
        showServicesBanner: boolean;
        showExtensionSections: boolean;
        configLoaded: boolean;
    } {
        return {
            // Defaults match config.xml so first paint is correct before the API returns.
            showServicesBanner: true,
            showExtensionSections: true,
            configLoaded: false,
        };
    },

    metaInfo(): { title: string } {
        return {
            title: this.$createTitle(),
        };
    },

    created(): void {
        void this.loadConfig();
    },

    methods: {
        async loadConfig(): Promise<void> {
            try {
                const systemConfigApiService = Shopware.Service('systemConfigApiService');
                const values = await systemConfigApiService.getValues(CONFIG_DOMAIN);

                // Shopware may return either flat keys ("FroshAdminDashboard.config.foo")
                // or short keys ("foo") depending on version / caller.
                this.showServicesBanner = this.readBool(values, 'showServicesBanner', true);
                this.showExtensionSections = this.readBool(values, 'showExtensionSections', true);
            } catch {
                // Keep defaults (show injections) if config cannot be loaded.
            } finally {
                this.configLoaded = true;
            }
        },

        readBool(
            values: Record<string, unknown> | null | undefined,
            shortKey: string,
            fallback: boolean,
        ): boolean {
            if (!values || typeof values !== 'object') {
                return fallback;
            }

            const fullKey = `${CONFIG_DOMAIN}.${shortKey}`;
            const raw = values[fullKey] !== undefined ? values[fullKey] : values[shortKey];

            if (raw === undefined || raw === null) {
                return fallback;
            }

            if (typeof raw === 'boolean') {
                return raw;
            }

            if (typeof raw === 'string') {
                return raw === '1' || raw.toLowerCase() === 'true';
            }

            if (typeof raw === 'number') {
                return raw === 1;
            }

            return fallback;
        },
    },
});
