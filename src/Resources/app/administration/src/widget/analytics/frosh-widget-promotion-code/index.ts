import template from './frosh-widget-promotion-code.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    count: number;
}

function toStorageDate(date: Date): string {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
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
            criteria.addFilter(Criteria.not('OR', [Criteria.equals('promotionId', null)]));
            criteria.addFilter(
                Criteria.range('order.orderDate', { gte: toStorageDate(fromDate), lte: toStorageDate(toDate) }),
            );

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('order.salesChannelId', salesChannelId));
            }

            criteria.addAggregation(Criteria.terms('promotionCount', 'promotionId', 10, Criteria.sort('_count', 'DESC'), null));

            const result = await this.repositoryFactory.create('order_line_item').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.promotionCount?.buckets ?? []) as CountBucket[];

            const countById: Record<string, number> = {};
            buckets.forEach((bucket) => {
                if (bucket.key) {
                    countById[bucket.key] = bucket.count;
                }
            });

            const ids = Object.keys(countById);
            if (!ids.length) {
                return [];
            }

            const nameCriteria = new Criteria(1, ids.length);
            nameCriteria.setIds(ids);
            const promotions = await this.repositoryFactory.create('promotion').search(nameCriteria, Shopware.Context.api);

            return promotions
                .map((promotion: { id: string; translated?: { name?: string }; name?: string; code?: string }) => {
                    const label = promotion.code || promotion.translated?.name || promotion.name || promotion.id;
                    return {
                        id: promotion.id,
                        name: label,
                        value: countById[promotion.id] ?? 0,
                        formattedValue: new Intl.NumberFormat().format(countById[promotion.id] ?? 0),
                    };
                })
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
