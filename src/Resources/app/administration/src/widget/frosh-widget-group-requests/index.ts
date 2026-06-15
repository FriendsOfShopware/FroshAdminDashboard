import './frosh-widget-group-requests.scss';
import template from './frosh-widget-group-requests.html.twig';
import type { PropType } from 'vue';

const { Criteria } = Shopware.Data;

interface GroupRequestsSettings {
    salesChannelId?: string | null;
    limit?: number;
}

/**
 * Lists customers who requested access to another customer group (B2B group
 * registration, `requestedGroupId`). Each row offers inline accept/decline
 * actions backed by the core `customerGroupRegistrationService`. Optionally
 * filtered to a single sales channel.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory', 'customerGroupRegistrationService', 'acl'],

    mixins: [Shopware.Mixin.getByName('notification')],

    props: {
        settings: {
            type: Object as PropType<GroupRequestsSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { customers: unknown[]; isLoading: boolean; processingIds: string[] } {
        return {
            customers: [],
            isLoading: true,
            processingIds: [],
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

            // Only customers with a pending group request.
            criteria.addFilter(Criteria.not('AND', [Criteria.equals('requestedGroupId', null)]));
            criteria.addSorting(Criteria.sort('createdAt', 'DESC'));
            criteria.addAssociation('requestedGroup');
            criteria.addAssociation('group');
            criteria.addAssociation('salesChannel');

            if (this.salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', this.salesChannelId));
            }

            return criteria;
        },

        columns(): Array<{ property: string; label: string }> {
            return [
                { property: 'firstName', label: this.$tc('sw-customer.list.columnName') },
                { property: 'group.name', label: this.$tc('frosh-admin-dashboard.widget.groupRequests.columnCurrentGroup') },
                { property: 'requestedGroup.name', label: this.$tc('frosh-admin-dashboard.widget.groupRequests.columnRequestedGroup') },
                { property: 'actions', label: '' },
            ];
        },
    },

    watch: {
        customerCriteria: {
            handler(): void {
                void this.loadRequests();
            },
            immediate: true,
        },
    },

    methods: {
        async loadRequests(): Promise<void> {
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

        isProcessing(customerId: string): boolean {
            return this.processingIds.includes(customerId);
        },

        async onAccept(customerId: string): Promise<void> {
            await this.handleDecision(customerId, 'accept');
        },

        async onDecline(customerId: string): Promise<void> {
            await this.handleDecision(customerId, 'decline');
        },

        async handleDecision(customerId: string, decision: 'accept' | 'decline'): Promise<void> {
            if (!this.acl.can('customer.editor') || this.isProcessing(customerId)) {
                return;
            }

            this.processingIds.push(customerId);
            try {
                if (decision === 'accept') {
                    await this.customerGroupRegistrationService.accept(customerId);
                } else {
                    await this.customerGroupRegistrationService.decline(customerId);
                }
                this.createNotificationSuccess({
                    message: this.$tc(`frosh-admin-dashboard.widget.groupRequests.${decision}Success`),
                });
                await this.loadRequests();
            } catch {
                this.createNotificationError({
                    message: this.$tc('frosh-admin-dashboard.widget.groupRequests.error'),
                });
            } finally {
                this.processingIds = this.processingIds.filter((id) => id !== customerId);
            }
        },
    },
});
