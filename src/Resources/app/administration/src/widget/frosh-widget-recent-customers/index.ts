import './frosh-widget-recent-customers.scss';
import template from './frosh-widget-recent-customers.html.twig';
import type { PropType } from 'vue';

const { Criteria } = Shopware.Data;

interface RecentCustomersSettings {
    salesChannelId?: string | null;
    limit?: number;
}

/**
 * Shows the most recently registered customers (default 10), optionally
 * filtered to a single sales channel via the widget settings. Columns mirror
 * the core customer list: name, customer number, email, sales channel and
 * registration date.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory', 'acl'],

    props: {
        settings: {
            type: Object as PropType<RecentCustomersSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { customers: unknown[]; isLoading: boolean } {
        return {
            customers: [],
            isLoading: true,
        };
    },

    computed: {
        customerRepository() {
            return this.repositoryFactory.create('customer');
        },

        limit(): number {
            return this.settings.limit ?? 10;
        },

        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        customerCriteria() {
            const criteria = new Criteria(1, this.limit);

            criteria.addSorting(Criteria.sort('createdAt', 'DESC'));
            criteria.addAssociation('salesChannel');
            criteria.addAssociation('group');

            if (this.salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', this.salesChannelId));
            }

            return criteria;
        },

        columns(): Array<{ property: string; label: string }> {
            return [
                { property: 'firstName', label: this.$tc('sw-customer.list.columnName') },
                { property: 'customerNumber', label: this.$tc('sw-customer.list.columnCustomerNumber') },
                { property: 'email', label: this.$tc('sw-customer.list.columnEmail') },
                { property: 'salesChannel.name', label: this.$tc('frosh-admin-dashboard.widget.recentCustomers.columnSalesChannel') },
                { property: 'createdAt', label: this.$tc('sw-customer.list.columnCreatedAt') },
            ];
        },
    },

    watch: {
        // Load initially and reload when the configured sales channel or limit
        // changes (the criteria is recomputed into a new object each time).
        customerCriteria: {
            handler(): void {
                void this.loadCustomers();
            },
            immediate: true,
        },
    },

    methods: {
        async loadCustomers(): Promise<void> {
            if (!this.acl.can('customer.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            try {
                this.customers = await this.customerRepository.search(this.customerCriteria, Shopware.Context.api);
            } finally {
                this.isLoading = false;
            }
        },
    },
});
