import React from 'react';
import { EnvironmentState } from '../types';
import { BriefcaseIcon } from './icons';

interface EnvironmentDisplayProps {
    environments: Record<string, EnvironmentState>;
}

const EnvironmentCard: React.FC<{ envId: string, envState: EnvironmentState }> = ({ envId, envState }) => {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg flex flex-col shadow-md">
            <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                    <BriefcaseIcon className="w-6 h-6" />
                    {envId}
                </h3>
            </div>
            <div className="p-4 flex-1">
                <pre className="text-xs bg-slate-900 p-3 rounded-md text-slate-300 whitespace-pre-wrap break-all font-mono max-h-96 overflow-y-auto">
                    {JSON.stringify(envState, null, 2)}
                </pre>
            </div>
        </div>
    )
}

const EnvironmentDisplay: React.FC<EnvironmentDisplayProps> = ({ environments }) => {
    const envEntries = Object.entries(environments);

    if (envEntries.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500">
                <p>No environments are configured for this simulation.</p>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {envEntries.map(([id, state]) => (
                <EnvironmentCard key={id} envId={id} envState={state} />
            ))}
        </div>
    );
};

export default EnvironmentDisplay;