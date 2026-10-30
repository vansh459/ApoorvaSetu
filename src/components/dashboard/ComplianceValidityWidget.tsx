import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, FileClock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { complianceSummaryData } from '../../data/initialData';

export const ComplianceValidityWidget: React.FC = () => {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'file-text':
        return <FileText className="w-4 h-4" />;
      case 'file-check':
        return <FileClock className="w-4 h-4" />;
      case 'alert-circle':
        return <AlertCircle className="w-4 h-4" />;
      case 'check-circle-2':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Compliance & Document Validity
          </h2>
        </div>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          View All
        </button>
      </div>

      {/* Items List matching screenshot */}
      <div className="space-y-2.5 my-auto">
        {complianceSummaryData.map((item) => (
          <div
            key={item.label}
            onClick={() => navigate('/compliance')}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${item.color}15`,
                  color: item.color
                }}
              >
                {getIcon(item.icon)}
              </div>
              <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                {item.label}
              </span>
            </div>

            <span className="text-sm font-bold text-slate-900 shrink-0 ml-3">
              {item.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
