import { describe, expect, it, vi } from 'vitest';
import DashboardLayoutService, { LAYOUT_CONFIG_KEY } from '../../src/core/dashboard-layout.service';

describe('DashboardLayoutService', () => {
    it('discards malformed entries and normalises optional persisted fields', async () => {
        const service = new DashboardLayoutService({
            search: vi.fn().mockResolvedValue({
                data: {
                    [LAYOUT_CONFIG_KEY]: [
                        null,
                        { widgetId: '' },
                        { widgetId: 'orders', uid: 'orders-1', size: 'large', settings: { limit: 10 } },
                        { widgetId: 'customers', size: 'not-a-size', settings: [] },
                    ],
                },
            }),
            upsert: vi.fn(),
        });

        await expect(service.load()).resolves.toEqual([
            { widgetId: 'orders', uid: 'orders-1', size: 'large', settings: { limit: 10 } },
            expect.objectContaining({
                widgetId: 'customers',
                uid: expect.stringMatching(/^customers-/),
                size: 'medium',
                settings: {},
            }),
        ]);
    });

    it('persists the layout under its dedicated user-config key', async () => {
        const upsert = vi.fn().mockResolvedValue(undefined);
        const layout = [{ uid: 'notes-1', widgetId: 'notes', size: 'medium' as const, settings: {} }];
        const service = new DashboardLayoutService({ search: vi.fn(), upsert });

        await service.save(layout);

        expect(upsert).toHaveBeenCalledWith({ [LAYOUT_CONFIG_KEY]: layout });
    });
});
