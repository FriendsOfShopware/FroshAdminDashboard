import { mountShopwareComponent } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/main';

describe('frosh-widget-notes', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('debounces note updates', async () => {
        vi.useFakeTimers();
        const wrapper = await mountShopwareComponent('frosh-widget-notes', {
            props: { settings: { text: 'Initial', accent: '#123456' } },
            global: { mocks: { $tc: (key: string) => key } },
        });

        expect(wrapper.attributes('style')).toContain('border-left-color: rgb(18, 52, 86)');
        await wrapper.get('textarea').setValue('Updated');
        expect(wrapper.emitted('update-settings')).toBeUndefined();

        await vi.advanceTimersByTimeAsync(600);

        expect(wrapper.emitted('update-settings')).toEqual([[{ text: 'Updated' }]]);
    });

    it('flushes an outstanding note update before unmounting', async () => {
        vi.useFakeTimers();
        const wrapper = await mountShopwareComponent('frosh-widget-notes', {
            global: { mocks: { $tc: (key: string) => key } },
        });

        await wrapper.get('textarea').setValue('Keep this');
        wrapper.unmount();

        expect(wrapper.emitted('update-settings')).toEqual([[{ text: 'Keep this' }]]);
    });
});
