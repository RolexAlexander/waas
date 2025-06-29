
import { create } from 'zustand';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { OrgConfig, Task, Mail, View, TaskStatus, WaaSStore, WaaSState, HumanInputRequest, Conversation, EnvironmentState, Event, DemoKey } from '../types.ts';
import { DEFAULT_ORG_CONFIG } from '../constants.ts';
import { Orchestrator } from '../services/waas/Orchestrator.ts';
import { LLMService } from '../services/llmService.ts';
import { saveStateToDB, loadStateFromDB, clearStateFromDB } from '../services/db.ts';
import { debounce } from '../utils.ts';
import { demos } from '../demos/index.ts';

let orchestrator: Orchestrator | null = null;
let llmService: LLMService | null = null;

const initialState: WaaSState = {
  orgConfig: DEFAULT_ORG_CONFIG,
  view: 'SIMULATE',
  tasks: [],
  logs: [],
  environments: {},
  events: [],
  conversations: [],
  isSimulating: false,
  simulationCompleted: false,
  thinkingAgentId: null,
  metrics: null,
  showAnalytics: false,
  humanInputQueue: [],
};


export const useWaaSStore = create<WaaSStore>((set, get) => ({
  ...initialState,

  setView: (view: View) => set({ view }),

  setOrgConfig: (config: OrgConfig) => set({ orgConfig: config }),

  toggleAnalytics: () => set(state => ({ showAnalytics: !state.showAnalytics })),

  resetSimulation: () => set({
    tasks: [],
    logs: [],
    environments: {},
    events: [],
    conversations: [],
    isSimulating: false,
    simulationCompleted: false,
    thinkingAgentId: null,
    metrics: null,
    showAnalytics: false,
    humanInputQueue: [],
  }),

  clearPersistentState: async () => {
    await clearStateFromDB();
    window.location.reload();
  },

  setThinkingAgentId: (agentId: string | null) => set({ thinkingAgentId: agentId }),

  addLog: (log: Mail) => set(state => produce(state, draft => {
    draft.logs.push(log);
  })),

  addEvent: (event: Event) => set(state => produce(state, draft => {
    draft.events.push(event);
  })),
  
  updateEnvironments: (environments: Record<string, EnvironmentState>) => set({ environments }),
  
  updateConversations: (conversations: Conversation[]) => set({ conversations }),

  requestHumanInput: (request: Omit<HumanInputRequest, 'id'>) => {
    const newRequest = { ...request, id: uuidv4() };
    set(state => produce(state, draft => {
        draft.humanInputQueue.push(newRequest);
    }));
  },

  provideHumanInput: (requestId: string, response: string) => {
    const { humanInputQueue } = get();
    const request = humanInputQueue.find(r => r.id === requestId);
    if (!request || !orchestrator) return;

    // Remove request from the queue
    set(state => produce(state, draft => {
        draft.humanInputQueue = draft.humanInputQueue.filter(r => r.id !== requestId);
    }));

    // Find the task and resume it
    const task = orchestrator.getTaskById(request.taskId);
    if (task && task.status === TaskStatus.AWAITING_INPUT) {
        const lastQuestion = task.history.find(h => h.status === TaskStatus.AWAITING_INPUT)?.message || "Awaiting human input.";
        const updatedGoal = `My original goal was: "${task.originalGoal}". I requested human input with the question: "${lastQuestion}". The human provided this response: "${response}". I will now use this information to continue my original goal.`;

        const updatedTask = produce(task, draft => {
            draft.goal = updatedGoal; // Update goal with context
            draft.status = TaskStatus.PENDING;
            draft.history.push({ status: TaskStatus.PENDING, timestamp: Date.now(), message: `Human input received. Resuming task.`});
        });

        orchestrator.updateTask(updatedTask);
        orchestrator.dispatchTask(task.id);
    }
  },

  updateTasks: (updatedTasks: Task[]) => {
    const state = get();
    // Don't check for completion if simulation isn't running
    if (!state.isSimulating) {
        const sortedTasks = updatedTasks.sort((a,b) => a.history[0].timestamp - b.history[0].timestamp);
        set({ tasks: sortedTasks });
        return;
    }

    // Check for simulation completion
    const allDone = updatedTasks.length > 0 && updatedTasks.every(
      t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED
    );

    if (allDone) {
      const endTime = Date.now();
      const metrics = llmService!.getMetrics();
      const finalMetrics = {
        startTime: state.metrics?.startTime || Date.now(),
        endTime: endTime,
        totalTasks: updatedTasks.length,
        completedTasks: updatedTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        failedTasks: updatedTasks.filter(t => t.status === TaskStatus.FAILED).length,
        apiCalls: metrics.successfulCalls,
        apiErrors: metrics.failedCalls,
      };
      
      set({
        tasks: updatedTasks.sort((a,b) => a.history[0].timestamp - b.history[0].timestamp),
        isSimulating: false,
        simulationCompleted: true,
        thinkingAgentId: null,
        metrics: finalMetrics,
        showAnalytics: true, // Automatically show report on completion
      });
    } else {
       set({ tasks: updatedTasks.sort((a,b) => a.history[0].timestamp - b.history[0].timestamp) });
    }
  },

  startSimulation: async (goal: string) => {
    const { orgConfig, resetSimulation, updateTasks, addLog, updateConversations, setThinkingAgentId, updateEnvironments, addEvent } = get();

    // 1. Reset state
    resetSimulation();
    set({ 
        isSimulating: true,
        metrics: { 
            startTime: Date.now(),
            endTime: 0,
            apiCalls: 0, apiErrors: 0, totalTasks: 0,
            completedTasks: 0, failedTasks: 0,
        }
    });

    // 2. Initialize services
    llmService = new LLMService(process.env.API_KEY || '', 50, setThinkingAgentId);

    orchestrator = new Orchestrator(
      orgConfig,
      updateTasks,
      updateEnvironments,
      updateConversations,
      addEvent, // onEvent
      llmService
    );

    // 3. Run goal
    await orchestrator.runGoal(goal);
  },

  loadDemo: (demoKey: DemoKey) => {
    const { resetSimulation } = get();
    const selectedDemo = demos[demoKey];
    if (selectedDemo) {
        console.log(`Loading demo: ${selectedDemo.name}`);
        resetSimulation();
        set({
            orgConfig: selectedDemo,
        });
    }
  },
}));

// Function to save the current state to the database, debounced to avoid excessive writes.
const debouncedSave = debounce((state: WaaSState) => {
    saveStateToDB(state);
}, 1000);

const initializeStore = async () => {
    const savedState = await loadStateFromDB();
    if (savedState) {
        useWaaSStore.setState({ 
            ...savedState,
            // Crucially, never load into a running or thinking state.
            // The simulation logic isn't persisted, only the data.
            isSimulating: false,
            thinkingAgentId: null,
            humanInputQueue: [], // Always start with an empty queue on load
            conversations: [], // And no active chats
        });
    }

    // Subscribe to future changes to persist them.
    useWaaSStore.subscribe(state => {
        debouncedSave(state);
    });
};

// Initialize the store and persistence layer when the app loads.
initializeStore();
