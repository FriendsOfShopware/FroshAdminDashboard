import template from './frosh-widget-country.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';
import { baseOrderCriteria, dateRangeFilter } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    count: number;
}

/** Orders per billing country. */
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
        async fetchCountries(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addAggregation(Criteria.terms('countrySales', 'billingAddress.countryId', null, null, null));

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.countrySales?.buckets ?? []) as CountBucket[];

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
            const countries = await this.repositoryFactory.create('country').search(nameCriteria, Shopware.Context.api);

            return countries
                .map((country: { id: string; translated?: { name?: string }; name?: string }) => ({
                    id: country.id,
                    name: country.translated?.name ?? country.name ?? country.id,
                    value: countById[country.id] ?? 0,
                    formattedValue: new Intl.NumberFormat().format(countById[country.id] ?? 0),
                }))
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
