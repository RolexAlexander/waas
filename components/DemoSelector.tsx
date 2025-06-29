
import React from 'react';
import { useWaaSStore } from '../store/waasStore.ts';
import { demos } from '../demos/index.ts';
import { DemoKey } from '../types.ts';

const DemoSelector: React.FC = () => {
  const { loadDemo, currentOrgName } = useWaaSStore(state => ({
    loadDemo: state.loadDemo,
    currentOrgName: state.orgConfig.name,
  }));

  const handleDemoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const key = event.target.value as DemoKey;
    if (loadDemo) {
        loadDemo(key);
    }
  };

  const currentDemoKey = Object.keys(demos).find(key => demos[key as DemoKey].name === currentOrgName) || '';

  return (
    <div className="mt-4">
      <label htmlFor="demo-selector" className="block text-sm font-medium text-slate-300 mb-1">
        Load Pre-built Organization
      </label>
      <select
        id="demo-selector"
        value={currentDemoKey}
        onChange={handleDemoChange}
        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-200"
      >
        {Object.entries(demos).map(([key, config]) => (
          <option key={key} value={key}>
            {config.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DemoSelector;
