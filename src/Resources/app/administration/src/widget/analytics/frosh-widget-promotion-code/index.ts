import template from './frosh-widget-promotion-code.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';
import { toStorageDateTime } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    count: number;
}

/** Most-used promotion codes by order count. */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory'],

    props: {
        settings: {
            type: Object as PropType<{ salesChannelId?: string | null }>,
            required: false,
            default: () => ({}),
        },
    },

    methods: {
        async fetchPromotionCodes(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = new Criteria(1, 1);
            criteria.setTotalCountMode(0);
            criteria.addFilter(Criteria.equals('type', 'promotion'));
            criteria.addFilter(Criteria.not('AND', [Criteria.equals('payload.code', null)]));
            criteria.addFilter(
                Criteria.range('order.orderDateTime', { gte: toStorageDateTime(fromDate), lte: toStorageDateTime(toDate) }),
            );

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('order.salesChannelId', salesChannelId));
            }

            criteria.addAggregation(Criteria.terms('promotionCodes', 'payload.code', 10, Criteria.sort('_count', 'DESC'), null));

            const result = await this.repositoryFactory.create('order_line_item').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.promotionCodes?.buckets ?? []) as CountBucket[];

            return buckets
                .filter((bucket) => Boolean(bucket.key))
                .map((bucket) => ({
                    id: bucket.key,
                    name: bucket.key,
                    value: bucket.count,
                    formattedValue: new Intl.NumberFormat().format(bucket.count),
                }))
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
