import React from 'react';
import { AgentConfig } from '../types';
import { BriefcaseIcon, UserIcon } from './icons';

interface AgentNodeProps {
  agentConfig: AgentConfig;
  isMaster?: boolean;
  isThinking?: boolean;
  thinkingAgentId?: string | null;
}

const AgentNode: React.FC<AgentNodeProps> = ({ agentConfig, isMaster = false, isThinking = false, thinkingAgentId }) => {
  return (
    <div className="flex items-start">
      <div className={`relative flex flex-col items-center p-4 rounded-lg shadow-lg transition-all duration-300 w-64
        ${isMaster ? 'bg-cyan-900/50 border-2 border-cyan-500' : 'bg-slate-800 border border-slate-700'}
        ${isThinking ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''}
      `}>
        <div className={`absolute -top-3 px-2 py-0.5 text-xs rounded-full 
          ${isMaster ? 'bg-cyan-500 text-slate-900 font-bold' : 'bg-slate-600 text-slate-200'}
        `}>
          {agentConfig.role.name}
        </div>
        <div className="flex items-center gap-3 w-full">
          <div className="p-2 bg-slate-700 rounded-full">
            <UserIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-100">{agentConfig.name}</h3>
            <p className="text-xs text-slate-400">{agentConfig.role.description}</p>
          </div>
        </div>
      </div>
      {agentConfig.subordinates && agentConfig.subordinates.length > 0 && (
        <div className="ml-12 mt-6 pl-8 border-l-2 border-slate-700">
          <div className="flex flex-col gap-8 relative">
             {/* Vertical line connector */}
             <div className="absolute left-[-33px] top-0 h-full w-px bg-slate-700"></div>

            {agentConfig.subordinates.map((sub, index) => (
              <div key={sub.id} className="relative">
                {/* Horizontal line connector */}
                <div className="absolute left-[-32px] top-1/2 h-px w-8 bg-slate-700"></div>
                <AgentNode 
                  agentConfig={sub} 
                  isThinking={thinkingAgentId === sub.name}
                  thinkingAgentId={thinkingAgentId}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentNode;