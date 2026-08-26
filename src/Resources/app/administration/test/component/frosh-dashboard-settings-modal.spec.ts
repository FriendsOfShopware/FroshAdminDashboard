import { mountShopwareComponent } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it } from 'vitest';
import '../../src/main';

describe('frosh-dashboard-settings-modal', () => {
    it('emits the edited settings when saved', async () => {
        const wrapper = await mountShopwareComponent('frosh-dashboard-settings-modal', {
            props: {
                definition: {
                    id: 'notes',
                    label: 'test.widget.notes',
                    icon: 'regular-note',
                    component: 'frosh-widget-notes',
                    settings: [{ name: 'title', type: 'text', label: 'test.widget.title' }],
                },
                modelValue: { title: 'Initial title' },
            },
            global: {
                mocks: {
                    $tc: (key: string) => key,
                },
                stubs: {
                    'mt-button': true,
                    'mt-colorpicker': true,
                    'mt-text-field': true,
                    'sw-modal': { template: '<div><slot /></div>' },
                },
            },
        });

        wrapper.vm.updateValue('title', 'Updated title');
        wrapper.vm.onSave();

        expect(wrapper.emitted('save')).toEqual([[{ title: 'Updated title' }]]);
    });
});
