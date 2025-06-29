
import React from 'react';
import { Task, TaskStatus } from '../types';
import { CheckCircleIcon, CogIcon, UserIcon, LightBulbIcon, ClockIcon, ExclamationCircleIcon, QuestionMarkCircleIcon, FileCodeIcon } from './icons';

interface TaskCardProps {
  task: Task;
}

const statusStyles: Record<TaskStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  [TaskStatus.PENDING]: { bg: 'bg-slate-600', text: 'text-slate-200', icon: <CogIcon className="w-4 h-4 animate-[spin_3s_linear_infinite]" /> },
  [TaskStatus.IN_PROGRESS]: { bg: 'bg-blue-600', text: 'text-blue-100', icon: <CogIcon className="w-4 h-4 animate-spin" /> },
  [TaskStatus.COMPLETED]: { bg: 'bg-green-600', text: 'text-green-100', icon: <CheckCircleIcon className="w-4 h-4" /> },
  [TaskStatus.FAILED]: { bg: 'bg-red-600', text: 'text-red-100', icon: <ExclamationCircleIcon className="w-4 h-4"/> },
  [TaskStatus.BLOCKED]: { bg: 'bg-yellow-600', text: 'text-yellow-100', icon: <UserIcon className="w-4 h-4"/> },
  [TaskStatus.AWAITING_INPUT]: { bg: 'bg-purple-600', text: 'text-purple-100', icon: <QuestionMarkCircleIcon className="w-4 h-4" /> },
  [TaskStatus.WAITING_FOR_DEPENDENCY]: { bg: 'bg-amber-600', text: 'text-amber-100', icon: <ClockIcon className="w-4 h-4" /> },
};

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { bg, text, icon } = statusStyles[task.status];
  const hasResult = task.status === TaskStatus.COMPLETED && task.result;
  const hasCodeFiles = hasResult && typeof task.result === 'object' && task.result !== null && Array.isArray(task.result.files);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col shadow-md hover:border-cyan-500 transition-colors duration-200">
      <div className="flex-1">
        <p className="text-slate-200 font-medium">{task.goal}</p>
        
        {hasResult && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <h4 className="text-xs font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
                <LightBulbIcon className="w-4 h-4" />
                Result
            </h4>
            { hasCodeFiles ? (
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-md">
                    {task.result.files.map((file: { filename: string; code: string }, index: number) => (
                    <div key={index} className="bg-slate-900/70 p-2 rounded-md">
                        <p className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-1">
                        <FileCodeIcon className="w-4 h-4" />
                        {file.filename}
                        </p>
                        <pre className="text-xs bg-slate-900 p-2 rounded-md text-slate-300 whitespace-pre-wrap break-all font-mono">
                        {file.code}
                        </pre>
                    </div>
                    ))}
                </div>
            ) :
              (typeof task.result === 'object' && task.result !== null && Array.isArray(task.result.illustrations)) ? (
                <div className='space-y-2'>
                  {task.result.story && <p className='text-sm text-slate-300 mb-2 p-2 bg-slate-900 rounded-md font-sans whitespace-pre-wrap'>{task.result.story}</p>}
                  <div className='grid grid-cols-2 gap-2'>
                    {task.result.illustrations.map((img: string, index: number) => (
                      <img key={index} src={img} alt={`Illustration ${index + 1}`} className="rounded-md object-cover aspect-square" />
                    ))}
                  </div>
                </div>
              ) : (Array.isArray(task.result) && task.result.every(item => typeof item === 'string' && item.startsWith('data:image'))) ? (
                 <div className='grid grid-cols-2 gap-2'>
                    {task.result.map((img, index) => (
                      <img key={index} src={img} alt={`Illustration ${index + 1}`} className="rounded-md object-cover aspect-square" />
                    ))}
                  </div>
              ) : (
                <pre className="text-xs bg-slate-900 p-2 rounded-md text-slate-300 whitespace-pre-wrap break-all font-mono">
                    {typeof task.result === 'object' ? JSON.stringify(task.result, null, 2) : String(task.result)}
                </pre>
              )
            }
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-sm mt-4">
        <div className="flex items-center gap-2 text-slate-400">
          <UserIcon className="w-4 h-4" />
          <span>{task.assignee || 'Unassigned'}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
          {icon}
          <span>{task.status.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
