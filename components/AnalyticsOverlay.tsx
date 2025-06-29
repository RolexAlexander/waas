import React from 'react';
import { useWaaSStore } from '../store/waasStore';
import { XCircleIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, CogIcon } from './icons';

const AnalyticsOverlay: React.FC = () => {
  const { metrics, toggleAnalytics } = useWaaSStore(state => ({
    metrics: state.metrics,
    toggleAnalytics: state.toggleAnalytics,
  }));

  if (!metrics) return null;

  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const estimatedCost = (metrics.apiCalls * 0.00015) + (metrics.apiErrors * 0.00001); // Example pricing

  const MetricCard = ({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string | number, unit?: string }) => (
    <div className="bg-slate-800 p-4 rounded-lg flex items-center gap-4">
      <div className="p-2 bg-slate-700 rounded-full text-cyan-400">{icon}</div>
      <div>
        <div className="text-slate-400 text-sm">{label}</div>
        <div className="text-white text-xl font-bold">
            {value} <span className="text-base font-normal text-slate-300">{unit}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={toggleAnalytics}>
      <div 
        className="bg-slate-900/95 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-700 p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Simulation Report</h2>
          <button onClick={toggleAnalytics} className="text-slate-400 hover:text-white">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard icon={<ClockIcon className="w-6 h-6"/>} label="Total Duration" value={duration.toFixed(2)} unit="sec" />
            <MetricCard icon={<CogIcon className="w-6 h-6"/>} label="API Calls" value={metrics.apiCalls} />
            <MetricCard icon={<ExclamationCircleIcon className="w-6 h-6"/>} label="API Errors" value={metrics.apiErrors} />
            <MetricCard icon={<CheckCircleIcon className="w-6 h-6"/>} label="Tasks Completed" value={metrics.completedTasks} />
            <MetricCard icon={<ExclamationCircleIcon className="w-6 h-6"/>} label="Tasks Failed" value={metrics.failedTasks} />
            <MetricCard icon={<span className="text-lg font-bold w-6 h-6 flex items-center justify-center">$</span>} label="Estimated Cost" value={`$${estimatedCost.toFixed(5)}`} />
        </div>

        <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-2">Notes</h3>
            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                <li>Duration is the wall-clock time from simulation start to finish.</li>
                <li>Estimated cost is a rough projection based on sample model prices and may not be accurate.</li>
                <li>Review the Communication Log for detailed agent interactions and decision-making processes.</li>
            </ul>
        </div>

        <div className="mt-6 text-right">
             <button
                onClick={toggleAnalytics}
                className="bg-cyan-600 text-white font-bold py-2 px-5 rounded-md hover:bg-cyan-500 transition-colors"
              >
                Close
              </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverlay;
