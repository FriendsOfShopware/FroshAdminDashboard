import template from './frosh-widget-best-selling-product.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';
import { toStorageDateTime } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface SumBucket {
    key: string;
    quantitySum?: { sum: number };
}

/** Best-selling products by sold quantity. */
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
        async fetchBestSellers(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = new Criteria(1, 1);
            criteria.setTotalCountMode(0);
            criteria.addFilter(Criteria.equals('type', 'product'));
            criteria.addFilter(Criteria.not('AND', [Criteria.equals('productId', null)]));
            criteria.addFilter(
                Criteria.range('order.orderDateTime', { gte: toStorageDateTime(fromDate), lte: toStorageDateTime(toDate) }),
            );

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('order.salesChannelId', salesChannelId));
            }

            criteria.addAggregation(
                Criteria.terms('products', 'productId', null, null, Criteria.sum('quantitySum', 'quantity')),
            );

            const result = await this.repositoryFactory.create('order_line_item').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.products?.buckets ?? []) as SumBucket[];

            const qtyById: Record<string, number> = {};
            buckets.forEach((bucket) => {
                if (bucket.key) {
                    qtyById[bucket.key] = bucket.quantitySum?.sum ?? 0;
                }
            });

            const ids = Object.entries(qtyById)
                .sort(([, left], [, right]) => right - left)
                .slice(0, 10)
                .map(([id]) => id);

            if (!ids.length) {
                return [];
            }

            const nameCriteria = new Criteria(1, ids.length);
            nameCriteria.setIds(ids);
            const products = await this.repositoryFactory
                .create('product')
                .search(nameCriteria, { ...Shopware.Context.api, inheritance: true });

            return products
                .map((product: { id: string; translated?: { name?: string }; name?: string }) => ({
                    id: product.id,
                    name: product.translated?.name ?? product.name ?? product.id,
                    value: qtyById[product.id] ?? 0,
                    formattedValue: new Intl.NumberFormat().format(qtyById[product.id] ?? 0),
                }))
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
