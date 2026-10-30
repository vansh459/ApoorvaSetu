import React from 'react';
import { Sparkles } from 'lucide-react';
import { SUGGESTED_QUESTIONS_BY_ROUTE } from '../../data/platformKnowledgeBase';

interface SuggestedQuestionsProps {
  currentPath: string;
  onSelectQuestion: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  currentPath,
  onSelectQuestion
}) => {
  // Find questions matching current route, or fallback to root dashboard questions
  const questions =
    SUGGESTED_QUESTIONS_BY_ROUTE[currentPath] ||
    SUGGESTED_QUESTIONS_BY_ROUTE['/'] || [
      'How do I track application progress?',
      'What are the 6 stages of approval workflow?',
      'What documents are required for compliance?'
    ];

  return (
    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/70">
      <div className="flex items-center space-x-1.5 mb-1.5 text-[11px] font-semibold text-slate-500">
        <Sparkles className="w-3 h-3 text-teal-600" />
        <span>Suggested Questions</span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 text-slate-600 transition-all cursor-pointer shadow-2xs whitespace-normal"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
