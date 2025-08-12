'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useToast } from './useToast';

/**
 * Hook to manage AI processing notifications
 * Polls for processing status and shows toast notifications when complete
 */
export function useProcessingNotifications() {
  const [processingMaterials, setProcessingMaterials] = useState(new Set());
  const { showSuccess, showError } = useToast();
  const intervalRef = useRef(null);
  const checkedMaterials = useRef(new Set());

  // Add material to processing queue
  const addProcessingMaterial = useCallback((materialId, title = 'Material') => {
    setProcessingMaterials(prev => new Set([...prev, materialId]));

    // Store material info for later notification
    const materialInfo = { id: materialId, title };
    localStorage.setItem(`processing_${materialId}`, JSON.stringify(materialInfo));
  }, []);

  // Remove material from processing queue
  const removeProcessingMaterial = useCallback((materialId) => {
    setProcessingMaterials(prev => {
      const newSet = new Set(prev);
      newSet.delete(materialId);
      return newSet;
    });

    // Clean up localStorage
    localStorage.removeItem(`processing_${materialId}`);
    checkedMaterials.current.add(materialId);
  }, []);

  // Check processing status for a single material
  const checkMaterialStatus = useCallback(async (materialId) => {
    try {
      const response = await api.get(`/materials/status/${materialId}`);
      const status = response.data;

      if (status.processing_status === 'completed') {
        // Get stored material info
        const storedInfo = localStorage.getItem(`processing_${materialId}`);
        const materialInfo = storedInfo ? JSON.parse(storedInfo) : { title: 'Material' };

        showSuccess(`✨ AI analysis completed for "${materialInfo.title}"`);
        removeProcessingMaterial(materialId);

        // Trigger global refresh event to update materials lists
        window.dispatchEvent(new CustomEvent('materialProcessingComplete', {
          detail: { materialId, materialInfo }
        }));

        return true;
      } else if (status.processing_status === 'failed') {
        // Get stored material info
        const storedInfo = localStorage.getItem(`processing_${materialId}`);
        const materialInfo = storedInfo ? JSON.parse(storedInfo) : { title: 'Material' };

        showError(`❌ AI analysis failed for "${materialInfo.title}"`);
        removeProcessingMaterial(materialId);
        return true;
      }
    } catch (error) {
      console.error(`Error checking status for material ${materialId}:`, error);
      // If material not found, assume it was deleted or completed elsewhere
      if (error.response?.status === 404) {
        removeProcessingMaterial(materialId);
        return true;
      }
    }

    return false;
  }, [showSuccess, showError, removeProcessingMaterial]);

  // Polling function
  const pollProcessingStatus = useCallback(async () => {
    if (processingMaterials.size === 0) return;

    const materialIds = Array.from(processingMaterials);
    const checkPromises = materialIds.map(id => checkMaterialStatus(id));

    try {
      await Promise.allSettled(checkPromises);
    } catch (error) {
      console.error('Error during status polling:', error);
    }
  }, [processingMaterials, checkMaterialStatus]);

  // Start/stop polling based on processing materials
  useEffect(() => {
    if (processingMaterials.size > 0) {
      // Start polling every 10 seconds
      intervalRef.current = setInterval(pollProcessingStatus, 10000);

      // Also check immediately
      pollProcessingStatus();
    } else {
      // Stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [processingMaterials.size, pollProcessingStatus]);

  // Load processing materials from localStorage on mount
  useEffect(() => {
    const storedMaterials = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('processing_')) {
        const materialId = key.replace('processing_', '');
        if (!checkedMaterials.current.has(materialId)) {
          storedMaterials.push(materialId);
        }
      }
    }

    if (storedMaterials.length > 0) {
      setProcessingMaterials(new Set(storedMaterials));
    }
  }, []);

  // Manual check function (useful for testing or immediate checks)
  const checkNow = useCallback(() => {
    pollProcessingStatus();
  }, [pollProcessingStatus]);

  return {
    processingMaterials: Array.from(processingMaterials),
    addProcessingMaterial,
    removeProcessingMaterial,
    isProcessing: processingMaterials.size > 0,
    checkNow
  };
}
