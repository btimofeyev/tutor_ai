// app/schedule/components/DurationPicker.js
"use client";
import { useState } from 'react';
import { ClockIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function DurationPicker({
  initialDuration = 30,
  onDurationChange,
  onConfirm,
  onCancel,
  lessonTitle = "Lesson"
}) {
  const [duration, setDuration] = useState(initialDuration);

  // Available duration options in 15-minute increments
  const durationOptions = [15, 30, 45, 60, 75, 90];

  const handleDurationChange = (newDuration) => {
    const validDuration = Math.max(15, Math.min(90, newDuration));
    setDuration(validDuration);
    if (onDurationChange) {
      onDurationChange(validDuration);
    }
  };

  const adjustDuration = (increment) => {
    const newDuration = duration + increment;
    if (newDuration >= 15 && newDuration <= 90) {
      handleDurationChange(newDuration);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(duration);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 min-w-80">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Set Lesson Duration</h3>
      </div>

      {/* Lesson Title */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm font-medium text-blue-900">📚 {lessonTitle}</div>
        <div className="text-xs text-blue-700 mt-1">Choose how long you want to spend on this lesson</div>
      </div>

      {/* Duration Controls */}
      <div className="mb-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => adjustDuration(-15)}
            disabled={duration <= 15}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MinusIcon className="h-4 w-4" />
          </button>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{duration}</div>
            <div className="text-sm text-gray-600">minutes</div>
          </div>

          <button
            onClick={() => adjustDuration(15)}
            disabled={duration >= 90}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Select Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {durationOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleDurationChange(option)}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                duration === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option}m
            </button>
          ))}
        </div>
      </div>

      {/* Duration Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600">
          <div className="mb-1"><strong>Recommended:</strong> 30-45 minutes for most lessons</div>
          <div><strong>Range:</strong> 15-90 minutes in 15-minute increments</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Schedule {duration}min Lesson
        </button>
      </div>
    </div>
  );
}
