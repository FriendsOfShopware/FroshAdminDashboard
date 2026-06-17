import template from './frosh-widget-shipping-method.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';
import { baseOrderCriteria, dateRangeFilter } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    count: number;
}

/** Shipping method usage breakdown. */
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
        async fetchShippingMethods(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addFilter(Criteria.not('AND', [Criteria.equals('primaryOrderDelivery.shippingMethodId', null)]))
                .addAggregation(Criteria.terms('shippingMethodCount', 'primaryOrderDelivery.shippingMethodId', null, null, null));

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.shippingMethodCount?.buckets ?? []) as CountBucket[];

            const countById: Record<string, number> = {};
            let total = 0;
            buckets.forEach((bucket) => {
                countById[bucket.key] = bucket.count;
                total += bucket.count;
            });

            const ids = Object.keys(countById);
            if (!ids.length) {
                return [];
            }

            const nameCriteria = new Criteria(1, ids.length);
            nameCriteria.setIds(ids);
            const methods = await this.repositoryFactory.create('shipping_method').search(nameCriteria, Shopware.Context.api);

            return methods
                .map((method: { id: string; translated?: { name?: string }; name?: string }) => {
                    const count = countById[method.id] ?? 0;
                    const share = total === 0 ? 0 : count / total;
                    return {
                        id: method.id,
                        name: method.translated?.name ?? method.name ?? method.id,
                        value: count,
                        formattedValue: `${(share * 100).toFixed(1)} %`,
                    };
                })
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
