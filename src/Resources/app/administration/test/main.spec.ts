import { describe, expect, it } from 'vitest';

describe('administration entry point', () => {
    it('exposes the public dashboard registry and registers the dashboard page', async () => {
        await import('../src/main');

        expect(Shopware.FroshDashboard).toEqual(expect.objectContaining({
            getWidget: expect.any(Function),
            getWidgets: expect.any(Function),
            registerGroup: expect.any(Function),
            registerWidget: expect.any(Function),
        }));
        expect(Shopware.FroshDashboard.getWidget('frosh-widget-gmv')).toMatchObject({
            component: 'frosh-widget-gmv',
            id: 'frosh-widget-gmv',
        });
        expect(Shopware.Component.getComponentRegistry().has('frosh-dashboard-index')).toBe(true);
    });
});
