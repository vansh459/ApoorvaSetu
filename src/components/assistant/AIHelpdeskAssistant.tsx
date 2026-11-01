import React from 'react';
import { AIChatPanel } from './AIChatPanel';

interface AIHelpdeskAssistantProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIHelpdeskAssistant: React.FC<AIHelpdeskAssistantProps> = ({
  isOpen,
  onOpenChange
}) => (
  <AIChatPanel isOpen={isOpen} onClose={() => onOpenChange(false)} />
);
