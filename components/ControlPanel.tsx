
import React, { useState } from 'react';
import AgentNode from './AgentNode.tsx';
import { LightBulbIcon } from './icons/index.tsx';
import { useWaaSStore } from '../store/waasStore.ts';
import DemoSelector from './DemoSelector.tsx';

const ControlPanel: React.FC = () => {
  const [goal, setGoal] = useState("Create a short, three-chapter children's storybook about a brave mouse who learns to fly.");
  const { orgConfig, isSimulating, simulationCompleted, thinkingAgentId, startSimulation, toggleAnalytics } = useWaaSStore(state => ({
      orgConfig: state.orgConfig,
      isSimulating: state.isSimulating,
      simulationCompleted: state.simulationCompleted,
      thinkingAgentId: state.thinkingAgentId,
      startSimulation: state.startSimulation,
      toggleAnalytics: state.toggleAnalytics
  }));

  const handleStart = () => {
    if (goal.trim() && !isSimulating) {
      startSimulation(goal);
    }
  };
  
  return (
    <div className="w-1/3 min-w-[500px] h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Organization Structure</h2>
        <p className="text-sm text-slate-400">Agents and their reporting lines.</p>
        <DemoSelector />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {orgConfig && <AgentNode agentConfig={orgConfig.masterAgent} isMaster isThinking={thinkingAgentId === orgConfig.masterAgent.name} thinkingAgentId={thinkingAgentId} />}
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <h3 className="font-bold text-white mb-2">Set a Goal</h3>
        <div className="flex flex-col gap-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Write a short book about a magical cat."
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-200"
            rows={3}
            disabled={isSimulating}
          />
          <button
            onClick={handleStart}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            <LightBulbIcon className="w-5 h-5"/>
            {isSimulating ? 'Simulation in Progress...' : 'Start Simulation'}
          </button>
          {simulationCompleted && (
              <button
                onClick={toggleAnalytics}
                className="w-full bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors"
              >
                View Analytics Report
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;