'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiRotateCcw, FiLayers, FiHelpCircle } from 'react-icons/fi';

/**
 * FlashcardPanel - Interactive flashcard study interface
 * Displays flashcards with flip animations and navigation
 */
const FlashcardPanel = ({ 
  isVisible, 
  onClose, 
  flashcardData, 
  childData 
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Reset state when new flashcard data loads
  useEffect(() => {
    if (flashcardData) {
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [flashcardData]);

  if (!isVisible || !flashcardData || !flashcardData.flashcards) {
    return null;
  }

  const cards = flashcardData.flashcards;
  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;

  const handleNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReset = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const getCategoryColor = (category) => {
    const colors = {
      concept: 'bg-blue-100 text-blue-700 border-blue-200',
      definition: 'bg-green-100 text-green-700 border-green-200',
      formula: 'bg-purple-100 text-purple-700 border-purple-200',
      example: 'bg-orange-100 text-orange-700 border-orange-200',
      vocabulary: 'bg-pink-100 text-pink-700 border-pink-200',
      review: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category] || colors.concept;
  };

  return (
    <div className={`flex flex-col bg-white border-l border-gray-200 transition-all duration-300 ${
      isVisible ? 'w-1/2' : 'w-0 overflow-hidden'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFE6A7] to-[#FDDC8A] px-6 py-4 border-b border-[#E6C67F]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D97706] rounded-xl flex items-center justify-center">
              <FiLayers className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#4A4A4A]">
                {flashcardData.title || 'Study Cards'}
              </h2>
              <p className="text-sm text-[#7A7A7A]">
                {flashcardData.subject} • {childData?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FFE6A7]/50 rounded-lg transition-colors text-[#7A7A7A] hover:text-[#4A4A4A]"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-[#FFE6A7]/10 border-b border-[#FFE6A7]/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#4A4A4A]">
            Card {currentCardIndex + 1} of {totalCards}
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1 text-xs text-[#D97706] hover:text-[#C2620A] hover:bg-[#FFE6A7]/30 rounded-lg transition-colors"
          >
            <FiRotateCcw size={14} />
            Restart
          </button>
        </div>
        <div className="w-full bg-[#FFE6A7]/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentCardIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 p-6 bg-gradient-to-b from-[#FFE6A7]/5 to-transparent">
        <div className="max-w-md mx-auto">
          {/* Category Badge */}
          {currentCard.category && (
            <div className="flex justify-center mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(currentCard.category)}`}>
                {currentCard.category.charAt(0).toUpperCase() + currentCard.category.slice(1)}
              </span>
            </div>
          )}

          {/* Flashcard */}
          <div className="relative">
            <div 
              className={`flashcard ${isFlipped ? 'flipped' : ''}`}
              onClick={handleFlip}
              style={{ cursor: 'pointer' }}
            >
              {/* Front of card */}
              <div className="flashcard-front bg-white rounded-2xl shadow-lg border-2 border-[#FFE6A7]/30 p-8 min-h-[280px] flex flex-col items-center justify-center text-center hover:shadow-xl transition-shadow">
                <div className="text-lg font-semibold text-[#4A4A4A] mb-4 leading-relaxed">
                  {currentCard.front}
                </div>
                <div className="text-xs text-[#7A7A7A] mt-auto">
                  Click to reveal answer
                </div>
              </div>

              {/* Back of card */}
              <div className="flashcard-back bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white rounded-2xl shadow-lg border-2 border-[#E6C67F]/30 p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
                <div className="text-lg font-medium mb-4 leading-relaxed">
                  {currentCard.back}
                </div>
                <div className="text-xs text-[#FFE6A7] mt-auto">
                  Click to see question again
                </div>
              </div>
            </div>
          </div>

          {/* Hint Section */}
          {currentCard.hint && (
            <div className="mt-6">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-[#D97706] hover:text-[#C2620A] hover:bg-[#FFE6A7]/20 rounded-lg transition-colors"
              >
                <FiHelpCircle size={16} />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              
              {showHint && (
                <div className="mt-3 p-4 bg-[#FFE6A7]/10 border border-[#FFE6A7]/20 rounded-xl">
                  <p className="text-sm text-[#7A7A7A] text-center">
                    💡 {currentCard.hint}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 bg-white border-t border-[#FFE6A7]/20">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentCardIndex === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#D97706] hover:text-white hover:bg-[#D97706] border border-[#D97706]'
            }`}
          >
            <FiChevronLeft size={18} />
            Previous
          </button>

          <div className="text-center">
            <div className="text-sm text-[#7A7A7A]">
              Progress: {Math.round(((currentCardIndex + 1) / totalCards) * 100)}%
            </div>
          </div>

          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === totalCards - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentCardIndex === totalCards - 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-white bg-[#D97706] hover:bg-[#C2620A]'
            }`}
          >
            Next
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* CSS for flip animation */}
      <style jsx>{`
        .flashcard {
          position: relative;
          width: 100%;
          height: 280px;
          transform-style: preserve-3d;
          transition: transform 0.6s;
        }

        .flashcard.flipped {
          transform: rotateY(180deg);
        }

        .flashcard-front,
        .flashcard-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 1rem;
        }

        .flashcard-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardPanel;