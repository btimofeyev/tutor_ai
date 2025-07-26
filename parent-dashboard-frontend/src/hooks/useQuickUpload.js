import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import api from '../utils/api';

export function useQuickUpload(childId, refreshChildData) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError } = useToast();

  const processQuickUpload = useCallback(async (files) => {
    if (!childId || !files || files.length === 0) {
      showError('No files to process');
      return false;
    }

    setIsProcessing(true);
    const formData = new FormData();
    
    // Add files to FormData
    files.forEach((fileData, index) => {
      formData.append('files', fileData.file);
      
      // Add metadata for each file
      formData.append(`metadata_${index}`, JSON.stringify({
        subject: fileData.subject,
        chapter: fileData.chapter,
        materialType: fileData.materialType,
        dueDate: convertDueDateToISO(fileData.dueDate),
        originalName: fileData.name
      }));
    });

    formData.append('child_id', childId);
    formData.append('fileCount', files.length);

    try {
      const response = await api.post('/materials/quick-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const { created, scheduled, failed } = response.data.results;
        
        if (created > 0) {
          showSuccess(
            `Great! Added ${created} assignments to ${files[0].subject}'s schedule.` +
            (scheduled > 0 ? ` ${scheduled} items scheduled.` : '') +
            (failed > 0 ? ` ${failed} items need attention.` : '')
          );
        }

        // Refresh the child's data to show new materials
        if (refreshChildData) {
          await refreshChildData();
        }

        return true;
      } else {
        showError(response.data.message || 'Failed to process files');
        return false;
      }
    } catch (error) {
      console.error('Quick upload error:', error);
      showError(error.response?.data?.message || 'Failed to upload files. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [childId, showSuccess, showError, refreshChildData]);

  // Helper function to convert friendly due dates to ISO format
  const convertDueDateToISO = (friendlyDate) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    friday.setDate(today.getDate() + daysUntilFriday);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    switch (friendlyDate) {
      case 'Today':
        return today.toISOString().split('T')[0];
      case 'Tomorrow':
        return tomorrow.toISOString().split('T')[0];
      case 'Friday':
        return friday.toISOString().split('T')[0];
      case 'This Week':
        return friday.toISOString().split('T')[0]; // Default to Friday
      case 'Next Week':
        return nextWeek.toISOString().split('T')[0];
      default:
        return tomorrow.toISOString().split('T')[0]; // Default to tomorrow
    }
  };

  return {
    processQuickUpload,
    isProcessing
  };
}