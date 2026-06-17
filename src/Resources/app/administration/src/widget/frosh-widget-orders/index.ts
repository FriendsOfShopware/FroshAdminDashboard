import template from './frosh-widget-orders.html.twig';

const { Criteria } = Shopware.Data;

/**
 * Orders-only statistics widget. Extends the core `sw-dashboard-statistics`
 * component to inherit all of its data fetching, ACL and range handling, and
 * overrides the template to render just today's orders and the order-count
 * chart. Registered via `Component.extend` in `widget/index.ts`.
 */
export default {
    template,

    methods: {
        fetchTodayData() {
            const criteria = new Criteria(1, 10);

            criteria.addAssociation('currency');
            criteria.addAssociation('orderCustomer');
            criteria.addAssociation('stateMachineState');

            criteria.addFilter(Criteria.equals('orderDate', this.formatDateToISO(new Date())));
            criteria.addSorting(Criteria.sort(this.todayOrderDataSortBy, this.todayOrderDataSortDirection));

            return this.orderRepository.search(criteria);
        },
    },
};
