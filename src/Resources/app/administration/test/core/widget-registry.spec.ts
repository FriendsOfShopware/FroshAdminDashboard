import { describe, expect, it, vi } from 'vitest';
import { withShopwareService } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { widgetRegistry } from '../../src/core/widget-registry';

describe('widgetRegistry', () => {
    it('normalises its widget sizes and consults the Shopware ACL service', async () => {
        const can = vi.fn((privilege: string) => privilege === 'order.viewer');

        await withShopwareService('acl', { can }, () => {
            widgetRegistry.registerWidget({
                id: 'vitest-dashboard-widget',
                label: 'test.widget.label',
                icon: 'regular-chart-bar',
                component: 'vitest-dashboard-widget',
                defaultSize: 'full',
                supportedSizes: ['small', 'large'],
                acl: ['order.viewer', 'customer.viewer'],
            });

            const widget = widgetRegistry.getWidget('vitest-dashboard-widget');

            expect(widget).toMatchObject({ defaultSize: 'small', supportedSizes: ['small', 'large'] });
            expect(widgetRegistry.missingPrivileges(widget!)).toEqual(['customer.viewer']);
            expect(widgetRegistry.hasAccess(widget!)).toBe(false);
        });
    });
});
