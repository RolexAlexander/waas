import { produce } from 'immer';
import { AgentConfig, Mail, PermissionSet, Role, Task, TaskStatus, PlannedTask, Conversation, Event, SOP } from '../../types';
import { LLMService } from '../llmService';
import { Orchestrator } from './Orchestrator';
import { Environment } from './Environment';
import { formatFailureForPrompt, formatResultsForPrompt, formatTaskForPrompt, formatMeetingForPrompt, formatEnvironmentForPrompt, formatToolsForLlm } from './promptUtils';
import { FunctionDeclaration, FunctionCall, Type } from '@google/genai';

const MAX_RETRIES = 1;
const MAX_MEMORY_ITEMS = 10;

export class Agent {
  id: string;
  name: string;
  role: Role;
  permissions: PermissionSet;
  llmService: LLMService;
  inbox: Mail[] = [];
  subordinates: Agent[] = [];
  manager: Agent | null = null;
  orchestrator: Orchestrator;
  environment: Environment | null = null;
  memory: string[] = [];
  
  private tasks: Record<string, Task> = {};

  constructor(config: AgentConfig, llmService: LLMService, orchestrator: Orchestrator) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.permissions = config.permissions;
    this.llmService = llmService;
    this.orchestrator = orchestrator;
    this.memory = config.memory || [];
  }

  setManager(manager: Agent) {
    this.manager = manager;
  }
  
  setEnvironment(env: Environment) {
      this.environment = env;
  }

  addSubordinate(agent: Agent) {
    this.subordinates.push(agent);
  }

  receiveMail(mail: Mail) {
    this.inbox.push(mail);
    this.processInbox();
  }

  private async processInbox() {
    if (this.inbox.length === 0) return;
    const mail = this.inbox.shift();
    if (!mail) return;

    switch (mail.subject) {
      case 'NEW_TASK':
        await this.handleNewTask(mail.body as Task);
        break;
      case 'TASK_UPDATE':
        await this._reflectOnCompletion(mail.body as Task);
        break;
      case 'ENVIRONMENT_EVENT':
        await this._handleEnvironmentEvent(mail.body as Event);
        break;
      case 'CONVERSATION_TURN':
        await this._participateInConversation(mail.body as Conversation, mail.from);
        break;
      case 'CONVERSATION_RESPONSE':
        this.orchestrator.conversationManager.advanceConversation(mail.body.chatId, this.name, mail.body.message);
        break;
      case 'SUMMARIZE_CONVERSATION':
        await this._summarizeConversation(mail.body as Conversation);
        break;
    }
  }

  private buildPrompt(basePrompt: string): string {
    if (!this.environment) {
        return `${basePrompt}\n\nThis agent is not in any environment and has no tools. You can only respond with text.`;
    }
    const envPrompt = formatEnvironmentForPrompt(this.environment, this.role.name);
    return `${basePrompt}\n\n${envPrompt}\n\nNow, decide on the next action. You can either call one of the available tools or provide a final text response.`;
  }

  private async plan(task: Task): Promise<PlannedTask[]> {
    // 1. Check for a matching SOP
    const matchingSOP = this.orchestrator.workflowManager.findSOPForGoal(task.goal);
    
    if (matchingSOP) {
        console.log(`[${this.name}] Found matching SOP "${matchingSOP.name}" for goal: ${task.goal}`);
        const subordinateRoles = new Set(this.subordinates.map(s => s.role.name));
        
        // Find subordinates that match the roles required by the SOP
        const roleToAgentMap = new Map<string, string>();
        matchingSOP.roles_involved.forEach(role => {
            const assignedAgent = this.subordinates.find(s => s.role.name === role);
            if (assignedAgent) {
                roleToAgentMap.set(role, assignedAgent.name);
            } else if (this.role.name === role) {
                roleToAgentMap.set(role, this.name);
            }
        });
        
        // Check if all required roles for the SOP are filled by available agents
        const allRolesFound = matchingSOP.roles_involved.every(role => roleToAgentMap.has(role));
        
        if (allRolesFound) {
            console.log(`[${this.name}] All roles for SOP found. Generating plan from SOP.`);
            return this.orchestrator.workflowManager.createPlanFromSOP(matchingSOP, roleToAgentMap);
        } else {
             console.warn(`[${this.name}] SOP "${matchingSOP.name}" matched, but not all required roles are available as subordinates. Falling back to LLM planning.`);
        }
    }

    // 2. Fallback to LLM-based planning
    console.log(`[${this.name}] No SOP found or roles missing. Using LLM to generate plan for goal: ${task.goal}`);
    const subNames = this.subordinates.map(s => `"${s.name}" (${s.role.name})`).join(', ');
    const prompt = `You are the ${this.role.name} and you need to create a plan to accomplish a goal by delegating to your subordinates.

## Your Goal ##
Your task is to: "${task.goal}"

## Your Subordinates ##
You have the following direct reports available to assign tasks to:
${subNames.length > 0 ? subNames : 'None'}

## Instructions for Planning ##
1.  **Decomposition:** Break down your main goal into smaller, logical sub-tasks.
2.  **Specificity is Key:** Each sub-task's goal must be extremely specific and self-contained. It must inherit all necessary context from your main goal. For example, if your goal is "Write a short children's book about a brave squirrel who learns to fly...", do NOT create a generic sub-task like "Outline the story concept." Instead, create a detailed task like "Create a story outline for a book about a brave squirrel who learns to fly." The agent receiving the task must understand it completely without needing more context.
3.  **Dependencies:** Define the dependencies between tasks. A task should only start after its dependencies are completed. For creative projects, illustration tasks should depend on the corresponding content-writing task being complete.
4.  **Final Review:** The final task in the plan should often be a review or aggregation task assigned back to you, the manager (${this.name}), to consolidate the results.

Based on these instructions, call the 'create_plan' tool with the list of sub-tasks.`;
    
    const createPlanTool: FunctionDeclaration = {
        name: 'create_plan',
        description: 'Creates a dependency-aware plan of sub-tasks to be delegated to subordinates.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                tasks: {
                    type: Type.ARRAY,
                    description: 'The list of sub-tasks to create.',
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: 'A short, unique, dash-separated-string identifier for the task, e.g., "outline-story".' },
                            goal: { type: Type.STRING, description: 'The specific goal of this sub-task.' },
                            assignee: { type: Type.STRING, description: 'The name of the subordinate to assign this task to.', enum: this.subordinates.map(s => s.name) },
                            dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of task IDs that must be completed before this one can start.' },
                        },
                        required: ['id', 'goal', 'assignee', 'dependencies'],
                    }
                }
            },
            required: ['tasks']
        }
    };
    
    try {
        const response = await this.llmService.generateResponse(prompt, this.name, [createPlanTool], true);
        if (response.functionCall?.name === 'create_plan') {
            return response.functionCall.args.tasks as PlannedTask[];
        }
        console.error(`[${this.name}] LLM failed to call 'create_plan' tool. Response:`, response.text);
        return [];
    } catch (e) {
        console.error(`[${this.name}] Failed to generate or parse plan from LLM:`, e);
        // Fallback for catastrophic failure
        if (this.subordinates.length > 0) {
            return [{ id: 'task-1', goal: task.goal, assignee: this.subordinates[0].name, dependencies: [] }];
        }
        return [];
    }
  }

  private async thinkAndAct(task: Task): Promise<any> {
    const formattedTask = formatTaskForPrompt(task, this.memory);
    const prompt = this.buildPrompt(formattedTask);
    this.updateTaskState(task.id, TaskStatus.IN_PROGRESS, "Thinking about the next action...");
    
    const availableTools = this.environment ? formatToolsForLlm(this.environment.getToolsForRole(this.role.name)) : [];

    try {
      const response = await this.llmService.generateResponse(prompt, this.name, availableTools);

      if (response.functionCall) {
        if (!this.environment) {
            return { error: `Agent ${this.name} is not in an environment and cannot use tools.`};
        }
        
        const toolName = response.functionCall.name;
        const toolArgs = response.functionCall.args;
        
        this.updateTaskState(task.id, TaskStatus.IN_PROGRESS, `Using tool: ${toolName} with args ${JSON.stringify(toolArgs)}`);
        
        // Execute tool via the environment
        const toolResult = await this.environment.executeTool(toolName, toolArgs, this, task);
        
        // Check for internal status signals from tools
        if (toolResult && (toolResult.waas_internal_status === 'AWAITING_HUMAN_INPUT' || toolResult.waas_internal_status === 'CONVERSATION_STARTED')) {
            return toolResult; // Halt processing, do not report completion
        }

        return toolResult;
      } else {
        // If the LLM responds with text, it's considered the final answer.
        this.updateTaskState(task.id, TaskStatus.IN_PROGRESS, `Responded with final answer.`);
        return response.text;
      }
    } catch (e) {
      console.error(`[${this.name}] Error in think/act loop`, e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.updateTaskState(task.id, TaskStatus.FAILED, `Failed to decide on a valid action or tool use: ${errorMessage}`);
      return { error: `Failed to decide on an action: ${errorMessage}` };
    }
  }

    private async handleNewTask(task: Task) {
        this.tasks[task.id] = task;
        this.updateTaskState(task.id, TaskStatus.IN_PROGRESS, "Task accepted. Analyzing...");

        // Worker agents execute directly.
        if (this.subordinates.length === 0 || !this.permissions.canDelegate) {
            const result = await this.thinkAndAct(task);
            
            if (result && (result.waas_internal_status === 'AWAITING_HUMAN_INPUT' || result.waas_internal_status === 'CONVERSATION_STARTED')) {
                return; // Stop here, the tool has already updated the state.
            }

            if (result && result.error) {
                this.handleTaskFailure(task, `Action failed: ${result.error}`);
            } else {
                this.handleTaskCompletion(task, result);
            }
        } else { // Manager agent delegates.
            const plannedTasks = await this.plan(task);
            if (plannedTasks.length === 0) {
                this.handleTaskFailure(task, "Planning failed and no sub-tasks were generated.");
                return;
            }
            await this.executePlan(task.id, plannedTasks);
        }
    }

    private handleTaskFailure(task: Task, message: string) {
        const finalTaskState = produce(this.tasks[task.id], draft => {
            draft.status = TaskStatus.FAILED;
            draft.history.push({ status: TaskStatus.FAILED, timestamp: Date.now(), message });
        });
        this.tasks[task.id] = finalTaskState;
        this.orchestrator.updateTask(finalTaskState);
        this.reportStatus(task.id);
    }
    
    private async handleTaskCompletion(task: Task, result: any) {
        const finalTaskState = produce(this.tasks[task.id], draft => {
            draft.status = TaskStatus.COMPLETED;
            draft.history.push({ status: TaskStatus.COMPLETED, timestamp: Date.now(), message: "Action complete." });
            draft.result = result;
        });

        this.tasks[task.id] = finalTaskState;
        this.orchestrator.updateTask(finalTaskState);

        await this._reflectOnAction(finalTaskState);
        this.reportStatus(task.id);
    }
  
  private async executePlan(parentTaskId: string, plannedTasks: PlannedTask[]) {
    const planIdToUUID = new Map<string, string>();

    const subTaskIds = plannedTasks.map(pt => {
        const realTask = this.orchestrator.createTask({
            goal: pt.goal,
            assignee: pt.assignee,
            issuer: this.name,
            status: TaskStatus.WAITING_FOR_DEPENDENCY,
        });
        planIdToUUID.set(pt.id, realTask.id);
        return realTask.id;
    });

    this.tasks[parentTaskId] = produce(this.tasks[parentTaskId], draft => {
        draft.subTaskIds = subTaskIds;
    });
    this.orchestrator.updateTask(this.tasks[parentTaskId]);

    for (const pt of plannedTasks) {
        const realTaskId = planIdToUUID.get(pt.id)!;
        const realDependencyIds = pt.dependencies.map(depId => {
            const uuid = planIdToUUID.get(depId);
            if (!uuid) console.error(`Could not find real task ID for dependency '${depId}'`);
            return uuid;
        }).filter(Boolean) as string[];
        
        this.orchestrator.updateTaskDependencies(realTaskId, realDependencyIds);
    }
    
    for (const pt of plannedTasks) {
        if (pt.dependencies.length === 0) {
            const taskIdToDispatch = planIdToUUID.get(pt.id)!;
            this.orchestrator.dispatchTask(taskIdToDispatch);
        }
    }
  }
  
  private findParentTaskId(subTaskId: string): string | undefined {
      return Object.keys(this.tasks).find(taskId => this.tasks[taskId].subTaskIds?.includes(subTaskId));
  }
  
  private async _handleEnvironmentEvent(event: Event) {
      // A simple reflection. A more complex agent might re-evaluate its current task.
      console.log(`[${this.name}] Received environment event: ${event.name}`, event.data);
  }

  private async _reflectOnCompletion(subTask: Task) {
    const parentTaskId = this.findParentTaskId(subTask.id);
    if (!parentTaskId) return;
    
    // Crucially, update the orchestrator's master record of the sub-task.
    this.orchestrator.updateTask(subTask);
    
    const parentTask = this.tasks[parentTaskId];

    if (subTask.status === TaskStatus.FAILED) {
        this.updateTaskState(parentTaskId, TaskStatus.IN_PROGRESS, `Received FAILED status for sub-task '${subTask.originalGoal}' from ${subTask.assignee}. Reflecting...`);
        if (subTask.retries < MAX_RETRIES) {
            this.updateTaskState(parentTaskId, TaskStatus.IN_PROGRESS, `Retrying failed task.`);
            this.orchestrator.retryTask(subTask.id);
        } else {
            // Task has failed permanently. Escalate to manager.
            this.updateTaskState(parentTaskId, TaskStatus.BLOCKED, `Sub-task '${subTask.originalGoal}' failed after ${MAX_RETRIES} retries. Manager to decide next steps.`);
            
            const updatedGoal = formatFailureForPrompt(parentTask.originalGoal, subTask);
            
            // Update the parent task with the new goal and reset its sub-tasks.
            const updatedParentTask = produce(parentTask, draft => {
                draft.goal = updatedGoal;
                draft.subTaskIds = []; // Reset sub-tasks to re-plan
            });
            this.tasks[parentTaskId] = updatedParentTask;
            this.orchestrator.updateTask(updatedParentTask);

            // Tell the orchestrator to re-dispatch this updated task to the manager.
            this.orchestrator.dispatchTask(parentTaskId);
        }
        return;
    }

    this.updateTaskState(parentTaskId, TaskStatus.IN_PROGRESS, `Received completion for sub-task '${subTask.originalGoal}' from ${subTask.assignee}. Reflecting...`);
    
    const subTasks = await this.orchestrator.getTasksByIds(parentTask.subTaskIds || []);
    const completedTaskIds = new Set(subTasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.id));

    const waitingTasks = subTasks.filter(t => t.status === TaskStatus.WAITING_FOR_DEPENDENCY);
    for (const waitingTask of waitingTasks) {
        const allDependenciesMet = waitingTask.dependencies.every(depId => completedTaskIds.has(depId));
        if (allDependenciesMet) {
            const dependencyTasks = waitingTask.dependencies.map(depId => this.orchestrator.getTaskById(depId)!);
            const contextFromDeps = formatResultsForPrompt(dependencyTasks);
            
            const updatedGoal = `${contextFromDeps}\n\n## Your Original Task ##\nBased on the results above, execute your original task: ${waitingTask.originalGoal}`;

            this.orchestrator.updateTaskGoal(waitingTask.id, updatedGoal);
            this.orchestrator.dispatchTask(waitingTask.id);
        }
    }
    
    const allSubTasksDone = subTasks.every(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED);
    if (allSubTasksDone) {
        const failedSubtasks = subTasks.filter(t => t.status === TaskStatus.FAILED);
        if (failedSubtasks.length > 0) {
            this.handleTaskFailure(parentTask, `Parent task failed because ${failedSubtasks.length} sub-tasks could not be completed.`);
            return;
        }

        this.updateTaskState(parentTaskId, TaskStatus.IN_PROGRESS, "All sub-tasks complete. Aggregating final results.");
        const aggregatedResult = subTasks.reduce((acc, t) => {
            acc[t.assignee as string] = { goal: t.originalGoal, result: t.result };
            return acc;
        }, {} as Record<string, any>);
      
        this.handleTaskCompletion(parentTask, aggregatedResult);
    }
  }
  
  private async _reflectOnAction(task: Task) {
    if (!task.result || (typeof task.result === 'object' && Object.keys(task.result).length === 0)) {
        return; // No result to reflect on
    }

    const resultSummary = JSON.stringify(task.result).substring(0, 300); // Truncate for prompt

    const prompt = `You are an AI agent reflecting on a completed task. Based on the task goal and its result, create a single, concise memory (one sentence) that I should remember for the future. The memory should be a lesson learned or a key takeaway.
    
**Task Goal:** "${task.originalGoal}"
**Result Summary:** \`\`\`${resultSummary}...\`\`\`
    
Your one-sentence memory:`;

    try {
        const response = await this.llmService.generateResponse(prompt, this.name);
        const memory = response.text?.trim();

        if (memory) {
            console.log(`[${this.name}] New memory created: "${memory}"`);
            this.memory.push(memory);
            // Keep memory capped at the last 10 experiences
            if (this.memory.length > MAX_MEMORY_ITEMS) {
                this.memory.shift();
            }
        }
    } catch(e) {
        console.error(`[${this.name}] Failed to reflect on action for task ${task.id}.`, e);
        // Do not throw; reflection is a non-critical enhancement.
    }
  }

  private async _participateInConversation(chat: Conversation, from: string) {
    const prompt = formatMeetingForPrompt(chat, this.name, this.role.name);

    try {
        const response = await this.llmService.generateResponse(prompt, this.name);
        this.orchestrator.mailSystem.send(from, {
            from: this.name,
            subject: 'CONVERSATION_RESPONSE',
            body: { chatId: chat.id, message: response.text || '(No response text)' }
        });
    } catch (e) {
        const errorMessage = `[${this.name}] Failed to generate meeting response. Error: ${e instanceof Error ? e.message : String(e)}`;
        console.error(errorMessage);
        this.orchestrator.mailSystem.send(from, {
            from: this.name,
            subject: 'CONVERSATION_RESPONSE',
            body: { chatId: chat.id, message: `(System: Could not generate a response due to an error.)` }
        });
    }
  }

  private async _summarizeConversation(chat: Conversation) {
      const prompt = `You are ${chat.initiator}, the meeting moderator. The following conversation has concluded. Your task is to analyze the entire conversation and formulate a final, actionable resolution.

**Original Problem:** ${chat.topic}

**Conversation History:**
${chat.history.map(m => `${m.agentName}: ${m.message}`).join('\n')}

**Your Task:**
Based on the discussion, what is the final resolution? This should be a clear plan, a new design, or a specific set of instructions to unblock the original task.`;

      try {
          const response = await this.llmService.generateResponse(prompt, this.name);
          const resolution = response.text || "The conversation concluded without a clear resolution.";
          
          const parentTask = this.orchestrator.getTaskById(chat.parentTaskId);
          if (parentTask) {
              const updatedTask = produce(parentTask, draft => {
                  draft.status = TaskStatus.IN_PROGRESS; // Set back to in-progress to be re-evaluated
                  draft.result = { meeting_resolution: resolution };
                  draft.history.push({ status: TaskStatus.IN_PROGRESS, timestamp: Date.now(), message: `Conversation resolved. New plan: ${resolution}` });
              });
              
              this.tasks[parentTask.id] = updatedTask; // Manager re-acquires task
              this.orchestrator.updateTask(updatedTask);
              this.orchestrator.dispatchTask(parentTask.id); // Re-dispatch to self to continue
          }

      } catch (e) {
          console.error(`[${this.name}] Failed to summarize conversation.`, e);
      }
  }
  
  private updateTaskState(taskId: string, status: TaskStatus, message: string) {
    if (!this.tasks[taskId]) {
        // If the agent doesn't own this task, ask the orchestrator to update it.
        const task = this.orchestrator.getTaskById(taskId);
        if (task) {
            this.orchestrator.updateTask(produce(task, draft => {
                draft.status = status;
                draft.history.push({ status: status, timestamp: Date.now(), message: message });
            }));
        }
        return;
    }
    const updatedTask = produce(this.tasks[taskId], draft => {
        draft.status = status;
        draft.history.push({ status: status, timestamp: Date.now(), message: message });
    });
    this.tasks[taskId] = updatedTask;
    this.orchestrator.updateTask(updatedTask);
  }

  private reportStatus(taskId: string) {
    const task = this.tasks[taskId];
    if (task.issuer && task.issuer !== 'System') {
      this.orchestrator.mailSystem.send(task.issuer, { from: this.name, subject: 'TASK_UPDATE', body: task });
    }
  }
}
