import { mountShopwareComponent } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it } from 'vitest';
import '../../src/main';

const fetcher = async () => ({ series: [], summary: 0 });

function mountTimeseries(chartCardTemplate: string) {
    return mountShopwareComponent('frosh-analytics-timeseries', {
        props: {
            fetcher,
            seriesName: 'Sales',
        },
        global: {
            mocks: { $tc: (key: string) => key },
            stubs: {
                'sw-chart-card': { template: chartCardTemplate },
            },
        },
    });
}

describe('frosh-analytics-timeseries', () => {
    it('labels the native range select rendered by sw-chart-card (Shopware <= 6.7.13)', async () => {
        const wrapper = await mountTimeseries('<div class="sw-chart-card"><select /></div>');

        expect(wrapper.get('select').attributes('aria-label')).toBe('frosh-admin-dashboard.analytics.rangeLabel');
    });

    it('labels the mt-select range input rendered by sw-chart-card (Shopware >= 6.7.14)', async () => {
        const wrapper = await mountTimeseries(
            '<div class="sw-chart-card"><input class="mt-select-selection-list__input" /></div>',
        );

        expect(wrapper.get('.mt-select-selection-list__input').attributes('aria-label')).toBe(
            'frosh-admin-dashboard.analytics.rangeLabel',
        );
    });
});
