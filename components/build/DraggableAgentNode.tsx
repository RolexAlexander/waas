import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { AgentConfig, ItemTypes, CanvasNode } from '../../types';
import { UserIcon, PencilIcon, TrashIcon, XCircleIcon } from '../icons';

interface DraggableAgentNodeProps {
  node: CanvasNode;
  moveNode: (id: string, x: number, y: number) => void;
  onLinkStart: (id: string) => void;
  onLinkEnd: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (node: CanvasNode) => void;
  onUnlink: (id: string) => void;
  isLinking: boolean;
  isMaster: boolean;
  hasParent: boolean;
}

const DraggableAgentNode: React.FC<DraggableAgentNodeProps> = ({ node, moveNode, onLinkStart, onLinkEnd, onDelete, onEdit, onUnlink, isLinking, isMaster, hasParent }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANVAS_NODE,
    item: { id: node.id, x: node.x, y: node.y },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.CANVAS_NODE,
    drop: (item: { id: string; x: number; y: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      const left = Math.round(item.x + delta.x);
      const top = Math.round(item.y + delta.y);
      moveNode(item.id, left, top);
      return undefined;
    },
  }));

  drag(drop(ref));

  const handleClick = () => {
    if (isLinking) {
        onLinkEnd(node.id);
    }
  }

  return (
    <div
      ref={ref}
      style={{ left: node.x, top: node.y }}
      className={`absolute p-4 rounded-lg shadow-lg transition-all duration-300 w-64 cursor-move flex flex-col items-center group
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isMaster ? 'bg-cyan-900/50 border-2 border-cyan-500' : 'bg-slate-800 border border-slate-700'}
        ${isLinking ? 'cursor-crosshair ring-2 ring-blue-500' : ''}
      `}
      onClick={handleClick}
    >
      {/* Controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!isMaster && (
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                className="p-1 rounded-full bg-red-600/80 text-white hover:bg-red-500"
                title="Delete Agent"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        )}
        <button
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            className="p-1 rounded-full bg-slate-600/80 text-white hover:bg-slate-500"
            title="Edit Agent"
        >
            <PencilIcon className="w-4 h-4" />
        </button>
      </div>

      <div className={`absolute -top-3 px-2 py-0.5 text-xs rounded-full 
          ${isMaster ? 'bg-cyan-500 text-slate-900 font-bold' : 'bg-slate-600 text-slate-200'}
        `}>
        {node.agentConfig.role.name}
      </div>
       <div className="flex items-center gap-3 w-full">
          <div className="p-2 bg-slate-700 rounded-full">
            <UserIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-100">{node.agentConfig.name}</h3>
            <p className="text-xs text-slate-400">{node.agentConfig.role.description}</p>
          </div>
        </div>

      {/* Link handles */}
      <div className="absolute -bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onLinkStart(node.id); }}
          className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500"
          title="Link to subordinate"
          >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
         {hasParent && (
            <button
                onClick={(e) => { e.stopPropagation(); onUnlink(node.id); }}
                className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center hover:bg-amber-500"
                title="Unlink from parent"
            >
               <XCircleIcon className="w-5 h-5 text-white" />
            </button>
        )}
      </div>
    </div>
  );
};

export default DraggableAgentNode;