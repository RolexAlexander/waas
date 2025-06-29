import { PlannedTask, SOP } from "../../types";

export class WorkflowManager {
    private sopLibrary: Map<string, SOP> = new Map();

    constructor(sops: SOP[]) {
        this.loadSOPs(sops);
    }

    public loadSOPs(sops: SOP[]) {
        this.sopLibrary.clear();
        sops.forEach(sop => {
            this.sopLibrary.set(sop.id, sop);
        });
        console.log(`[WorkflowManager] Loaded ${this.sopLibrary.size} SOPs into the library.`);
    }

    /**
     * Finds the most relevant SOP for a given goal.
     * Currently uses a simple keyword match on the `goal_type`.
     * This could be enhanced with LLM-based semantic matching in the future.
     */
    public findSOPForGoal(goal: string): SOP | undefined {
        for (const sop of this.sopLibrary.values()) {
            // Using a regex to match the goal_type as a whole word, case-insensitively
            const regex = new RegExp(`\\b${sop.goal_type}\\b`, 'i');
            if (regex.test(goal)) {
                return sop;
            }
        }
        return undefined;
    }

    /**
     * Creates a list of planned tasks from an SOP and a map of roles to agent names.
     */
    public createPlanFromSOP(sop: SOP, roleToAgentMap: Map<string, string>): PlannedTask[] {
        const plannedTasks: PlannedTask[] = [];

        for (const step of sop.steps) {
            const assigneeName = roleToAgentMap.get(step.assignee_role);
            if (!assigneeName) {
                console.warn(`[WorkflowManager] SOP step "${step.task_id}" requires role "${step.assignee_role}", but no agent was assigned. Skipping.`);
                continue;
            }

            plannedTasks.push({
                id: step.task_id,
                goal: step.description,
                assignee: assigneeName,
                dependencies: step.dependencies,
            });
        }

        return plannedTasks;
    }
}
