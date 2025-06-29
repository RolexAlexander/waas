import { FunctionDeclaration } from '@google/genai';
import { Environment } from './Environment';
import { Conversation, Task, TaskStatus, Tool } from '../../types';

/**
 * Formats a single task into a clean, readable string for an LLM prompt.
 */
export function formatTaskForPrompt(task: Task, memory: string[]): string {
  const lastMessage = task.history[task.history.length - 1]?.message;
  let prompt = `## Your Task ##
**Goal:** ${task.goal}`;

  if (lastMessage) {
    prompt += `\n**Last Update:** ${lastMessage}`;
  }

  if (memory && memory.length > 0) {
      prompt += `\n\n## Your Memories & Past Experiences ##\nTo help you, here are some of your recent memories:\n- ${memory.join('\n- ')}`;
  }

  return prompt;
}

/**
 * Converts an array of internal Tool objects to the FunctionDeclaration format for the LLM.
 */
export function formatToolsForLlm(tools: Tool[]): FunctionDeclaration[] {
    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
    }));
}

/**
 * Formats an Environment into a context block for an LLM prompt.
 */
export function formatEnvironmentForPrompt(environment: Environment, agentRole: string): string {
    const state = environment.getState();
    const availableTools = environment.getToolsForRole(agentRole);

    const toolList = availableTools.map(t => {
        const isPermitted = environment.isToolPermitted(t.name, agentRole);
        return `- ${t.name}:${isPermitted ? '' : ' (public)'} ${t.description}`;
    }).join('\n');

    return `## Your Environment: ${environment.id} ##
**Current State:**
\`\`\`json
${JSON.stringify(state, null, 2)}
\`\`\`

You are a ${agentRole} in this environment.`;
}


/**
 * Formats the results of completed dependency tasks into a context summary.
 */
export function formatResultsForPrompt(dependencyTasks: Task[]): string {
  if (dependencyTasks.length === 0) return "No dependency results.";

  const resultsSummary = dependencyTasks.map(t => {
    let resultString: string;

    if (t.result === undefined || t.result === null) {
      resultString = "No specific result was returned.";
    } else if (typeof t.result === 'string') {
      resultString = t.result;
    } else if (typeof t.result === 'object') {
      // Special handling for image arrays to avoid printing base64 strings
      if (Array.isArray(t.result) && t.result.every(item => typeof item === 'string' && item.startsWith('data:image'))) {
          resultString = `[${t.result.length} illustration(s) generated]`;
      } else {
          resultString = JSON.stringify(t.result, null, 2);
      }
    } else {
      resultString = String(t.result);
    }
    
    return `### Result from: ${t.assignee} ###
- **Task Goal:** ${t.originalGoal}
- **Task ID:** ${t.id}
- **Result Output:**
\`\`\`
${resultString}
\`\`\``;
  }).join('\n\n');

  return `## Context from Completed Dependencies ##
The following tasks that you depended on are now complete. Use their results to inform your next action.

${resultsSummary}`;
}


/**
 * Creates a formatted failure report for a manager when a subordinate's task fails permanently.
 */
export function formatFailureForPrompt(parentTaskOriginalGoal: string, failedTask: Task): string {
  const lastError = failedTask.history.find(h => h.status === TaskStatus.FAILED || h.status === TaskStatus.BLOCKED)
                    ?.message || "No specific error message was recorded.";

  return `## Critical Task Failure Escalation ##
**Your original high-level goal was:** "${parentTaskOriginalGoal}"

A critical sub-task assigned to one of your subordinates has failed and could not be automatically retried. You must now intervene.

**Failed Sub-Task Details:**
- **Goal:** "${failedTask.originalGoal}"
- **Assignee:** ${failedTask.assignee}
- **Last Recorded Error:** "${lastError}"

**Your Immediate Task:**
Analyze the failure and decide on the next course of action. Your options are:
1.  Use the 'start_conversation' tool with relevant participants (e.g., yourself, the assignee) to brainstorm a solution.
2.  Formulate a new recovery plan yourself and delegate new tasks.
3.  Decide the project cannot be salvaged and respond with a final failure analysis, explaining why.`;
}

/**
 * Formats a Conversation's history and topic into a prompt for a participating agent.
 */
export function formatMeetingForPrompt(chat: Conversation, agentName: string, agentRole: string): string {
  const history = chat.history.map(m => `${m.agentName}: ${m.message}`).join('\n');

  return `You are ${agentName}, the ${agentRole}. You are currently in a meeting to resolve a problem.

## Meeting Topic/Problem ##
${chat.topic}

## Conversation History ##
${history.length > 0 ? history : '(No messages yet. You are the first to speak.)'}

## Your Task ##
Based on the conversation so far and your role as ${agentRole}, provide your input, suggestion, or analysis to help resolve the issue. Be concise and collaborative. Address other participants if necessary.
Your response:`;
}
