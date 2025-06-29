import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';
import { AgentConfig, Mail, OrgConfig, Task, TaskStatus, Conversation, EnvironmentState } from '../../types';
import { LLMService } from '../llmService';
import { Agent } from './Agent';
import { MailSystem } from './MailSystem';
import { Environment } from './Environment';
import { ConversationManager } from './ConversationManager';
import { WorkflowManager } from './WorkflowManager';

export { Agent, Environment, MailSystem };

export class Orchestrator {
  public agents: Record<string, Agent> = {};
  public environments: Record<string, Environment> = {};
  public mailSystem: MailSystem;
  public conversationManager: ConversationManager;
  public workflowManager: WorkflowManager;
  public masterAgent!: Agent;
  public tasks: Record<string, Task> = {};
  
  private onTasksUpdate: (tasks: Task[]) => void;
  private onEnvironmentsUpdate: (environments: Record<string, EnvironmentState>) => void;
  private onEvent: (event: any) => void;
  private llmService: LLMService;
  private orgConfig: OrgConfig;
  
  constructor(
    config: OrgConfig, 
    onTasksUpdate: (tasks: Task[]) => void,
    onEnvironmentsUpdate: (environments: Record<string, EnvironmentState>) => void,
    onConversationsUpdate: (chats: Conversation[]) => void,
    onEvent: (event: any) => void,
    llmService: LLMService
  ) {
    this.orgConfig = config;
    this.onTasksUpdate = onTasksUpdate;
    this.onEnvironmentsUpdate = onEnvironmentsUpdate;
    this.onEvent = onEvent;
    this.llmService = llmService;

    this.mailSystem = new MailSystem(onEvent);
    this.conversationManager = new ConversationManager(
        this.mailSystem,
        this.getTaskById,
        this.updateTask.bind(this),
        onConversationsUpdate
    );
    this.workflowManager = new WorkflowManager(config.sopLibrary || []);

    this.initializeFromConfig(config);
  }

  private initializeFromConfig(config: OrgConfig) {
      this.agents = {};
      this.environments = {};
      this.tasks = {};
      
      this.llmService.resetCounters();

      // 1. Initialize Environments
      config.environments.forEach(envConfig => {
          const environment = new Environment(envConfig, this);
          this.environments[envConfig.id] = environment;
      });
      this.onEnvironmentsUpdate(this.getEnvironmentStates());

      // 2. Initialize Agents and assign them to environments
      const createAgent = (agentConfig: AgentConfig, manager: Agent | null): Agent => {
          const agent = new Agent(
              agentConfig,
              this.llmService,
              this,
          );
          agent.setManager(manager);
          
          const agentEnv = this.environments[agentConfig.environmentId];
          if (agentEnv) {
              agent.setEnvironment(agentEnv);
          } else {
              console.warn(`Agent ${agent.name} configured for non-existent environment ID: ${agentConfig.environmentId}`);
          }

          this.agents[agent.name] = agent;
          this.mailSystem.register(agent);

          if (agentConfig.subordinates) {
              agentConfig.subordinates.forEach(subConfig => {
                  const subordinate = createAgent(subConfig, agent);
                  agent.addSubordinate(subordinate);
              });
          }
          return agent;
      };
      
      this.masterAgent = createAgent(config.masterAgent, null);

      // 3. Load SOPs into WorkflowManager
      this.workflowManager.loadSOPs(config.sopLibrary || []);
  }
  
  public getTasksByIds = async (ids: string[]): Promise<Task[]> => {
      return ids.map(id => this.tasks[id]).filter(Boolean);
  }

  public getTaskById = (id: string): Task | undefined => {
      return this.tasks[id];
  }
  
  public getEnvironmentStates = (): Record<string, EnvironmentState> => {
      return Object.entries(this.environments).reduce((acc, [id, env]) => {
          acc[id] = env.getState();
          return acc;
      }, {} as Record<string, EnvironmentState>);
  }

  public updateEnvironmentState(envId: string, newState: EnvironmentState) {
      if (this.environments[envId]) {
          this.environments[envId].setState(newState);
          this.onEnvironmentsUpdate(this.getEnvironmentStates());
      }
  }
  
  public broadcastEvent(event: any, originatingAgent: Agent, environment: Environment) {
      this.onEvent(event); // For global log
      for (const agent of Object.values(this.agents)) {
          // Send event to all agents in the same environment, except the one who caused it.
          if (agent.environment?.id === environment.id && agent.id !== originatingAgent.id) {
              this.mailSystem.send(agent.name, {
                  from: `env:${environment.id}`,
                  subject: 'ENVIRONMENT_EVENT',
                  body: event
              });
          }
      }
  }

  public getCurrentConfig = (): OrgConfig => {
      return this.orgConfig;
  }

  public createTask(details: { goal: string; assignee: string | null; issuer: string | null; status?: TaskStatus }): Task {
    const task: Task = {
      id: uuidv4(),
      goal: details.goal,
      originalGoal: details.goal,
      status: details.status || TaskStatus.PENDING,
      assignee: details.assignee,
      issuer: details.issuer,
      history: [{ status: details.status || TaskStatus.PENDING, timestamp: Date.now(), message: `Task created.` }],
      subTaskIds: [],
      dependencies: [],
      retries: 0,
    };
    this.updateTask(task);
    return task;
  }

  public updateTask(task: Task) {
    this.tasks = produce(this.tasks, draft => {
        draft[task.id] = task;
    });
    this.onTasksUpdate(Object.values(this.tasks));
  }

  public updateTaskDependencies(taskId: string, dependencies: string[]) {
      const task = this.getTaskById(taskId);
      if (task) {
          this.updateTask(produce(task, draft => {
              draft.dependencies = dependencies;
          }));
      }
  }

  public updateTaskGoal(taskId: string, newGoal: string) {
      const task = this.getTaskById(taskId);
      if (task) {
          this.updateTask(produce(task, draft => {
              draft.goal = newGoal;
          }));
      }
  }
  
  public dispatchTask(taskId: string) {
    const task = this.getTaskById(taskId);
    if (!task || !task.assignee) return;

    const updatedTask = produce(task, draft => {
        draft.status = TaskStatus.PENDING;
        draft.history.push({ status: TaskStatus.PENDING, timestamp: Date.now(), message: 'Dependencies met. Dispatching.' });
    });
    this.updateTask(updatedTask);
    this.mailSystem.send(task.assignee, { from: updatedTask.issuer || 'System', subject: 'NEW_TASK', body: updatedTask });
  }

  public retryTask(taskId: string) {
      const task = this.getTaskById(taskId);
      if (!task || !task.assignee) return;

      const updatedTask = produce(task, draft => {
          draft.status = TaskStatus.PENDING;
          draft.retries += 1;
          draft.history.push({ status: TaskStatus.PENDING, timestamp: Date.now(), message: `Retrying task (attempt ${draft.retries}).` });
      });
      this.updateTask(updatedTask);
      this.mailSystem.send(task.assignee, { from: updatedTask.issuer || 'System', subject: 'NEW_TASK', body: updatedTask });
  }

  public async runGoal(string: string): Promise<Task> {
    this.tasks = {}; 
    this.onTasksUpdate([]);
    this.conversationManager.reset();
    
    const masterTask = this.createTask({
      goal: string,
      assignee: this.masterAgent.name,
      issuer: 'System'
    });

    this.mailSystem.send(this.masterAgent.name, {
      from: 'System',
      subject: 'NEW_TASK',
      body: masterTask
    });

    return masterTask;
  }
}
