
import React from 'react';
import { Event } from '../types';
import { CogIcon } from './icons';

interface EventMessageProps {
  event: Event;
}

const EventMessage: React.FC<EventMessageProps> = ({ event }) => {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50">
      <div className="p-2 bg-slate-700 rounded-full mt-1">
        <CogIcon className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-amber-400 font-mono text-xs font-bold">{event.name}</span>
        </div>
        <div className="mt-1 p-3 bg-slate-900 rounded-md">
          <pre className="text-slate-300 text-xs whitespace-pre-wrap break-all font-sans">
            {typeof event.data === 'object' ? JSON.stringify(event.data, null, 2) : String(event.data)}
          </pre>
        </div>
        <p className="text-right text-xs text-slate-500 mt-1">
          {new Date(event.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default EventMessage;
