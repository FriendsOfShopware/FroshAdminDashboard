import template from './frosh-widget-statistics.html.twig';

/**
 * Reuses the core `sw-dashboard-statistics` component (today's orders and the
 * turnover/order-count charts) so the modular dashboard keeps the original
 * statistics functionality without re-implementing it.
 */
export default Shopware.Component.wrapComponentConfig({
    template,
});
