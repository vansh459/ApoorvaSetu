import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let bgClasses = 'bg-slate-900 text-white border-slate-700';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          bgClasses = 'bg-emerald-950 text-emerald-100 border-emerald-800/80';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          bgClasses = 'bg-rose-950 text-rose-100 border-rose-800/80';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          bgClasses = 'bg-amber-950 text-amber-100 border-amber-800/80';
        } else if (toast.type === 'info') {
          Icon = Info;
          bgClasses = 'bg-blue-950 text-blue-100 border-blue-800/80';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-toast ${bgClasses}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs font-medium leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
