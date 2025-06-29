
import React from 'react';
import { Mail } from '../types';
import { ArrowRightIcon, MailIcon } from './icons';

interface LogMessageProps {
  mail: Mail;
}

const LogMessage: React.FC<LogMessageProps> = ({ mail }) => {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50">
      <div className="p-2 bg-slate-700 rounded-full mt-1">
        <MailIcon className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-slate-200">{mail.from}</span>
          <ArrowRightIcon className="w-4 h-4 text-slate-500" />
          <span className="text-slate-200">{mail.to}</span>
        </div>
        <div className="mt-1 p-3 bg-slate-900 rounded-md">
          <p className="text-cyan-400 font-mono text-xs font-bold">{mail.subject}</p>
          <pre className="text-slate-300 text-xs whitespace-pre-wrap break-all font-sans mt-1">
            {typeof mail.body === 'object' ? JSON.stringify(mail.body, null, 2) : mail.body}
          </pre>
        </div>
        <p className="text-right text-xs text-slate-500 mt-1">
          {new Date(mail.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default LogMessage;