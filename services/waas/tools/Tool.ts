import { FunctionDeclaration } from "@google/genai";
import { Agent } from "../Agent";
import { EnvironmentState, Task, ToolResult } from "../../../types";

export interface Tool {
    name: string;
    description: string;
    parameters: FunctionDeclaration['parameters'];
    execute(args: any, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult>;
}