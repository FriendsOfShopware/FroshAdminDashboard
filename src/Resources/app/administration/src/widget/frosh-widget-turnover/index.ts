import template from './frosh-widget-turnover.html.twig';

/**
 * Turnover-only statistics widget. Extends the core `sw-dashboard-statistics`
 * component to inherit all of its data fetching, ACL and range handling, and
 * overrides the template to render just today's turnover and the turnover
 * chart. Registered via `Component.extend` in `widget/index.ts`.
 */
export default {
    template,
};
