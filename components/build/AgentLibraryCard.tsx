import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { AgentConfig, ItemTypes } from '../../types';
import { BriefcaseIcon, UserIcon } from '../icons';

interface AgentLibraryCardProps {
  agentTemplate: Omit<AgentConfig, 'id' | 'subordinates'>;
}

const AgentLibraryCard: React.FC<AgentLibraryCardProps> = ({ agentTemplate }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.AGENT_CARD,
    item: { agentTemplate },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  drag(ref);

  return (
    <div
      ref={ref}
      className={`p-3 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-3 cursor-grab hover:bg-slate-700/50 hover:border-cyan-500 transition-all ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
        <div className="p-2 bg-slate-700 rounded-full">
            <UserIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
            <h4 className="font-bold text-sm text-slate-200">{agentTemplate.role.name}</h4>
            <p className="text-xs text-slate-400">{agentTemplate.name}</p>
        </div>
    </div>
  );
};

export default AgentLibraryCard;
