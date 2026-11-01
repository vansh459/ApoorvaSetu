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
    <div className="shrink-0 border-t border-line bg-surface px-3 py-2">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="no-scrollbar flex cursor-grab items-center gap-1.5 overflow-x-auto whitespace-nowrap py-0.5 active:cursor-grabbing"
      >
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="shrink-0 rounded-pill bg-surface-2 px-3 py-1 text-xs text-ink-2 transition-colors duration-150 hover:bg-accent-soft hover:text-accent active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
