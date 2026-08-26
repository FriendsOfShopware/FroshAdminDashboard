import { flushPromises, mountShopwareComponent } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it, vi } from 'vitest';
import '../../src/main';

describe('frosh-dashboard-grid', () => {
    it('loads the saved layout and persists resized and merged widget settings', async () => {
        const stored = [{
            uid: 'notes-1',
            widgetId: 'frosh-widget-notes',
            size: 'medium',
            settings: { accent: '#fbd34d', text: 'Initial' },
        }];
        const layoutService = {
            load: vi.fn().mockResolvedValue(stored),
            save: vi.fn().mockResolvedValue(undefined),
        };

        const wrapper = await mountShopwareComponent('frosh-dashboard-grid', {
            global: {
                provide: { froshDashboardLayoutService: layoutService },
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'frosh-dashboard-add-widget-modal': true,
                    'frosh-dashboard-settings-modal': true,
                    'frosh-dashboard-widget': true,
                    'mt-button': true,
                    'mt-icon': true,
                    'sw-loader': true,
                },
            },
        });
        await flushPromises();

        expect(layoutService.load).toHaveBeenCalledOnce();
        expect(wrapper.vm.layout).toEqual(stored);

        wrapper.vm.onResizeWidget('notes-1', 'large');
        await flushPromises();
        wrapper.vm.onWidgetSettingsUpdate('notes-1', { text: 'Updated' });
        await flushPromises();

        expect(layoutService.save).toHaveBeenLastCalledWith([{
            uid: 'notes-1',
            widgetId: 'frosh-widget-notes',
            size: 'large',
            settings: { accent: '#fbd34d', text: 'Updated' },
        }]);
    });

    it('applies registry defaults when a widget is added', async () => {
        const layoutService = {
            load: vi.fn().mockResolvedValue([]),
            save: vi.fn().mockResolvedValue(undefined),
        };
        const wrapper = await mountShopwareComponent('frosh-dashboard-grid', {
            global: {
                provide: { froshDashboardLayoutService: layoutService },
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'frosh-dashboard-add-widget-modal': true,
                    'frosh-dashboard-settings-modal': true,
                    'frosh-dashboard-widget': true,
                    'mt-button': true,
                    'mt-icon': true,
                    'sw-loader': true,
                },
            },
        });
        await flushPromises();

        wrapper.vm.onAddWidget('frosh-widget-notes');
        await flushPromises();

        expect(wrapper.vm.layout).toEqual([
            expect.objectContaining({
                widgetId: 'frosh-widget-notes',
                size: 'medium',
                settings: { accent: '#fbd34d' },
            }),
        ]);
        expect(layoutService.save).toHaveBeenCalledOnce();
    });
});
