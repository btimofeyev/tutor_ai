'use client';
import React, { createContext, useContext } from 'react';
import { useProcessingNotifications } from '../hooks/useProcessingNotifications';

const ProcessingNotificationContext = createContext();

export function ProcessingNotificationProvider({ children }) {
  const processingState = useProcessingNotifications();

  return (
    <ProcessingNotificationContext.Provider value={processingState}>
      {children}
    </ProcessingNotificationContext.Provider>
  );
}

export function useProcessingContext() {
  const context = useContext(ProcessingNotificationContext);
  if (!context) {
    throw new Error('useProcessingContext must be used within a ProcessingNotificationProvider');
  }
  return context;
}
