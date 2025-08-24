'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import ScratchpadBase from './ScratchpadBase';
import { FiPlus, FiTrash2, FiArrowRight } from 'react-icons/fi';

const HistoryScratchpad = forwardRef(({ onSubmitWork, onClose, isVisible }, ref) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [causeEffects, setCauseEffects] = useState([]);
  const [keyTerms, setKeyTerms] = useState([]);
  const [compareItems, setCompareItems] = useState({ left: '', right: '', points: [] });

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      setTimelineEvents([]);
      setCauseEffects([]);
      setKeyTerms([]);
      setCompareItems({ left: '', right: '', points: [] });
      setActiveTab('timeline');
    },
    getWork: () => {
      return formatWorkForSubmission();
    }
  }));

  const formatWorkForSubmission = () => {
    let work = `History Scratchpad Work:\n\n`;
    
    if (timelineEvents.length > 0) {
      work += `Timeline:\n`;
      timelineEvents.sort((a, b) => a.year - b.year).forEach(event => {
        work += `- ${event.year}: ${event.event}\n`;
      });
      work += '\n';
    }
    
    if (causeEffects.length > 0) {
      work += `Cause & Effect:\n`;
      causeEffects.forEach(item => {
        work += `- Cause: ${item.cause}\n  Effect: ${item.effect}\n`;
      });
      work += '\n';
    }
    
    if (keyTerms.length > 0) {
      work += `Key Terms:\n`;
      keyTerms.forEach(term => {
        work += `- ${term.term}: ${term.definition}\n`;
      });
      work += '\n';
    }
    
    if (compareItems.points.length > 0) {
      work += `Comparison (${compareItems.left} vs ${compareItems.right}):\n`;
      compareItems.points.forEach(point => {
        work += `- ${point}\n`;
      });
    }
    
    return work;
  };

  const handleSubmit = () => {
    const work = formatWorkForSubmission();
    if (work && onSubmitWork) {
      onSubmitWork(work);
    }
  };

  // Timeline Component
  const TimelineTab = () => {
    const [newEvent, setNewEvent] = useState({ year: '', event: '' });
    
    const addEvent = () => {
      if (newEvent.year && newEvent.event) {
        setTimelineEvents([...timelineEvents, { ...newEvent, id: Date.now() }]);
        setNewEvent({ year: '', event: '' });
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Year/Date"
            value={newEvent.year}
            onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
            className="w-24 px-2 py-1 border rounded text-sm"
          />
          <input
            type="text"
            placeholder="Event description"
            value={newEvent.event}
            onChange={(e) => setNewEvent({ ...newEvent, event: e.target.value })}
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={addEvent}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            <FiPlus />
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timelineEvents.sort((a, b) => a.year - b.year).map(event => (
            <div key={event.id} className="flex items-center space-x-2 bg-blue-50 p-2 rounded">
              <span className="font-bold text-blue-700 w-20">{event.year}</span>
              <span className="flex-1 text-sm">{event.event}</span>
              <button
                onClick={() => setTimelineEvents(timelineEvents.filter(e => e.id !== event.id))}
                className="text-red-500 hover:text-red-700"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Cause & Effect Component
  const CauseEffectTab = () => {
    const [newItem, setNewItem] = useState({ cause: '', effect: '' });
    
    const addItem = () => {
      if (newItem.cause && newItem.effect) {
        setCauseEffects([...causeEffects, { ...newItem, id: Date.now() }]);
        setNewItem({ cause: '', effect: '' });
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Cause (what happened)"
            value={newItem.cause}
            onChange={(e) => setNewItem({ ...newItem, cause: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <div className="flex items-center justify-center">
            <FiArrowRight className="text-blue-500" />
          </div>
          <input
            type="text"
            placeholder="Effect (what resulted)"
            value={newItem.effect}
            onChange={(e) => setNewItem({ ...newItem, effect: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={addItem}
            className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Add Cause & Effect
          </button>
        </div>
        
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {causeEffects.map(item => (
            <div key={item.id} className="bg-blue-50 p-3 rounded relative">
              <button
                onClick={() => setCauseEffects(causeEffects.filter(ce => ce.id !== item.id))}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                <FiTrash2 size={14} />
              </button>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-blue-700 text-xs">CAUSE:</span>
                  <p className="text-sm">{item.cause}</p>
                </div>
                <div className="flex justify-center">
                  <FiArrowRight className="text-blue-400" size={16} />
                </div>
                <div>
                  <span className="font-semibold text-blue-700 text-xs">EFFECT:</span>
                  <p className="text-sm">{item.effect}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Key Terms Component
  const KeyTermsTab = () => {
    const [newTerm, setNewTerm] = useState({ term: '', definition: '' });
    
    const addTerm = () => {
      if (newTerm.term && newTerm.definition) {
        setKeyTerms([...keyTerms, { ...newTerm, id: Date.now() }]);
        setNewTerm({ term: '', definition: '' });
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Term/Person/Place"
            value={newTerm.term}
            onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm font-semibold"
          />
          <textarea
            placeholder="Definition/Significance"
            value={newTerm.definition}
            onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm h-16 resize-none"
          />
          <button
            onClick={addTerm}
            className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Add Term
          </button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {keyTerms.map(term => (
            <div key={term.id} className="bg-blue-50 p-2 rounded relative">
              <button
                onClick={() => setKeyTerms(keyTerms.filter(t => t.id !== term.id))}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                <FiTrash2 size={14} />
              </button>
              <div>
                <span className="font-semibold text-blue-700">{term.term}:</span>
                <p className="text-sm mt-1">{term.definition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Compare & Contrast Component
  const CompareTab = () => {
    const [newPoint, setNewPoint] = useState('');
    
    const addPoint = () => {
      if (newPoint) {
        setCompareItems({ ...compareItems, points: [...compareItems.points, newPoint] });
        setNewPoint('');
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="First item (e.g., North)"
            value={compareItems.left}
            onChange={(e) => setCompareItems({ ...compareItems, left: e.target.value })}
            className="px-2 py-1 border rounded text-sm font-semibold text-center"
          />
          <input
            type="text"
            placeholder="Second item (e.g., South)"
            value={compareItems.right}
            onChange={(e) => setCompareItems({ ...compareItems, right: e.target.value })}
            className="px-2 py-1 border rounded text-sm font-semibold text-center"
          />
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Add comparison point..."
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPoint()}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={addPoint}
            className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Add Point
          </button>
        </div>
        
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {compareItems.points.map((point, index) => (
            <div key={index} className="flex items-center space-x-2 bg-blue-50 p-2 rounded">
              <span className="flex-1 text-sm">• {point}</span>
              <button
                onClick={() => setCompareItems({
                  ...compareItems,
                  points: compareItems.points.filter((_, i) => i !== index)
                })}
                className="text-red-500 hover:text-red-700"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'cause-effect', label: 'Cause & Effect', icon: '⚡' },
    { id: 'terms', label: 'Key Terms', icon: '📚' },
    { id: 'compare', label: 'Compare', icon: '⚖️' }
  ];

  return (
    <ScratchpadBase
      ref={ref}
      title="History Helper"
      icon="🏛️"
      onSubmitWork={handleSubmit}
      onClose={onClose}
      isVisible={isVisible}
      primaryColor="blue"
    >
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'cause-effect' && <CauseEffectTab />}
        {activeTab === 'terms' && <KeyTermsTab />}
        {activeTab === 'compare' && <CompareTab />}
      </div>
    </ScratchpadBase>
  );
});

HistoryScratchpad.displayName = 'HistoryScratchpad';

export default HistoryScratchpad;