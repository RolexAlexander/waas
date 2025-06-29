import React, { useState } from 'react';
import { useWaaSStore } from '../store/waasStore';
import { HumanInputRequest } from '../types';
import { ChatAlt2Icon, QuestionMarkCircleIcon, UserIcon } from './icons';

const InputRequestCard: React.FC<{ request: HumanInputRequest }> = ({ request }) => {
    const [response, setResponse] = useState('');
    const provideHumanInput = useWaaSStore(state => state.provideHumanInput);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (response.trim()) {
            provideHumanInput(request.id, response.trim());
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-slate-700 rounded-full mt-1">
                    <UserIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-200">{request.agentName} needs your input:</p>
                    <p className="text-slate-300 text-sm">"{request.question}"</p>
                </div>
            </div>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Provide your response here..."
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-200 text-sm"
                    rows={3}
                />
                <button
                    type="submit"
                    disabled={!response.trim()}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    Submit Response
                </button>
            </form>
        </div>
    );
}


const HumanInputPanel: React.FC = () => {
    const humanInputQueue = useWaaSStore(state => state.humanInputQueue);
    const [isOpen, setIsOpen] = useState(true);

    if (humanInputQueue.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 w-full max-w-sm z-30">
            {isOpen ? (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[70vh]">
                     <div className="flex justify-between items-center p-3 border-b border-slate-700 cursor-pointer" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center gap-2">
                            <QuestionMarkCircleIcon className="w-6 h-6 text-cyan-400" />
                            <h3 className="font-bold text-white">Action Required</h3>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500 text-slate-900">{humanInputQueue.length}</span>
                        </div>
                        <button className="text-slate-400 hover:text-white">&ndash;</button>
                     </div>
                     <div className="p-3 space-y-3 overflow-y-auto">
                        {humanInputQueue.map(request => (
                            <InputRequestCard key={request.id} request={request} />
                        ))}
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                >
                    <QuestionMarkCircleIcon className="w-6 h-6" />
                     <span className="px-2.5 py-1 text-sm font-semibold rounded-full bg-white text-cyan-600">{humanInputQueue.length}</span>
                </button>
            )}
        </div>
    );
};

export default HumanInputPanel;
