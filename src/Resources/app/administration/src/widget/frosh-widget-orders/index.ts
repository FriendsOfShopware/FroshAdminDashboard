import template from './frosh-widget-orders.html.twig';

/**
 * Orders-only statistics widget. Extends the core `sw-dashboard-statistics`
 * component to inherit all of its data fetching, ACL and range handling, and
 * overrides the template to render just today's orders and the order-count
 * chart. Registered via `Component.extend` in `widget/index.ts`.
 */
export default {
    template,
};
