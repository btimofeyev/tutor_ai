// CelebrationEffects.js - Dynamic celebration components for tutoring achievements
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiAward, FiTrendingUp, FiHeart } from 'react-icons/fi';

// Confetti animation component
const ConfettiPiece = ({ color, delay = 0 }) => (
  <motion.div
    initial={{ 
      y: -100, 
      x: Math.random() * 200 - 100,
      rotate: 0,
      opacity: 1
    }}
    animate={{ 
      y: window.innerHeight + 100,
      x: Math.random() * 200 - 100,
      rotate: 360,
      opacity: 0
    }}
    transition={{ 
      duration: 3 + Math.random() * 2,
      delay: delay,
      ease: "easeOut"
    }}
    className={`absolute w-3 h-3 ${color} rounded-full`}
    style={{
      left: `${Math.random() * 100}%`,
      top: '-50px'
    }}
  />
);

export const ConfettiExplosion = ({ show, onComplete, intensity = 30 }) => {
  const colors = [
    'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 
    'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400'
  ];

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: intensity }).map((_, index) => (
        <ConfettiPiece
          key={index}
          color={colors[Math.floor(Math.random() * colors.length)]}
          delay={Math.random() * 0.5}
        />
      ))}
    </div>
  );
};

// Fireworks effect for major achievements
export const FireworksEffect = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, times: [0, 0.5, 1] }}
        className="relative"
      >
        {/* Central burst */}
        <motion.div
          animate={{ 
            scale: [0, 3, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 2.5, repeat: 1 }}
          className="w-4 h-4 bg-yellow-400 rounded-full"
        />
        
        {/* Radiating sparks */}
        {Array.from({ length: 12 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ 
              x: 0, 
              y: 0, 
              scale: 1,
              opacity: 1
            }}
            animate={{
              x: Math.cos((index * 30) * Math.PI / 180) * 100,
              y: Math.sin((index * 30) * Math.PI / 180) * 100,
              scale: [1, 0.5, 0],
              opacity: [1, 0.7, 0]
            }}
            transition={{ 
              duration: 2,
              delay: 0.3,
              ease: "easeOut"
            }}
            className="absolute w-2 h-2 bg-orange-400 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: '-4px',
              marginTop: '-4px'
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Achievement unlock animation
export const AchievementUnlock = ({ achievement, show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show || !achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: -50 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-6 text-center max-w-sm mx-auto shadow-2xl"
        >
          {/* Achievement icon */}
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="text-6xl mb-4"
          >
            {achievement.icon || '🏆'}
          </motion.div>
          
          {/* Achievement details */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            Achievement Unlocked!
          </motion.h2>
          
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg font-semibold text-yellow-100 mb-2"
          >
            {achievement.title}
          </motion.h3>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-yellow-100 text-sm mb-4"
          >
            {achievement.description}
          </motion.p>
          
          {/* Points earned */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
            className="bg-white bg-opacity-20 rounded-full px-4 py-2 inline-block"
          >
            <span className="text-white font-bold">
              +{achievement.points} points!
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Quick celebration for correct answers
export const QuickCelebration = ({ type = 'correct', show, onComplete }) => {
  const celebrations = {
    correct: {
      icon: '🎉',
      message: 'Correct!',
      color: 'from-green-400 to-green-600'
    },
    excellent: {
      icon: '⭐',
      message: 'Excellent!',
      color: 'from-yellow-400 to-orange-500'
    },
    streak: {
      icon: '🔥',
      message: 'On fire!',
      color: 'from-red-400 to-orange-600'
    },
    improvement: {
      icon: '📈',
      message: 'Getting better!',
      color: 'from-blue-400 to-purple-600'
    }
  };

  const celebration = celebrations[type] || celebrations.correct;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ 
        scale: [0, 1.2, 1], 
        opacity: [0, 1, 1, 0], 
        y: [50, 0, -20] 
      }}
      transition={{ 
        duration: 1.5,
        times: [0, 0.3, 0.7, 1]
      }}
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
    >
      <div className={`bg-gradient-to-r ${celebration.color} rounded-full p-6 shadow-lg text-center`}>
        <div className="text-4xl mb-2">{celebration.icon}</div>
        <div className="text-white font-bold text-xl">{celebration.message}</div>
      </div>
    </motion.div>
  );
};

// Floating hearts for encouragement
export const FloatingHearts = ({ show, onComplete, count = 5 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ 
            y: window.innerHeight + 50,
            x: Math.random() * window.innerWidth,
            scale: 0,
            opacity: 0
          }}
          animate={{ 
            y: -100,
            x: Math.random() * window.innerWidth,
            scale: [0, 1, 0.8, 1, 0],
            opacity: [0, 1, 1, 1, 0]
          }}
          transition={{ 
            duration: 3,
            delay: index * 0.2,
            ease: "easeOut"
          }}
          className="absolute text-4xl"
        >
          💖
        </motion.div>
      ))}
    </div>
  );
};

// Progress celebration (for milestones)
export const ProgressCelebration = ({ milestone, show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show || !milestone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4 shadow-lg z-50 max-w-sm"
    >
      <div className="flex items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-2xl mr-3"
        >
          🌟
        </motion.div>
        <div>
          <h4 className="font-bold">Milestone Reached!</h4>
          <p className="text-sm text-purple-100">{milestone.message}</p>
        </div>
      </div>
    </motion.div>
  );
};