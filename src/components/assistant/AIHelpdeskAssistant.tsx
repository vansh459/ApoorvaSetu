import React, { useState } from 'react';
import { AIHelpdeskButton } from './AIHelpdeskButton';
import { AIChatPanel } from './AIChatPanel';

export const AIHelpdeskAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleToggle = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  return (
    <>
      {/* Floating Chat Panel */}
      {isOpen && !isMinimized && (
        <AIChatPanel
          isOpen={isOpen && !isMinimized}
          onClose={handleClose}
          onMinimize={handleMinimize}
        />
      )}

      {/* Floating Action Button */}
      <AIHelpdeskButton
        isOpen={isOpen && !isMinimized}
        onClick={handleToggle}
      />
    </>
  );
};

