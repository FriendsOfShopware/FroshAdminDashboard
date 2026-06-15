import './frosh-widget-recent-orders.scss';
import template from './frosh-widget-recent-orders.html.twig';
import type { PropType } from 'vue';

const { Criteria } = Shopware.Data;

interface RecentOrdersSettings {
    salesChannelId?: string | null;
    limit?: number;
}

/**
 * Shows the most recent orders (default 10), optionally filtered to a single
 * sales channel via the widget settings. Columns mirror the core order list:
 * order number, customer, amount, order state and date.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory', 'stateStyleDataProviderService', 'acl'],

    props: {
        settings: {
            type: Object as PropType<RecentOrdersSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { orders: unknown[]; isLoading: boolean } {
        return {
            orders: [],
            isLoading: true,
        };
    },

    computed: {
        currencyFilter() {
            return Shopware.Filter.getByName('currency');
        },

        orderRepository() {
            return this.repositoryFactory.create('order');
        },

        limit(): number {
            return this.settings.limit ?? 10;
        },

        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        orderCriteria() {
            const criteria = new Criteria(1, this.limit);

            criteria.addSorting(Criteria.sort('orderDateTime', 'DESC'));
            criteria.addAssociation('orderCustomer');
            criteria.addAssociation('currency');
            criteria.addAssociation('stateMachineState');
            criteria.addAssociation('salesChannel');

            if (this.salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', this.salesChannelId));
            }

            return criteria;
        },

        columns(): Array<{ property: string; label: string; allowResize?: boolean }> {
            return [
                { property: 'orderNumber', label: this.$tc('sw-order.list.columnOrderNumber') },
                { property: 'orderCustomer.firstName', label: this.$tc('sw-order.list.columnCustomerName') },
                { property: 'amountTotal', label: this.$tc('sw-order.list.columnAmount') },
                { property: 'stateMachineState.name', label: this.$tc('sw-order.list.columnState') },
                { property: 'orderDateTime', label: this.$tc('sw-order.list.orderDate') },
            ];
        },
    },

    watch: {
        // Load initially and reload when the configured sales channel or limit
        // changes (the criteria is recomputed into a new object each time).
        orderCriteria: {
            handler(): void {
                void this.loadOrders();
            },
            immediate: true,
        },
    },

    methods: {
        async loadOrders(): Promise<void> {
            if (!this.acl.can('order.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            try {
                this.orders = await this.orderRepository.search(this.orderCriteria, Shopware.Context.api);
            } finally {
                this.isLoading = false;
            }
        },

        getVariantFromOrderState(order: { stateMachineState?: { technicalName?: string } }): string {
            return this.stateStyleDataProviderService.getStyle('order.state', order.stateMachineState?.technicalName)
                .colorCode;
        },
    },
});
