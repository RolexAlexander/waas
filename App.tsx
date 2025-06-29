import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Header from './components/Header';
import SimulationPage from './components/SimulationPage';
import BuildPage from './components/build/BuildPage';
import { useWaaSStore } from './store/waasStore';

const App: React.FC = () => {
  const { view, orgConfig } = useWaaSStore(state => ({ view: state.view, orgConfig: state.orgConfig }));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 h-[calc(100vh-80px)]">
            {view === 'SIMULATE' && <SimulationPage />}
            {view === 'BUILD' && <BuildPage />}
        </main>
      </div>
    </DndProvider>
  );
};

export default App;