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

    data(): { tasks: Task[]; newTask: string } {
        return {
            // Local working copy seeded from the persisted settings.
            tasks: Array.isArray(this.settings.tasks) ? this.settings.tasks.map((task) => ({ ...task })) : [],
            newTask: '',
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
    },
});
