// This file will now be the single source of truth for all types in the application.
import { Agent as WAAgent, Environment, MailSystem, Orchestrator } from './services/waas/Orchestrator';
import { FunctionDeclaration, FunctionCall } from '@google/genai';

// --- App Structure ---
export type View = 'SIMULATE' | 'BUILD';

// --- Core Enums ---
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  WAITING_FOR_DEPENDENCY = 'WAITING_FOR_DEPENDENCY',
  AWAITING_INPUT = 'AWAITING_INPUT',
}

// --- Data Structures ---
export interface Task {
  id: string;
  goal: string;
  originalGoal: string; // The pristine, original goal, for context.
  status: TaskStatus;
  assignee: string | null;
  issuer: string | null;
  history: { status: TaskStatus; timestamp: number; message: string }[];
  result?: any;
  subTaskIds: string[];
  dependencies: string[];
  retries: number;
}

export interface Mail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: any;
  timestamp: number;
}

export interface Event {
    name: string;
    data: any;
    timestamp: number;
}

// --- Agent Planning ---
export interface PlannedTask {
    id: string; // e.g., "task-1"
    goal: string;
    assignee: string;
    dependencies: string[]; // e.g., ["task-1"]
}

// --- Environment & Tooling ---
export type EnvironmentState = Record<string, any>;

export interface ToolResult {
    newState: EnvironmentState;
    event: { name: string; data: any; } | null;
    taskResult: any; // Data to be placed in the task.result field
}

export interface Tool {
    name:string;
    description: string;
    parameters: FunctionDeclaration['parameters'];
    execute(args: any, agent: WAAgent, task: Task, environmentState: EnvironmentState): Promise<ToolResult>;
}

// --- LLM Service Types ---
export interface LlmResponse {
    text?: string;
    functionCall?: FunctionCall;
}

// --- Conversation & Meeting Types ---
export interface ChatMessage {
    agentName: string;
    message: string;
    timestamp: number;
}

export interface Conversation {
    id: string;
    parentTaskId: string;
    topic: string;
    participants: string[];
    history: ChatMessage[];
    status: 'ACTIVE' | 'RESOLVED';
    initiator: string;
}

// --- SOP (Standard Operating Procedure) Types ---
export interface SOPStep {
    task_id: string;
    description: string;
    assignee_role: string;
    dependencies: string[];
    required_actions?: string[];
    output_schema?: Record<string, any>;
    next_on_success?: string[];
    next_on_failure?: string[];
}

export interface SOP {
    id: string;
    name: string;
    goal_type: string; // A keyword to match against a task's goal
    description: string;
    roles_involved: string[];
    steps: SOPStep[];
}

// --- Configuration Interfaces ---
export interface PermissionSet {
  canDelegate: boolean;
  canAssignRole: boolean;
  canHire: boolean;
  canCallMeeting: boolean;
}

export interface Role {
  name: string;
  description: string;
}

export interface LLMConfig {
  provider: 'gemini';
  model: 'gemini-2.5-flash-preview-04-17';
}

export interface EnvironmentConfig {
    id: string;
    initialState: EnvironmentState;
    tools: string[];
    permissions?: Record<string, string[]>; // toolName: [roleName]
}

export interface AgentConfig {
  id: string; // Unique ID for builder
  name: string;
  role: Role;
  permissions: PermissionSet;
  environmentId: string; // The environment this agent operates in
  memory?: string[];
  subordinates?: AgentConfig[];
  task_max_steps?: number;
}

export interface OrgConfig {
  name: string;
  llmConfig: LLMConfig;
  masterAgent: AgentConfig;
  environments: EnvironmentConfig[];
  sopLibrary?: SOP[];
}

// --- Framework Interface ---
export interface WaaSFramework {
  agents: Record<string, WAAgent>;
  environments: Record<string, Environment>;
  mailSystem: MailSystem;
  masterAgent: WAAgent;
  orchestrator: Orchestrator;
  reinitialize: (config: OrgConfig) => void;
}

// --- Visual Builder Types ---
export interface CanvasNode {
    id: string;
    agentConfig: AgentConfig;
    x: number;
    y: number;
}

export interface Edge {
    from: string;
    to: string;
}

export const ItemTypes = {
  AGENT_CARD: 'agent_card',
  CANVAS_NODE: 'canvas_node',
}

// --- Analytics & State Management ---
export interface SimulationMetrics {
    startTime: number;
    endTime: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    apiCalls: number;
    apiErrors: number;
}

export type DemoKey =
  | 'storybookStudioDemo'
  | 'agileInnovatorsDemo'
  | 'adAgencyDemo'
  | 'marketInsightsDemo'
  | 'blogFarmDemo';

export interface HumanInputRequest {
  id: string;
  question: string;
  taskId: string;
  agentName: string;
}

export interface WaaSState {
  orgConfig: OrgConfig;
  view: View;
  tasks: Task[];
  logs: Mail[];
  environments: Record<string, EnvironmentState>;
  events: Event[];
  conversations: Conversation[];
  isSimulating: boolean;
  simulationCompleted: boolean;
  thinkingAgentId: string | null;
  metrics: SimulationMetrics | null;
  showAnalytics: boolean;
  humanInputQueue: HumanInputRequest[];
}

export interface WaaSStore extends WaaSState {
  setView: (view: View) => void;
  setOrgConfig: (config: OrgConfig) => void;
  toggleAnalytics: () => void;
  resetSimulation: () => void;
  clearPersistentState: () => Promise<void>;
  setThinkingAgentId: (agentId: string | null) => void;
  addLog: (log: Mail) => void;
  addEvent: (event: Event) => void;
  updateEnvironments: (environments: Record<string, EnvironmentState>) => void;
  updateConversations: (conversations: Conversation[]) => void;
  requestHumanInput: (request: Omit<HumanInputRequest, 'id'>) => void;
  provideHumanInput: (requestId: string, response: string) => void;
  updateTasks: (tasks: Task[]) => void;
  startSimulation: (goal: string) => Promise<void>;
  loadDemo: (demoKey: DemoKey) => void;
}

export interface SavedSession {
    id: number;
    name: string;
    state: WaaSState;
    createdAt: Date;
}
