
# WaaS - Workforce as a Service

**An agentic AI framework for simulating collaborative organizations.**

WaaS is a sophisticated, browser-based framework built with React and TypeScript that allows you to define, simulate, and observe virtual organizations of AI agents. Inspired by systems like ChatDev and AutoGen, WaaS provides the building blocks to model complex hierarchies, assign specialized roles, and watch as autonomous agents collaborate using powerful tools to achieve high-level goals.

The entire simulation runs in your browser, using IndexedDB for session persistence and the Gemini API for agent intelligence.

![WaaS Simulation Screenshot](/public/screenshot.png)

---

## Core Concepts

Understanding these core concepts is key to working with the WaaS framework.

-   **Agent**: The fundamental actor in the simulation. An agent has a name, a specialized `Role`, a set of `Permissions` (e.g., can it delegate tasks?), and operates within an `Environment`. Agents can be managers who delegate tasks or workers who execute them.

-   **Role**: Defines an agent's function, expertise, and purpose (e.g., "Author", "Software Engineer", "QA Engineer").

-   **Orchestrator**: The central nervous system of the simulation. It manages the lifecycle of tasks, initializes agents and environments, and facilitates the overall workflow. It's the "operating system" for the AI workforce.

-   **Task**: A unit of work with a specific goal, status (e.g., `PENDING`, `IN_PROGRESS`, `COMPLETED`), assignee, and dependencies. Tasks are the primary way work is assigned and tracked.

-   **Environment**: A shared, stateful workspace for agents. It contains a JSON state object (e.g., a virtual filesystem, a database) and a collection of available `Tools`. Agents within the same environment can observe and modify its state.

-   **Tool**: A specific capability an agent can use to interact with its `Environment` or the outside world (e.g., `write_code`, `web_search`, `create_illustrations`). Tools are defined with parameters compatible with the Gemini API's function calling feature.

-   **MailSystem**: The internal communication network. Agents use the MailSystem to send messages to one another, such as assigning new tasks or reporting status updates.

-   **SOP (Standard Operating Procedure)**: A pre-defined workflow or template for common, multi-step goals. If a new task's goal matches an SOP's `goal_type`, the Orchestrator can automatically generate a structured plan. This makes the system more reliable, efficient, and predictable for routine operations, bypassing the need for the manager agent to create a plan from scratch using an LLM call.

-   **Conversation (Meeting)**: A mechanism for agents to resolve complex problems or blockages. When an agent gets stuck, it can use the `start_conversation` tool to initiate a multi-turn chat with other agents. This allows for emergent, collaborative problem-solving when a clear path forward isn't available.

---

## Architecture Overview

The WaaS framework follows a hierarchical, event-driven architecture.

1.  **Initiation**: The user provides a high-level goal (e.g., "Create a children's storybook about a brave mouse").
2.  **Master Task**: The `Orchestrator` creates a single "master" `Task` and assigns it to the `Master Agent` (the top of the org chart).
3.  **Planning & Delegation**: The `Master Agent` receives the task via its inbox.
    -   **SOP Check**: It first consults the `WorkflowManager` to see if a `SOP` matches the task's goal. If a match is found and all required roles are present, a plan is generated directly from the SOP template.
    -   **LLM Planning**: If no SOP is found, the agent uses the `LLMService` (Gemini API) to decompose the high-level goal into a series of smaller, delegate-able sub-tasks with defined dependencies.
4.  **Dispatch**: The `Orchestrator` receives this plan, creates the sub-tasks, and dispatches them to the appropriate subordinate agents via the `MailSystem`.
5.  **Execution**: Worker agents receive their tasks. They enter a "think-act" loop:
    -   **Think**: The agent analyzes its task, its memories, and the current state of its `Environment`. It then uses the `LLMService` to decide which `Tool` to use next.
    -   **Act**: The agent executes the chosen tool through the `Environment`. The tool's logic runs, potentially modifying the environment's state and producing a result.
6.  **State & Events**: When a tool modifies the `Environment`, the state change is broadcast as an `Event` to all other agents in that environment, keeping them informed.
7.  **Reporting**: Upon completing a task, a worker agent reports the result back to its manager.
8.  **Reflection & Continuation**: The manager agent "reflects" on the sub-task's completion. It updates its understanding and then instructs the `Orchestrator` to dispatch the next tasks in the plan whose dependencies have been met.
9.  **Resolution Mechanisms**:
    -   **Failure**: If a sub-task fails repeatedly, the failure is escalated to the manager, who must decide on a new course of action (e.g., retry, replan, or call a meeting).
    -   **Blockage**: If an agent is stuck, it can use the `start_conversation` tool to initiate a meeting. The `ConversationManager` facilitates this multi-turn dialogue until a resolution is found.
10. **Completion**: This cycle continues until the `Master Agent` completes its final aggregation/review task. The final result is presented to the user, and a simulation report is generated.

---

## Project Structure

The codebase is organized to separate concerns, making it easier to navigate and extend.

-   `src/`
    -   `App.tsx`: Main React component, handles top-level layout and view routing (`SIMULATE` vs. `BUILD`).
    -   `types.ts`: **Single source of truth for all TypeScript types.**
    -   `store/waasStore.ts`: **Zustand store** for all global application state.
    -   `services/`: Core application logic.
        -   `waas/`: The WaaS framework implementation.
            -   `Agent.ts`: The `Agent` class definition.
            -   `Orchestrator.ts`: The main simulation controller.
            -   `Environment.ts`: The `Environment` class.
            -   `ToolRegistry.ts`: A singleton for managing all available tools.
            -   `WorkflowManager.ts`: Manages SOP loading and execution.
            -   `ConversationManager.ts`: Manages agent-to-agent meetings.
            -   `tools/prebuilt.ts`: **Implementations of all pre-built tools.**
            -   `agentLibrary.ts`: Pre-defined agent templates for the visual builder.
        -   `llmService.ts`: A dedicated, rate-limited wrapper for the `@google/genai` (Gemini API).
        -   `db.ts`: IndexedDB persistence logic using `Dexie.js`.
    -   `components/`: React UI components.
        -   `SimulationPage.tsx`: The main UI for running and observing simulations.
        -   `build/`: Components for the visual organization builder view.
        -   Reusable components like `TaskCard.tsx`, `ControlPanel.tsx`, `LogMessage.tsx`, etc.
    -   `demos/`: Pre-configured `OrgConfig` objects that define different organizations and scenarios.
        -   `index.ts`: Exports all available demos.

---

## Getting Started

Follow these steps to run the WaaS application locally.

1.  **Prerequisites**:
    -   Node.js and npm (or yarn).
    -   A Google Gemini API Key.

2.  **Setup**:
    -   Clone the repository: `git clone https://github.com/RolexAlexander/waas.git`
    -   Navigate to the project directory: `cd waas`
    -   Install dependencies: `npm install`

3.  **API Key Configuration**:
    -   The `LLMService` is hard-coded to expect the API key to be available as `process.env.API_KEY` in the execution environment. For development with Vite, create a `.env.local` file in the root of the project:
        ```
        VITE_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    -   The application code will automatically pick this up. **Do not commit your `.env.local` file to version control.**

4.  **Run the Application**:
    -   Start the development server: `npm run dev`
    -   Open your browser to the local address provided (usually `http://localhost:5173`).

---

## How to Extend the Framework

WaaS is designed to be extensible. Here’s how you can add your own custom logic.

### How to Add a New Tool

1.  **Define the Tool**: Open `src/services/waas/tools/prebuilt.ts`. Create a new object that implements the `Tool` interface.
    -   `name`: A unique, snake_case string (e.g., `generate_report_summary`).
    -   `description`: A clear, concise description of what the tool does. The LLM uses this to decide when to use the tool.
    -   `parameters`: Define the arguments the tool expects, using the `@google/genai` `Type` enum for schema definition.
    -   `execute`: Write the async function that contains the tool's logic. It receives the arguments (`args`), the `agent` executing it, the current `task`, and the `environmentState`. It should return a `ToolResult` containing the new state, an optional event, and the result for the task.

2.  **Register the Tool**: In the same file (`prebuilt.ts`), add your new tool object to the `allTools` array at the bottom. The `ToolRegistry` will automatically pick it up.

3.  **Enable the Tool**: To make the tool available in a simulation, add its `name` string to the `tools` array within an `EnvironmentConfig` in one of the demo files (e.g., `src/demos/storybookStudio.ts`).

### How to Build a New Organization / Demo

1.  **Create a Demo File**: Create a new file in `src/demos/` (e.g., `myNewOrg.ts`).
2.  **Define the `OrgConfig`**:
    -   Create and export a constant of type `OrgConfig`.
    -   Define one or more `environments`, specifying their `id`, `initialState`, and the list of `tools` they contain.
    -   Define the `masterAgent` and its `subordinates` in a nested, hierarchical structure. Each agent needs an `id`, `name`, `role`, `permissions`, and the `environmentId` it belongs to.
3.  **(Optional) Add an SOP**:
    -   If your organization has a common, repeatable workflow, define it in the `sopLibrary` array.
    -   Create an `SOP` object with an `id`, `name`, `goal_type` (a keyword to match against task goals), and an array of `steps`.
    -   Each step defines a `task_id`, `description` (which becomes the sub-task's goal), the `assignee_role`, and its `dependencies`.
4.  **Register the Demo**: Open `src/demos/index.ts` and `src/types.ts`.
    -   In `index.ts`, import and export your new demo config.
    -   In `types.ts`, add the key of your new demo to the `DemoKey` union type.
5.  Your new organization will now be available in the "Load Pre-built Organization" dropdown in the UI.

---

## License

This project is licensed under the MIT License.
