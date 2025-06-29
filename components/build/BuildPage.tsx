import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, CanvasNode, Edge, ItemTypes, OrgConfig } from '../../types';
import { AGENT_LIBRARY } from '../../services/waas/agentLibrary';
import AgentLibraryCard from './AgentLibraryCard';
import DraggableAgentNode from './DraggableAgentNode';
import { FileCodeIcon, TrashIcon } from '../icons';
import EditAgentModal from './EditAgentModal';
import { useWaaSStore } from '../../store/waasStore';

const BuildPage: React.FC = () => {
  const { currentConfig, setOrgConfig, setView, clearPersistentState } = useWaaSStore(state => ({
    currentConfig: state.orgConfig,
    setOrgConfig: state.setOrgConfig,
    setView: state.setView,
    clearPersistentState: state.clearPersistentState
  }));

  const [nodes, setNodes] = useState<CanvasNode[]>(() => {
    const flattenedNodes: CanvasNode[] = [];
    const traverse = (agent: AgentConfig, x: number, y: number) => {
        flattenedNodes.push({ id: agent.id, agentConfig: agent, x, y });
        agent.subordinates?.forEach((sub, i) => {
            const yOffset = (agent.subordinates?.length ?? 0) > 1 ? (i - (agent.subordinates!.length - 1) / 2) * 150 : 0;
            traverse(sub, x + 350, y + yOffset);
        });
    };
    traverse(currentConfig.masterAgent, 50, 400);
    return flattenedNodes;
  });

  const [edges, setEdges] = useState<Edge[]>(() => {
    const initialEdges: Edge[] = [];
    const traverse = (agent: AgentConfig) => {
        agent.subordinates?.forEach(sub => {
            initialEdges.push({ from: agent.id, to: sub.id });
            traverse(sub);
        });
    };
    traverse(currentConfig.masterAgent);
    return initialEdges;
  });
  
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  
  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes(produce(draft => {
      const node = draft.find(n => n.id === id);
      if (node) {
        node.x = x;
        node.y = y;
      }
    }));
  }, []);

  const canvasRef = useRef<HTMLElement>(null);

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.AGENT_CARD,
    drop: (item: { agentTemplate: Omit<AgentConfig, 'id'|'subordinates'> }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();

      const newId = uuidv4();
      const newNode: CanvasNode = {
        id: newId,
        agentConfig: { ...item.agentTemplate, id: newId },
        x: offset.x - canvasRect.left,
        y: offset.y - canvasRect.top,
      };
      setNodes(produce(draft => { draft.push(newNode); }));
    },
  }));

  drop(canvasRef);

  const handleLinkStart = (id: string) => setLinkingFrom(id);

  const handleLinkEnd = (toId: string) => {
    if (linkingFrom && linkingFrom !== toId) {
        if (!edges.some(e => e.from === linkingFrom && e.to === toId)) {
            setEdges(produce(draft => {
                draft.push({ from: linkingFrom, to: toId });
            }));
        }
    }
    setLinkingFrom(null);
    setMousePosition(null);
  };
  
  const handleUnlink = (childId: string) => {
    setEdges(prevEdges => prevEdges.filter(e => e.to !== childId));
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
  };
  
  const handleEditNode = (node: CanvasNode) => setEditingNode(node);

  const handleSaveNode = (updatedConfig: AgentConfig) => {
    setNodes(produce(draft => {
        const node = draft.find(n => n.id === updatedConfig.id);
        if (node) {
            node.agentConfig = updatedConfig;
        }
    }));
    setEditingNode(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (linkingFrom && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - canvasRect.left,
            y: e.clientY - canvasRect.top,
        });
    } else if (mousePosition !== null) {
        setMousePosition(null);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset all saved progress and return to the default organization? This cannot be undone.")) {
        clearPersistentState();
    }
  };
  
  const handleTest = () => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const roots = nodes.filter(n => !edges.some(e => e.to === n.id));
    
    if (roots.length !== 1) {
      alert(`Error: Found ${roots.length} master agents (nodes with no parent). There must be exactly one.`);
      return;
    }
    const masterAgentNode = roots[0];

    const buildHierarchy = (agentId: string): AgentConfig => {
        const node = nodeMap.get(agentId)!;
        const subordinateEdges = edges.filter(e => e.from === agentId);
        const subordinates = subordinateEdges.map(e => buildHierarchy(e.to));
        return {
            ...node.agentConfig,
            subordinates: subordinates.length > 0 ? subordinates : undefined,
        };
    };

    const newConfig: OrgConfig = {
        ...currentConfig,
        masterAgent: buildHierarchy(masterAgentNode.id),
    };

    setOrgConfig(newConfig);
    setView('SIMULATE');
  };
  
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  return (
    <div className="flex h-full">
      {/* Agent Library */}
      <aside className="w-[300px] h-full bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col">
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Agent Library</h2>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {AGENT_LIBRARY.map((template, index) => (
              <AgentLibraryCard key={index} agentTemplate={template} />
            ))}
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-slate-700">
            <button
                onClick={handleResetToDefault}
                className="w-full flex items-center justify-center gap-2 bg-red-800/80 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200"
            >
                <TrashIcon className="w-5 h-5"/>
                Reset All Data
            </button>
        </div>
      </aside>

      {/* Canvas */}
      <main ref={canvasRef} onMouseMove={handleMouseMove} onClick={() => setLinkingFrom(null)} className="flex-1 relative bg-slate-900 overflow-hidden">
        {nodes.map(node => {
          const isMaster = !edges.some(e => e.to === node.id);
          const hasParent = edges.some(e => e.to === node.id);
          return (
            <DraggableAgentNode
              key={node.id}
              node={node}
              moveNode={moveNode}
              onLinkStart={handleLinkStart}
              onLinkEnd={handleLinkEnd}
              onDelete={handleDeleteNode}
              onEdit={handleEditNode}
              onUnlink={handleUnlink}
              isLinking={linkingFrom !== null}
              isMaster={isMaster}
              hasParent={hasParent}
            />
          );
        })}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {edges.map((edge, i) => {
                const fromNode = nodeMap.get(edge.from);
                const toNode = nodeMap.get(edge.to);
                if (!fromNode || !toNode) return null;
                return (
                    <line 
                        key={i}
                        x1={fromNode.x + 128} y1={fromNode.y + 40}
                        x2={toNode.x + 128} y2={toNode.y + 40}
                        stroke="rgba(100, 116, 139, 0.5)"
                        strokeWidth="2"
                    />
                )
            })}
             {linkingFrom && nodeMap.get(linkingFrom) && mousePosition && (
                <line 
                    x1={nodeMap.get(linkingFrom)!.x + 128} 
                    y1={nodeMap.get(linkingFrom)!.y + 40} 
                    x2={mousePosition.x} 
                    y2={mousePosition.y} 
                    stroke="#22d3ee" 
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />
            )}
        </svg>

        {/* Floating Action Button */}
        <button 
            onClick={handleTest}
            className="absolute bottom-6 right-6 bg-cyan-600 text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:bg-cyan-500 transition-colors flex items-center gap-2">
            <FileCodeIcon className="w-5 h-5"/>
            Test this Org
        </button>
      </main>

      {editingNode && (
        <EditAgentModal 
            node={editingNode} 
            onClose={() => setEditingNode(null)} 
            onSave={handleSaveNode}
        />
      )}
    </div>
  );
};

export default BuildPage;