import './frosh-widget-pending-reviews.scss';
import template from './frosh-widget-pending-reviews.html.twig';
import type { PropType } from 'vue';

const { Criteria } = Shopware.Data;

interface PendingReviewsSettings {
    salesChannelId?: string | null;
    limit?: number;
}

interface ReviewItem {
    id: string;
    title?: string;
    points?: number;
    status?: boolean;
}

/**
 * Lists product reviews that are not yet approved (`status = false`). Each row
 * offers an inline approve action (sets `status = true` and saves) and a
 * decline action which deletes the review after a confirmation modal.
 * Optionally filtered to a single sales channel.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory', 'acl'],

    mixins: [Shopware.Mixin.getByName('notification')],

    props: {
        settings: {
            type: Object as PropType<PendingReviewsSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): {
        reviews: ReviewItem[];
        isLoading: boolean;
        processingIds: string[];
        reviewToDelete: ReviewItem | null;
        } {
        return {
            reviews: [],
            isLoading: true,
            processingIds: [],
            reviewToDelete: null,
        };
    },

    computed: {
        reviewRepository() {
            return this.repositoryFactory.create('product_review');
        },

        limit(): number {
            return this.settings.limit ?? 10;
        },

        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        reviewCriteria() {
            const criteria = new Criteria(1, this.limit);

            // Only reviews awaiting approval.
            criteria.addFilter(Criteria.equals('status', false));
            criteria.addSorting(Criteria.sort('createdAt', 'DESC'));
            criteria.addAssociation('customer');
            criteria.addAssociation('product');
            criteria.addAssociation('salesChannel');

            if (this.salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', this.salesChannelId));
            }

            return criteria;
        },

        columns(): Array<{ property: string; label: string }> {
            return [
                { property: 'title', label: this.$tc('sw-review.list.columnTitle') },
                { property: 'points', label: this.$tc('sw-review.list.columnPoints') },
                { property: 'product', label: this.$tc('sw-review.list.columnProduct') },
                { property: 'user', label: this.$tc('sw-review.list.columnUser') },
                { property: 'actions', label: '' },
            ];
        },
    },

    watch: {
        reviewCriteria: {
            handler(): void {
                void this.loadReviews();
            },
            immediate: true,
        },
    },

    methods: {
        async loadReviews(): Promise<void> {
            if (!this.acl.can('review.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            try {
                this.reviews = await this.reviewRepository.search(this.reviewCriteria, Shopware.Context.api);
            } finally {
                this.isLoading = false;
            }
        },

        isProcessing(reviewId: string): boolean {
            return this.processingIds.includes(reviewId);
        },

        async onApprove(review: ReviewItem): Promise<void> {
            if (!this.acl.can('review.editor') || this.isProcessing(review.id)) {
                return;
            }

            this.processingIds.push(review.id);
            try {
                review.status = true;
                await this.reviewRepository.save(review, Shopware.Context.api);
                this.createNotificationSuccess({
                    message: this.$tc('frosh-admin-dashboard.widget.pendingReviews.approveSuccess'),
                });
                await this.loadReviews();
            } catch {
                review.status = false;
                this.createNotificationError({
                    message: this.$tc('frosh-admin-dashboard.widget.pendingReviews.error'),
                });
            } finally {
                this.processingIds = this.processingIds.filter((id) => id !== review.id);
            }
        },

        onDeclineRequest(review: ReviewItem): void {
            if (!this.acl.can('review.deleter')) {
                return;
            }
            this.reviewToDelete = review;
        },

        onDeclineCancel(): void {
            this.reviewToDelete = null;
        },

        async onDeclineConfirm(): Promise<void> {
            const review = this.reviewToDelete;
            if (!review || !this.acl.can('review.deleter')) {
                return;
            }

            this.processingIds.push(review.id);
            try {
                await this.reviewRepository.delete(review.id, Shopware.Context.api);
                this.createNotificationSuccess({
                    message: this.$tc('frosh-admin-dashboard.widget.pendingReviews.declineSuccess'),
                });
                await this.loadReviews();
            } catch {
                this.createNotificationError({
                    message: this.$tc('frosh-admin-dashboard.widget.pendingReviews.error'),
                });
            } finally {
                this.processingIds = this.processingIds.filter((id) => id !== review.id);
                this.reviewToDelete = null;
            }
        },
    },
});
