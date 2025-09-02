'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AITutorInterface from '../components/tutor/AITutorInterface';

/**
 * Main Tutor Page - Entry point for AI tutoring session
 * Handles authentication check and renders the main tutor interface
 */
const TutorPage = () => {
  const [childData, setChildData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if child is authenticated
    const checkAuthAndLoadData = () => {
      try {
        // Get stored authentication data
        const accessToken = localStorage.getItem('child_token');
        const storedChildData = localStorage.getItem('child_data');
        
        if (!accessToken || !storedChildData) {
          // No auth data found, redirect to login
          router.replace('/');
          return;
        }

        // Parse child data
        const parsedChildData = JSON.parse(storedChildData);
        
        // Validate required fields
        if (!parsedChildData.id || !parsedChildData.name) {
          throw new Error('Invalid child data');
        }

        setChildData(parsedChildData);
        setError(null);
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Authentication failed. Please log in again.');
        
        // Clear invalid data and redirect
        localStorage.removeItem('child_token');
        localStorage.removeItem('child_refresh_token');
        localStorage.removeItem('child_data');
        
        // Small delay to show error briefly before redirect
        setTimeout(() => {
          router.replace('/');
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading your learning session...
          </h2>
          <p className="text-gray-500">
            Setting up your personalized AI tutor
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
          <button 
            onClick={() => router.replace('/')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // No child data (shouldn't happen if auth check passes)
  if (!childData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No User Data Found
          </h2>
          <p className="text-gray-500 mb-4">
            Unable to load your profile information.
          </p>
          <button 
            onClick={() => router.replace('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Main tutor interface
  return (
    <div className="min-h-screen bg-gray-50">
      <AITutorInterface childData={childData} />
    </div>
  );
};

export default TutorPage;