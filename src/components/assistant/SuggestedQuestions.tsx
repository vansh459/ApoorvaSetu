import React, { useRef } from 'react';
import { SUGGESTED_QUESTIONS_BY_ROUTE } from '../../data/platformKnowledgeBase';

interface SuggestedQuestionsProps {
  currentPath: string;
  onSelectQuestion: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  currentPath,
  onSelectQuestion
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find questions matching current route, or fallback to root dashboard questions
  const questions =
    SUGGESTED_QUESTIONS_BY_ROUTE[currentPath] ||
    SUGGESTED_QUESTIONS_BY_ROUTE['/'] || [
      'How do I track application progress?',
      'What are the 6 stages of approval workflow?',
      'What documents are required for compliance?'
    ];

  // Enable mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="px-3 py-1.5 bg-white border-t border-slate-100 shrink-0">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-center space-x-1.5 overflow-x-auto whitespace-nowrap no-scrollbar py-0.5 cursor-grab active:cursor-grabbing"
      >
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="shrink-0 text-xs px-3 py-1 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 hover:scale-[1.02] active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
