import { produce } from "immer";
import { EnvironmentConfig, EnvironmentState, Tool } from "../../types";
import { Agent } from "./Agent";
import { Orchestrator } from "./Orchestrator";
import { ToolRegistry } from "./ToolRegistry";
import { Task } from "../../types";


export class Environment {
    id: string;
    private state: EnvironmentState;
    private tools: Map<string, Tool> = new Map();
    private permissions: Record<string, string[]>; // toolName -> [roleName]
    private orchestrator: Orchestrator;

    constructor(config: EnvironmentConfig, orchestrator: Orchestrator) {
        this.id = config.id;
        this.state = config.initialState;
        this.permissions = config.permissions || {};
        this.orchestrator = orchestrator;
        
        const toolRegistry = ToolRegistry.getInstance();
        config.tools.forEach(toolName => {
            const tool = toolRegistry.getTool(toolName);
            if (tool) {
                this.tools.set(toolName, tool);
            }
        });
    }

    getState(): EnvironmentState {
        return this.state;
    }
    
    setState(newState: EnvironmentState) {
        this.state = newState;
    }
    
    getToolsForRole(roleName: string): Tool[] {
        return Array.from(this.tools.values());
    }
    
    isToolPermitted(toolName: string, roleName: string): boolean {
        const allowedRoles = this.permissions[toolName];
        // If no permissions are defined for the tool, it's public.
        if (!allowedRoles) {
            return true;
        }
        // Otherwise, the agent's role must be in the list.
        return allowedRoles.includes(roleName);
    }
    
    canUseTool(agent: Agent, toolName: string): boolean {
        return this.isToolPermitted(toolName, agent.role.name);
    }

    async executeTool(toolName: string, args: any, agent: Agent, task: Task): Promise<any> {
        const tool = this.tools.get(toolName);
        if (!tool) {
            return { error: `Tool "${toolName}" not found in environment "${this.id}".` };
        }

        if (!this.canUseTool(agent, toolName)) {
            return { error: `Agent "${agent.name}" with role "${agent.role.name}" does not have permission to use tool "${toolName}".` };
        }
        
        const { newState, event, taskResult } = await tool.execute(args, agent, task, this.state);
        
        // Update the environment's state
        this.setState(newState);
        this.orchestrator.updateEnvironmentState(this.id, newState);
        
        // Broadcast the event
        if (event) {
            const fullEvent = { ...event, timestamp: Date.now() };
            this.orchestrator.broadcastEvent(fullEvent, agent, this);
        }

        return taskResult;
    }
}
