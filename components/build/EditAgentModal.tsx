import React, { useState } from 'react';
import { produce } from 'immer';
import { AgentConfig, CanvasNode } from '../../types';
import { XCircleIcon } from '../icons';

interface EditAgentModalProps {
  node: CanvasNode;
  onClose: () => void;
  onSave: (updatedConfig: AgentConfig) => void;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({ node, onClose, onSave }) => {
  const [name, setName] = useState(node.agentConfig.name);
  const [description, setDescription] = useState(node.agentConfig.role.description);

  const handleSave = () => {
    const updatedConfig = produce(node.agentConfig, draft => {
        draft.name = name;
        draft.role.description = description;
    });
    onSave(updatedConfig);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Agent: <span className="text-cyan-400">{node.agentConfig.role.name}</span></h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="agent-name" className="block text-sm font-medium text-slate-300 mb-1">Agent Name</label>
            <input
              type="text"
              id="agent-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="role-desc" className="block text-sm font-medium text-slate-300 mb-1">Role Description</label>
            <textarea
              id="role-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAgentModal;