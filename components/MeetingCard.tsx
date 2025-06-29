import React from 'react';
import { Conversation } from '../types';
import { UserIcon, CheckCircleIcon, CogIcon } from './icons';

const ConversationCard: React.FC<{ chat: Conversation }> = ({ chat }) => {
  const statusConfig = {
    ACTIVE: {
      text: 'Active',
      icon: <CogIcon className="w-4 h-4 text-cyan-400 animate-spin" />,
      color: 'bg-cyan-900/50 border-cyan-500',
    },
    RESOLVED: {
      text: 'Resolved',
      icon: <CheckCircleIcon className="w-4 h-4 text-green-400" />,
      color: 'bg-slate-800/80 border-slate-700',
    },
  };

  const currentStatus = statusConfig[chat.status];

  return (
    <div className={`rounded-lg border shadow-lg ${currentStatus.color}`}>
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex justify-between items-center">
            <div>
                 <p className="text-xs text-slate-400">Conversation Topic</p>
                 <h3 className="font-bold text-slate-100">{chat.topic}</h3>
            </div>
            <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${chat.status === 'ACTIVE' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-green-500/10 text-green-300'}`}>
                {currentStatus.icon}
                <span>{currentStatus.text}</span>
            </div>
        </div>

        <div className="mt-3">
          <p className="text-xs text-slate-400 mb-1">Participants</p>
          <div className="flex items-center gap-2">
            {chat.participants.map(p => (
              <div key={p} className="flex items-center gap-1.5 bg-slate-700/50 px-2 py-1 rounded-md text-sm text-slate-300" title={p === chat.initiator ? "Initiator" : "Participant"}>
                <UserIcon className={`w-4 h-4 ${p === chat.initiator ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-4">
            {chat.history.length > 0 ? chat.history.map((msg, index) => (
                <div key={index} className="flex flex-col items-start">
                    <p className="text-xs font-bold text-slate-300">{msg.agentName}</p>
                    <div className="mt-1 w-auto max-w-[90%] bg-slate-900/70 p-3 rounded-lg">
                        <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans">
                            {msg.message}
                        </pre>
                    </div>
                </div>
            )) : <p className="text-slate-500 text-sm text-center py-4">The conversation has started. Waiting for the first response...</p>}
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;