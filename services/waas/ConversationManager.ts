import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { Conversation, Task, TaskStatus } from "../../types";
import { MailSystem } from "./MailSystem";

const MAX_CONVERSATION_TURNS = 2; // Each participant gets to speak this many times

export class ConversationManager {
    private conversations: Record<string, Conversation> = {};
    private mailSystem: MailSystem;
    private onConversationsUpdate: (conversations: Conversation[]) => void;
    private getTaskById: (id: string) => Task | undefined;
    private updateTask: (task: Task) => void;

    constructor(
        mailSystem: MailSystem,
        getTaskById: (id: string) => Task | undefined,
        updateTask: (task: Task) => void,
        onConversationsUpdate: (conversations: Conversation[]) => void
    ) {
        this.mailSystem = mailSystem;
        this.getTaskById = (id: string) => {
            const tasks = getTaskById(id);
            // This is a simplified way to find the task, assuming getTaskById can be adapted.
            // In a real scenario, the orchestrator would provide a direct lookup.
            return Array.isArray(tasks) ? tasks.find(t=>t.id === id) : tasks;
        }
        this.updateTask = updateTask;
        this.onConversationsUpdate = onConversationsUpdate;
    }

    public reset() {
        this.conversations = {};
        this.onConversationsUpdate([]);
    }

    private updateConversation(conversation: Conversation) {
        this.conversations = produce(this.conversations, draft => {
            draft[conversation.id] = conversation;
        });
        this.onConversationsUpdate(Object.values(this.conversations));
    }

    public startConversation(parentTaskId: string, topic: string, participants: string[]) {
        const initiator = this.getTaskById(parentTaskId)?.assignee;
        if (!initiator) {
            console.error("Cannot start conversation: initiator not found for task", parentTaskId);
            return;
        }

        const conversation: Conversation = {
            id: uuidv4(),
            parentTaskId,
            topic,
            participants,
            history: [],
            status: 'ACTIVE',
            initiator
        };
        
        this.updateConversation(conversation);
        this.advanceConversation(conversation.id, 'System', 'Conversation started.');
    }

    public advanceConversation(conversationId: string, fromAgent: string, message: string) {
        const conversation = this.conversations[conversationId];
        if (!conversation || conversation.status === 'RESOLVED') return;

        const updatedConversation = produce(conversation, draft => {
            if(fromAgent !== 'System') { // Don't log the initial system message
              draft.history.push({ agentName: fromAgent, message, timestamp: Date.now() });
            }
        });
        this.updateConversation(updatedConversation);
        
        const turnsTaken = updatedConversation.history.length;
        const maxTurns = updatedConversation.participants.length * MAX_CONVERSATION_TURNS;

        if (turnsTaken >= maxTurns) {
            this.endConversation(conversationId, "turn_limit");
            return;
        }

        const nextSpeakerIndex = turnsTaken % updatedConversation.participants.length;
        const nextSpeaker = updatedConversation.participants[nextSpeakerIndex];

        this.mailSystem.send(nextSpeaker, {
            from: conversation.initiator,
            subject: 'CONVERSATION_TURN',
            body: updatedConversation
        });
    }

    public endConversation(conversationId: string, reason: "turn_limit" | "user_decision") {
        const conversation = this.conversations[conversationId];
        if (!conversation) return;

        this.mailSystem.send(conversation.initiator, {
            from: "System",
            subject: 'SUMMARIZE_CONVERSATION',
            body: conversation
        });

        const updatedConversation = produce(conversation, draft => {
            draft.status = 'RESOLVED';
        });
        this.updateConversation(updatedConversation);
    }
}
