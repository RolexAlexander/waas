import React from 'react';
import { View } from '../types';
import { useWaaSStore } from '../store/waasStore';

const Header: React.FC = () => {
    const currentView = useWaaSStore(state => state.view);
    const setView = useWaaSStore(state => state.setView);
    
    const getButtonClass = (view: View) => {
        return currentView === view
            ? 'bg-cyan-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600';
    };

    return (
        <header className="p-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-cyan-400">
                    WaaS - Workforce as a Service
                </h1>
                <p className="text-slate-400 text-sm">
                    An AI-driven framework for autonomous organizational simulation.
                </p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg">
                <button 
                    onClick={() => setView('SIMULATE')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${getButtonClass('SIMULATE')}`}
                >
                    Simulate
                </button>
                <button 
                    onClick={() => setView('BUILD')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${getButtonClass('BUILD')}`}
                >
                    Build
                </button>
            </div>
        </header>
    );
};

export default Header;