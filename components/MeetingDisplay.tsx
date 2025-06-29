import React from 'react';
import { Conversation } from '../types';
import ConversationCard from './MeetingCard';

interface ConversationDisplayProps {
    conversations: Conversation[];
}

const ConversationDisplay: React.FC<ConversationDisplayProps> = ({ conversations }) => {
    if (conversations.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500">
                <p>No conversations have been started yet.</p>
                <p className="text-sm">Conversations will appear here when an agent uses the `start_conversation` tool.</p>
            </div>
        )
    }
  return (
    <div className="space-y-6">
      {conversations.map(chat => (
        <ConversationCard key={chat.id} chat={chat} />
      ))}
    </div>
  );
};

export default ConversationDisplay;