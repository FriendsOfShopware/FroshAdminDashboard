import { mountShopwareComponent } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it } from 'vitest';
import '../../src/main';

describe('frosh-widget-tasks', () => {
    it('filters completed tasks and persists a trimmed new task', async () => {
        const wrapper = await mountShopwareComponent('frosh-widget-tasks', {
            props: {
                settings: {
                    hideCompleted: true,
                    tasks: [
                        { id: 'open', text: 'Open task', done: false },
                        { id: 'done', text: 'Done task', done: true },
                    ],
                },
            },
            global: {
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'mt-button': true,
                    'mt-checkbox': true,
                    'mt-icon': true,
                    'mt-text-field': true,
                },
            },
        });

        expect(wrapper.vm.visibleTasks.map((task: { id: string }) => task.id)).toEqual(['open']);
        wrapper.vm.newTask = '  New task  ';
        wrapper.vm.onAddTask();

        expect(wrapper.vm.tasks.at(-1)).toMatchObject({ text: 'New task', done: false });
        expect(wrapper.emitted('update-settings')?.at(-1)).toEqual([{ tasks: wrapper.vm.tasks }]);
    });
});
