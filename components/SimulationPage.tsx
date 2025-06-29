
import React from 'react';
import { useWaaSStore } from '../store/waasStore';
import ControlPanel from './ControlPanel';
import MainDisplay from './MainDisplay';
import AnalyticsOverlay from './AnalyticsOverlay';
import HumanInputPanel from './HumanInputPanel';

const SimulationPage: React.FC = () => {
  const { tasks, logs, conversations, environments, showAnalytics, events } = useWaaSStore(state => ({
    tasks: state.tasks,
    logs: state.logs,
    conversations: state.conversations,
    environments: state.environments,
    showAnalytics: state.showAnalytics,
    events: state.events,
  }));
  
  return (
    <div className="flex flex-1 h-full relative">
      <ControlPanel />
      <MainDisplay tasks={tasks} logs={logs} conversations={conversations} environments={environments} events={events} />
      {showAnalytics && <AnalyticsOverlay />}
      <HumanInputPanel />
    </div>
  );
};

export default SimulationPage;
