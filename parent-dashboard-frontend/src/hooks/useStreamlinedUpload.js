import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import api, { uploadApi } from '../utils/api';

export function useStreamlinedUpload(childId, onComplete) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useToast();

  const processUpload = useCallback(async (files, metadata = {}) => {
    if (!childId || !files || files.length === 0) {
      setError('No files to process');
      return { success: false, error: 'No files to process' };
    }

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Add files to FormData
      files.forEach((fileData, index) => {
        // Handle both file objects and processed file data
        const file = fileData.file || fileData;
        formData.append('files', file);

        // Add metadata for each file
        const fileMetadata = {
          subject: fileData.subject || metadata.subject,
          subjectId: fileData.subjectId || metadata.subjectId,
          chapter: fileData.chapter || metadata.chapter,
          lesson: fileData.lesson || metadata.lesson,
          materialType: fileData.materialType || metadata.materialType,
          dueDate: fileData.dueDate || metadata.dueDate,
          originalName: file.name,
          enableAiAnalysis: fileData.enableAiAnalysis || metadata.enableAiAnalysis || false
        };

        formData.append(`metadata_${index}`, JSON.stringify(fileMetadata));
      });

      formData.append('child_id', childId);
      formData.append('fileCount', files.length);

      // Add additional fields for AI analysis
      formData.append('child_subject_id', metadata.subjectId || files[0]?.subjectId);
      formData.append('user_content_type', metadata.materialType || files[0]?.materialType);
      formData.append('lesson_id', metadata.lesson || files[0]?.lesson);
      formData.append('title', metadata.title || files[0]?.name?.split('.')[0] || 'Untitled');
      formData.append('content_type', metadata.materialType || files[0]?.materialType);
      formData.append('due_date', metadata.dueDate || '');

      // Use async endpoint for background processing if specified
      const useAsync = metadata.useAsyncProcessing === true;
      const endpoint = useAsync ? '/materials/upload-async' : '/materials/upload';

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await uploadApi.post(endpoint, formData, {
        timeout: 120000, // 2 minutes timeout for AI processing
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (useAsync) {
        // Async endpoint returns { success: true, material_id: ... }
        if (response.data.success) {
          return {
            success: true,
            isAsync: true,
            material_id: response.data.material_id,
            material: response.data.material
          };
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      } else {
        // Sync endpoint returns { lesson_json: ... }
        if (response.data.lesson_json) {
          return {
            success: true,
            needsReview: true,
            analysisData: response.data.lesson_json
          };
        } else {
          throw new Error('AI analysis failed - no data returned');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload files. Please try again.';
      setError(errorMessage);
      showError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, [childId, showSuccess, showError]);

  const approveAiAnalysis = useCallback(async (analysisData, originalFiles = []) => {
    if (!analysisData) {
      setError('No analysis data to approve');
      return { success: false, error: 'No analysis data to approve' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      // The analysisData should already contain the AI-extracted information
      // We just need to save it using the materials/save endpoint
      const response = await api.post('/materials/save', {
        // The save endpoint expects specific fields - we'll need to ensure the backend
        // can handle the AI analysis format or transform it here
        ...analysisData,
        approved: true
      });

      if (response.data) {
        showSuccess('Assignment saved successfully!');

        // Call onComplete callback if provided
        if (onComplete) {
          await onComplete();
        }

        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error('Failed to save AI analysis');
      }
    } catch (error) {
      console.error('Error approving AI analysis:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save analysis. Please try again.';
      setError(errorMessage);
      showError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsProcessing(false);
    }
  }, [showSuccess, showError, onComplete]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processUpload,
    approveAiAnalysis,
    isProcessing,
    uploadProgress,
    error,
    clearError
  };
}
