import './frosh-widget-tasks.scss';
import template from './frosh-widget-tasks.html.twig';
import type { PropType } from 'vue';

interface Task {
    id: string;
    text: string;
    done: boolean;
}

interface TasksSettings {
    tasks?: Task[];
    hideCompleted?: boolean;
}

/**
 * A personal to-do list. Tasks live in the placement's `settings.tasks` (per
 * user, in user_config) and are persisted on every add / toggle / delete via
 * the `update-settings` event.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    emits: ['update-settings'],

    props: {
        settings: {
            type: Object as PropType<TasksSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { tasks: Task[]; newTask: string; editingId: string | null; editText: string } {
        return {
            // Local working copy seeded from the persisted settings.
            tasks: Array.isArray(this.settings.tasks) ? this.settings.tasks.map((task) => ({ ...task })) : [],
            newTask: '',
            editingId: null,
            editText: '',
        };
    },

    computed: {
        hideCompleted(): boolean {
            return this.settings.hideCompleted === true;
        },

        visibleTasks(): Task[] {
            return this.hideCompleted ? this.tasks.filter((task) => !task.done) : this.tasks;
        },

        openCount(): number {
            return this.tasks.filter((task) => !task.done).length;
        },
    },

    methods: {
        persist(): void {
            this.$emit('update-settings', { tasks: this.tasks });
        },

        onAddTask(): void {
            const text = this.newTask.trim();
            if (!text) {
                return;
            }

            this.tasks.push({ id: Shopware.Utils.createId(), text, done: false });
            this.newTask = '';
            this.persist();
        },

        onToggle(task: Task): void {
            task.done = !task.done;
            this.persist();
        },

        onRemove(taskId: string): void {
            this.tasks = this.tasks.filter((task) => task.id !== taskId);
            this.persist();
        },

        onStartEdit(task: Task): void {
            this.editingId = task.id;
            this.editText = task.text;
            this.$nextTick(() => {
                const input = this.$el.querySelector('.frosh-widget-tasks__edit-input input');
                if (input) {
                    (input as HTMLInputElement).focus();
                    (input as HTMLInputElement).select();
                }
            });
        },

        onSaveEdit(task: Task): void {
            const text = this.editText.trim();
            if (text) {
                task.text = text;
            }
            this.editingId = null;
            this.editText = '';
            this.persist();
        },

        onCancelEdit(): void {
            this.editingId = null;
            this.editText = '';
        },
    },
});
