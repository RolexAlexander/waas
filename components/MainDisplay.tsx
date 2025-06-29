
import React, { useState } from 'react';
import { Mail, Task, Conversation, EnvironmentState, Event } from '../types';
import TaskCard from './TaskCard';
import LogMessage from './LogMessage';
import EventMessage from './EventMessage';
import ConversationDisplay from './MeetingDisplay';
import EnvironmentDisplay from './EnvironmentDisplay';
import { ListIcon, ChatAlt2Icon, UserIcon, BriefcaseIcon, CogIcon } from './icons';

interface MainDisplayProps {
  tasks: Task[];
  logs: Mail[];
  conversations: Conversation[];
  environments: Record<string, EnvironmentState>;
  events: Event[];
}

type View = 'tasks' | 'environment' | 'conversations' | 'logs' | 'environment_log';

const MainDisplay: React.FC<MainDisplayProps> = ({ tasks, logs, conversations, environments, events }) => {
  const [view, setView] = useState<View>('tasks');

  const getStatusColor = (viewName: View) => {
    return view === viewName ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white';
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex p-2 border-b border-slate-700 bg-slate-800/50">
        <button 
            onClick={() => setView('tasks')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${getStatusColor('tasks')}`}
        >
            <ListIcon className="w-5 h-5" />
            Task Board
        </button>
        <button 
            onClick={() => setView('environment')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${getStatusColor('environment')}`}
        >
            <BriefcaseIcon className="w-5 h-5" />
            Environment
        </button>
        <button 
            onClick={() => setView('conversations')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${getStatusColor('conversations')}`}
        >
            <UserIcon className="w-5 h-5" />
            Conversations
            {conversations.filter(c => c.status === 'ACTIVE').length > 0 && 
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500 text-slate-900">
                {conversations.filter(c => c.status === 'ACTIVE').length}
              </span>
            }
        </button>
        <button 
            onClick={() => setView('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${getStatusColor('logs')}`}
        >
            <ChatAlt2Icon className="w-5 h-5" />
            Communication Log
        </button>
        <button 
            onClick={() => setView('environment_log')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${getStatusColor('environment_log')}`}
        >
            <CogIcon className="w-5 h-5" />
            Environment Log
        </button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
        {view === 'tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
        {view === 'environment' && <EnvironmentDisplay environments={environments} />}
        {view === 'conversations' && <ConversationDisplay conversations={conversations} />}
        {view === 'logs' && (
          <div className="space-y-4">
            {logs.length > 0 ? logs.map(log => <LogMessage key={log.id} mail={log} />) : 
              <div className="text-center py-10 text-slate-500">
                <p>No communications yet. Start a simulation to see the logs.</p>
              </div>
            }
          </div>
        )}
        {view === 'environment_log' && (
          <div className="space-y-4">
            {events.length > 0 ? events.map((event, i) => <EventMessage key={`${event.name}-${event.timestamp}-${i}`} event={event} />) : 
              <div className="text-center py-10 text-slate-500">
                <p>No environment events yet. Events will appear here when agents use tools that modify the environment.</p>
              </div>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default MainDisplay;
