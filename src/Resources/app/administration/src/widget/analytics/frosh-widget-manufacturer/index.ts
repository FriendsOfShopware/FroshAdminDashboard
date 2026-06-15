import template from './frosh-widget-manufacturer.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';

const { Criteria } = Shopware.Data;

interface SumBucket {
    key: string;
    quantitySum?: { sum: number };
}

function toStorageDate(date: Date): string {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

/** Sold quantity per manufacturer. */
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
        async fetchManufacturers(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = new Criteria(1, 1);
            criteria.setTotalCountMode(0);
            criteria.addFilter(Criteria.equals('type', 'product'));
            criteria.addFilter(Criteria.not('AND', [Criteria.equals('product.manufacturerId', null)]));
            criteria.addFilter(
                Criteria.range('order.orderDate', { gte: toStorageDate(fromDate), lte: toStorageDate(toDate) }),
            );

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('order.salesChannelId', salesChannelId));
            }

            criteria.addAggregation(
                Criteria.terms(
                    'manufacturers',
                    'product.manufacturerId',
                    10,
                    Criteria.sort('quantitySum', 'DESC'),
                    Criteria.sum('quantitySum', 'quantity'),
                ),
            );

            const result = await this.repositoryFactory.create('order_line_item').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.manufacturers?.buckets ?? []) as SumBucket[];

            const qtyById: Record<string, number> = {};
            buckets.forEach((bucket) => {
                if (bucket.key) {
                    qtyById[bucket.key] = bucket.quantitySum?.sum ?? 0;
                }
            });

            const ids = Object.keys(qtyById);
            if (!ids.length) {
                return [];
            }

            const nameCriteria = new Criteria(1, ids.length);
            nameCriteria.setIds(ids);
            const manufacturers = await this.repositoryFactory
                .create('product_manufacturer')
                .search(nameCriteria, Shopware.Context.api);

            return manufacturers
                .map((manufacturer: { id: string; translated?: { name?: string }; name?: string }) => ({
                    id: manufacturer.id,
                    name: manufacturer.translated?.name ?? manufacturer.name ?? manufacturer.id,
                    value: qtyById[manufacturer.id] ?? 0,
                    formattedValue: new Intl.NumberFormat().format(qtyById[manufacturer.id] ?? 0),
                }))
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
