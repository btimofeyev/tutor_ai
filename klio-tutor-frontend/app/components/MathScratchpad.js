'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiSend, FiRotateCcw, FiDivide, FiPlus } from 'react-icons/fi';

// Math Template Components
const AdditionTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-green-200 bg-green-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-28">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* First Number */}
        <input
          type="text"
          value={values.firstNumber || ''}
          onChange={(e) => updateValue('firstNumber', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-green-400 transition-colors font-mono"
          placeholder="24"
        />
        
        {/* Operation Line */}
        <div className="flex items-center justify-center py-1">
          <span className="text-lg font-bold text-green-600 mr-2">+</span>
          <input
            type="text"
            value={values.secondNumber || ''}
            onChange={(e) => updateValue('secondNumber', e.target.value)}
            className="w-10 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-green-400 transition-colors font-mono"
            placeholder="15"
          />
        </div>
        
        {/* Equals Line */}
        <div className="border-t-2 border-gray-800 w-16 mx-auto my-1"></div>
        
        {/* Answer */}
        <input
          type="text"
          value={values.answer || ''}
          onChange={(e) => updateValue('answer', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-green-400 transition-colors font-mono"
          placeholder="?"
        />
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Addition</div>
      </div>
    </div>
  );
};

const SubtractionTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-red-200 bg-red-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-28">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* First Number */}
        <input
          type="text"
          value={values.firstNumber || ''}
          onChange={(e) => updateValue('firstNumber', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-red-400 transition-colors font-mono"
          placeholder="48"
        />
        
        {/* Operation Line */}
        <div className="flex items-center justify-center py-1">
          <span className="text-lg font-bold text-red-600 mr-2">−</span>
          <input
            type="text"
            value={values.secondNumber || ''}
            onChange={(e) => updateValue('secondNumber', e.target.value)}
            className="w-10 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-red-400 transition-colors font-mono"
            placeholder="23"
          />
        </div>
        
        {/* Equals Line */}
        <div className="border-t-2 border-gray-800 w-16 mx-auto my-1"></div>
        
        {/* Answer */}
        <input
          type="text"
          value={values.answer || ''}
          onChange={(e) => updateValue('answer', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-red-400 transition-colors font-mono"
          placeholder="?"
        />
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Subtraction</div>
      </div>
    </div>
  );
};

const MultiplicationTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-purple-200 bg-purple-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-28">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* First Number */}
        <input
          type="text"
          value={values.firstNumber || ''}
          onChange={(e) => updateValue('firstNumber', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-purple-400 transition-colors font-mono"
          placeholder="12"
        />
        
        {/* Operation Line */}
        <div className="flex items-center justify-center py-1">
          <span className="text-lg font-bold text-purple-600 mr-2">×</span>
          <input
            type="text"
            value={values.secondNumber || ''}
            onChange={(e) => updateValue('secondNumber', e.target.value)}
            className="w-10 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-purple-400 transition-colors font-mono"
            placeholder="4"
          />
        </div>
        
        {/* Equals Line */}
        <div className="border-t-2 border-gray-800 w-16 mx-auto my-1"></div>
        
        {/* Answer */}
        <input
          type="text"
          value={values.answer || ''}
          onChange={(e) => updateValue('answer', e.target.value)}
          className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-purple-400 transition-colors font-mono"
          placeholder="?"
        />
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Multiplication</div>
      </div>
    </div>
  );
};

const DivisionTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-blue-200 bg-blue-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-32">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* Quotient */}
        <input
          type="text"
          value={values.quotient || ''}
          onChange={(e) => updateValue('quotient', e.target.value)}
          className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-blue-400 transition-colors font-mono"
          placeholder="?"
        />
        
        {/* Division Layout */}
        <div className="flex items-center justify-center space-x-1 py-1">
          <input
            type="text"
            value={values.divisor || ''}
            onChange={(e) => updateValue('divisor', e.target.value)}
            className="w-8 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-blue-400 transition-colors font-mono"
            placeholder="8"
          />
          <span className="text-lg font-bold text-blue-600">)</span>
          <input
            type="text"
            value={values.dividend || ''}
            onChange={(e) => updateValue('dividend', e.target.value)}
            className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-blue-400 transition-colors font-mono"
            placeholder="24"
          />
        </div>
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Division</div>
      </div>
    </div>
  );
};

const FractionTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-emerald-200 bg-emerald-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-24">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* Numerator */}
        <input
          type="text"
          value={values.numerator || ''}
          onChange={(e) => updateValue('numerator', e.target.value)}
          className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-emerald-400 transition-colors block mx-auto font-mono"
          placeholder="3"
        />
        
        {/* Fraction Bar */}
        <div className="border-t-2 border-emerald-600 w-12 mx-auto my-2"></div>
        
        {/* Denominator */}
        <input
          type="text"
          value={values.denominator || ''}
          onChange={(e) => updateValue('denominator', e.target.value)}
          className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-emerald-400 transition-colors block mx-auto font-mono"
          placeholder="4"
        />
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Fraction</div>
      </div>
    </div>
  );
};

const ExponentTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-pink-200 bg-pink-50 p-3 m-1 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-2">
        {/* Base and Exponent Layout */}
        <div className="flex items-start justify-center space-x-1">
          <input
            type="text"
            value={values.base || ''}
            onChange={(e) => updateValue('base', e.target.value)}
            className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-pink-400 transition-colors"
            placeholder="2"
          />
          <input
            type="text"
            value={values.power || ''}
            onChange={(e) => updateValue('power', e.target.value)}
            className="w-8 text-center border-0 border-b border-gray-400 bg-transparent text-xs -mt-2 focus:border-pink-400 transition-colors"
            placeholder="3"
          />
        </div>
        
        <div className="mt-2 text-xs text-gray-600">Exponent</div>
      </div>
    </div>
  );
};

const SquareRootTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-yellow-200 bg-yellow-50 p-3 m-1 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-2">
        {/* Square Root Layout */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl font-bold text-yellow-600">√</span>
          <input
            type="text"
            value={values.number || ''}
            onChange={(e) => updateValue('number', e.target.value)}
            className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-yellow-400 transition-colors"
            placeholder="16"
          />
        </div>
        
        <div className="mt-2 text-xs text-gray-600">Square Root</div>
      </div>
    </div>
  );
};

const VerticalMathTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-orange-200 bg-orange-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-32">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* First Number */}
        <input
          type="text"
          value={values.firstNumber || ''}
          onChange={(e) => updateValue('firstNumber', e.target.value)}
          className="w-20 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-orange-400 transition-colors font-mono"
          placeholder="123"
        />
        
        {/* Operator + Second Number */}
        <div className="flex items-center justify-center space-x-1 py-1">
          <select
            value={values.operator || 'add'}
            onChange={(e) => updateValue('operator', e.target.value)}
            className="text-center border-0 bg-transparent text-base focus:outline-none text-orange-600 font-bold"
          >
            <option value="add">+</option>
            <option value="subtract">−</option>
            <option value="multiply">×</option>
            <option value="divide">÷</option>
          </select>
          <input
            type="text"
            value={values.secondNumber || ''}
            onChange={(e) => updateValue('secondNumber', e.target.value)}
            className="w-12 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-orange-400 transition-colors font-mono"
            placeholder="45"
          />
        </div>
        
        {/* Equals Line */}
        <div className="border-t-2 border-gray-800 w-20 mx-auto my-1"></div>
        
        {/* Answer */}
        <input
          type="text"
          value={values.answer || ''}
          onChange={(e) => updateValue('answer', e.target.value)}
          className="w-20 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-orange-400 transition-colors font-mono"
          placeholder="?"
        />
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Vertical Math</div>
      </div>
    </div>
  );
};

const LongDivisionTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-indigo-200 bg-indigo-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-40">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-1">
        {/* Quotient */}
        <input
          type="text"
          value={values.quotient || ''}
          onChange={(e) => updateValue('quotient', e.target.value)}
          className="w-24 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-indigo-400 transition-colors font-mono"
          placeholder="quotient"
        />
        
        {/* Division Symbol and Dividend */}
        <div className="flex items-center justify-center py-1">
          <input
            type="text"
            value={values.divisor || ''}
            onChange={(e) => updateValue('divisor', e.target.value)}
            className="w-8 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base mr-1 focus:border-indigo-400 transition-colors font-mono"
            placeholder="8"
          />
          <span className="text-lg mr-1 text-indigo-600 font-bold">⌐</span>
          <input
            type="text"
            value={values.dividend || ''}
            onChange={(e) => updateValue('dividend', e.target.value)}
            className="w-16 text-center border-0 border-b-2 border-gray-400 bg-transparent text-base focus:border-indigo-400 transition-colors font-mono"
            placeholder="248"
          />
        </div>
        
        {/* Work Area */}
        <div className="text-sm space-y-1 pt-1">
          <div className="flex justify-center items-center">
            <span className="w-4 text-indigo-600">−</span>
            <input
              type="text"
              value={values.subtract1 || ''}
              onChange={(e) => updateValue('subtract1', e.target.value)}
              className="w-12 text-center border-0 border-b border-gray-300 bg-transparent text-sm focus:border-indigo-400 transition-colors font-mono"
              placeholder="24"
            />
          </div>
          <div className="border-t border-gray-400 w-16 mx-auto"></div>
          <input
            type="text"
            value={values.remainder1 || ''}
            onChange={(e) => updateValue('remainder1', e.target.value)}
            className="w-12 text-center border-0 border-b border-gray-300 bg-transparent text-sm focus:border-indigo-400 transition-colors font-mono mx-auto block"
            placeholder="08"
          />
        </div>
        
        {/* Remainder */}
        <div className="text-sm pt-2 flex items-center justify-center space-x-1">
          <span className="text-indigo-600">R:</span>
          <input
            type="text"
            value={values.finalRemainder || ''}
            onChange={(e) => updateValue('finalRemainder', e.target.value)}
            className="w-8 text-center border-0 border-b border-gray-300 bg-transparent text-sm focus:border-indigo-400 transition-colors font-mono"
            placeholder="0"
          />
        </div>
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Long Division</div>
      </div>
    </div>
  );
};

const EquationSolverTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-violet-200 bg-violet-50 p-4 m-1 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-3">
        {/* Original Equation */}
        <input
          type="text"
          value={values.equation || ''}
          onChange={(e) => updateValue('equation', e.target.value)}
          className="w-32 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-violet-400 transition-colors"
          placeholder="2x + 3 = 11"
        />
        
        {/* Arrow and Step 1 */}
        <div className="space-y-1">
          <div className="text-violet-600 text-sm">↓</div>
          <input
            type="text"
            value={values.step1 || ''}
            onChange={(e) => updateValue('step1', e.target.value)}
            className="w-32 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-violet-400 transition-colors"
            placeholder="2x = 8"
          />
        </div>
        
        {/* Arrow and Solution */}
        <div className="space-y-1">
          <div className="text-violet-600 text-sm">↓</div>
          <input
            type="text"
            value={values.solution || ''}
            onChange={(e) => updateValue('solution', e.target.value)}
            className="w-20 text-center border-0 border-b-2 border-violet-400 bg-transparent text-sm focus:border-violet-500 transition-colors font-bold"
            placeholder="x = 4"
          />
        </div>
        
        <div className="mt-2 text-xs text-gray-600">Equation Solver</div>
      </div>
    </div>
  );
};


const FractionOperationsTemplate = ({ id, values, onChange, onRemove }) => {
  const updateValue = (field, value) => {
    onChange(id, { ...values, [field]: value });
  };

  return (
    <div className="inline-block border-2 border-amber-200 bg-amber-50 p-4 m-2 rounded-lg relative group shadow-sm hover:shadow-md transition-all duration-200 w-52">
      <button
        onClick={() => onRemove(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="font-mono text-center space-y-3">
        {/* Main Operation */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          {/* First Fraction */}
          <div className="text-center">
            <input
              type="text"
              value={values.num1 || ''}
              onChange={(e) => updateValue('num1', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="1"
            />
            <div className="border-t-2 border-amber-600 my-1 w-6 mx-auto"></div>
            <input
              type="text"
              value={values.den1 || ''}
              onChange={(e) => updateValue('den1', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="3"
            />
          </div>
          
          {/* Operator */}
          <select
            value={values.operator || '+'}
            onChange={(e) => updateValue('operator', e.target.value)}
            className="text-base border-0 bg-transparent focus:outline-none text-amber-700 font-bold"
          >
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="×">×</option>
            <option value="÷">÷</option>
          </select>
          
          {/* Second Fraction */}
          <div className="text-center">
            <input
              type="text"
              value={values.num2 || ''}
              onChange={(e) => updateValue('num2', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="2"
            />
            <div className="border-t-2 border-amber-600 my-1 w-6 mx-auto"></div>
            <input
              type="text"
              value={values.den2 || ''}
              onChange={(e) => updateValue('den2', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="5"
            />
          </div>
          
          <span className="text-base text-amber-700 font-bold">=</span>
          
          {/* Result Fraction */}
          <div className="text-center">
            <input
              type="text"
              value={values.resultNum || ''}
              onChange={(e) => updateValue('resultNum', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="?"
            />
            <div className="border-t-2 border-amber-600 my-1 w-6 mx-auto"></div>
            <input
              type="text"
              value={values.resultDen || ''}
              onChange={(e) => updateValue('resultDen', e.target.value)}
              className="w-6 text-center border-0 border-b-2 border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors block mx-auto font-mono"
              placeholder="?"
            />
          </div>
        </div>
        
        {/* Work Area */}
        <div className="border-t border-amber-300 pt-2 space-y-2">
          <div className="text-xs text-amber-600 font-medium">Work Area:</div>
          
          {/* LCD */}
          <div className="flex items-center justify-center space-x-2">
            <span className="text-amber-600 text-sm font-medium">LCD:</span>
            <input
              type="text"
              value={values.commonDen || ''}
              onChange={(e) => updateValue('commonDen', e.target.value)}
              className="w-8 text-center border-0 border-b border-gray-400 bg-transparent text-sm focus:border-amber-400 transition-colors font-mono"
              placeholder="15"
            />
          </div>
          
          {/* Equivalent Steps */}
          <div className="flex items-center justify-center space-x-1 text-xs">
            <input
              type="text"
              value={values.equiv1 || ''}
              onChange={(e) => updateValue('equiv1', e.target.value)}
              className="w-10 text-center border-0 border-b border-gray-300 bg-transparent text-xs focus:border-amber-400 transition-colors font-mono"
              placeholder="5/15"
            />
            <span className="text-amber-600 font-medium">{values.operator || '+'}</span>
            <input
              type="text"
              value={values.equiv2 || ''}
              onChange={(e) => updateValue('equiv2', e.target.value)}
              className="w-10 text-center border-0 border-b border-gray-300 bg-transparent text-xs focus:border-amber-400 transition-colors font-mono"
              placeholder="6/15"
            />
          </div>
        </div>
        
        <div className="mt-3 text-xs text-gray-600 font-medium">Fraction Operations</div>
      </div>
    </div>
  );
};


// Math Template Toolbar
const MathTemplateToolbar = ({ onAddTemplate }) => {
  const templates = [
    { type: 'addition', label: '+', icon: null, color: 'green' },
    { type: 'subtraction', label: '−', icon: null, color: 'red' },
    { type: 'multiplication', label: '×', icon: null, color: 'purple' },
    { type: 'division', label: '÷', icon: null, color: 'blue' },
    { type: 'longdivision', label: '⌐÷', icon: null, color: 'indigo' },
    { type: 'fraction', label: 'a/b', icon: null, color: 'emerald' },
    { type: 'fractionops', label: '1/2+3/4', icon: null, color: 'amber' },
    { type: 'vertical', label: '+/−', icon: null, color: 'orange' },
    { type: 'equation', label: '2x=8', icon: null, color: 'violet' },
    { type: 'exponent', label: 'x²', icon: null, color: 'pink' },
    { type: 'sqrt', label: '√', icon: null, color: 'yellow' }
  ];

  return (
    <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        🧮 <span className="ml-2">Math Tools</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {templates.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => onAddTemplate(type)}
            className={`flex flex-col items-center justify-center px-4 py-3 text-lg border-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg bg-white hover:bg-${color}-50 border-${color}-200 text-${color}-700 hover:border-${color}-400 min-h-[70px] font-semibold`}
          >
            {Icon && <Icon size={20} className="mb-1" />}
            <span className="text-sm font-bold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Math Scratchpad with Hybrid Text + Templates
const MathScratchpad = forwardRef(function MathScratchpad({ 
  onSubmitWork, 
  onClose, 
  isVisible = true 
}, ref) {
  const [textContent, setTextContent] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [mathTemplates, setMathTemplates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clear: () => {
      setTextContent('');
      setMathTemplates([]);
    }
  }));

  const addMathTemplate = (type) => {
    const newTemplate = {
      id: Date.now(),
      type,
      values: {}
    };
    setMathTemplates(prev => [...prev, newTemplate]);
  };

  const updateTemplate = (id, values) => {
    setMathTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, values } : template
    ));
  };

  const removeTemplate = (id) => {
    setMathTemplates(prev => prev.filter(template => template.id !== id));
  };

  const renderTemplate = (template) => {
    const props = {
      id: template.id,
      values: template.values,
      onChange: updateTemplate,
      onRemove: removeTemplate
    };

    switch (template.type) {
      case 'addition':
        return <AdditionTemplate key={template.id} {...props} />;
      case 'subtraction':
        return <SubtractionTemplate key={template.id} {...props} />;
      case 'multiplication':
        return <MultiplicationTemplate key={template.id} {...props} />;
      case 'division':
        return <DivisionTemplate key={template.id} {...props} />;
      case 'longdivision':
        return <LongDivisionTemplate key={template.id} {...props} />;
      case 'fraction':
        return <FractionTemplate key={template.id} {...props} />;
      case 'fractionops':
        return <FractionOperationsTemplate key={template.id} {...props} />;
      case 'equation':
        return <EquationSolverTemplate key={template.id} {...props} />;
      case 'exponent':
        return <ExponentTemplate key={template.id} {...props} />;
      case 'sqrt':
        return <SquareRootTemplate key={template.id} {...props} />;
      case 'vertical':
        return <VerticalMathTemplate key={template.id} {...props} />;
      default:
        return null;
    }
  };

  const serializeContent = () => {
    let result = textContent;
    
    // Add math templates in a readable format
    mathTemplates.forEach(template => {
      switch (template.type) {
        case 'addition':
          const addValues = template.values;
          result += `\n\nAddition: ${addValues.firstNumber || '?'} + ${addValues.secondNumber || '?'} = ${addValues.answer || '?'}`;
          break;
        case 'subtraction':
          const subValues = template.values;
          result += `\n\nSubtraction: ${subValues.firstNumber || '?'} − ${subValues.secondNumber || '?'} = ${subValues.answer || '?'}`;
          break;
        case 'multiplication':
          const multValues = template.values;
          result += `\n\nMultiplication: ${multValues.firstNumber || '?'} × ${multValues.secondNumber || '?'} = ${multValues.answer || '?'}`;
          break;
        case 'division':
          const { quotient, divisor, dividend } = template.values;
          result += `\n\nDivision: ${dividend || '?'} ÷ ${divisor || '?'} = ${quotient || '?'}`;
          break;
        case 'longdivision':
          const ldValues = template.values;
          result += `\n\nLong Division: ${ldValues.dividend || '?'} ÷ ${ldValues.divisor || '?'} = ${ldValues.quotient || '?'} R${ldValues.finalRemainder || '?'}`;
          break;
        case 'fraction':
          const { numerator, denominator } = template.values;
          result += `\n\nFraction: ${numerator || '?'}/${denominator || '?'}`;
          break;
        case 'fractionops':
          const foValues = template.values;
          result += `\n\nFraction Operation: ${foValues.num1 || '?'}/${foValues.den1 || '?'} ${foValues.operator || '+'} ${foValues.num2 || '?'}/${foValues.den2 || '?'} = ${foValues.resultNum || '?'}/${foValues.resultDen || '?'}`;
          if (foValues.commonDen) result += `\nLCD: ${foValues.commonDen}`;
          break;
        case 'equation':
          const eqValues = template.values;
          result += `\n\nEquation Solving:\n${eqValues.equation || '?'}\nStep 1: ${eqValues.step1 || '?'}\nSolution: ${eqValues.solution || '?'}`;
          break;
        case 'exponent':
          const { base, power } = template.values;
          result += `\n\nExponent: ${base || '?'}^${power || '?'}`;
          break;
        case 'sqrt':
          const { number } = template.values;
          result += `\n\nSquare Root: √${number || '?'}`;
          break;
        case 'vertical':
          const vValues = template.values;
          result += `\n\nVertical Math: ${vValues.firstNumber || '?'} ${vValues.operator || '+'} ${vValues.secondNumber || '?'} = ${vValues.answer || '?'}`;
          break;
      }
    });

    // Add final answer section
    if (finalAnswer.trim()) {
      result += `\n\nFINAL ANSWER: ${finalAnswer.trim()}`;
    }

    return result.trim();
  };

  const submitWork = async () => {
    const content = serializeContent();
    if (!content) return;
    
    setIsSubmitting(true);
    
    if (onSubmitWork) {
      await onSubmitWork(content, { text: 'Math work from scratchpad' });
    }
    
    setIsSubmitting(false);
  };

  const clearWork = () => {
    setTextContent('');
    setFinalAnswer('');
    setMathTemplates([]);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="h-full flex flex-col bg-white border-l border-gray-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📝</span>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Math Scratchpad</h2>
            <p className="text-sm text-gray-600">Type and use math templates</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearWork}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            title="Clear all work"
          >
            <FiRotateCcw size={18} />
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            aria-label="Close scratchpad"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Math Template Toolbar */}
      <MathTemplateToolbar onAddTemplate={addMathTemplate} />

      {/* Main Work Area - Hybrid Text + Templates */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        <div className="relative h-full">
          {/* Graph Paper Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
          
          {/* Content Area - Graph Paper Style */}
          <div className="relative bg-white border-2 border-gray-300 rounded-lg shadow-sm p-6 min-h-full">
            
            {/* Main Work Area */}
            <div className="space-y-6">
              
              {/* My Work Section */}
              <div>
                <div className="text-center border-b border-gray-200 pb-2 mb-4">
                  <h3 className="text-lg font-bold text-gray-700">📝 My Work</h3>
                </div>
                
                {/* Large Text Work Area */}
                <textarea
                  ref={contentRef}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={`Show your work step by step...

Problem: 

Step 1:

Step 2:

Answer:`}
                  className="w-full border-0 bg-transparent resize-none text-base leading-loose focus:outline-none placeholder-gray-400 mb-4"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    lineHeight: '2',
                    minHeight: '300px'
                  }}
                />

                {/* Math Templates within My Work */}
                {mathTemplates.length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-3">
                      {mathTemplates.map(renderTemplate)}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Answer Section - Always at Bottom */}
              <div className="border-t-2 border-gray-300 pt-6 mt-8">
                <label className="block text-lg font-bold text-gray-700 mb-3">✨ Final Answer:</label>
                <input
                  type="text"
                  value={finalAnswer}
                  onChange={(e) => setFinalAnswer(e.target.value)}
                  placeholder="Write your final answer here..."
                  className="w-full border-2 border-gray-300 rounded-lg p-4 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Section */}
      <div className="p-4 border-t border-gray-200 bg-accent-blue">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-800 font-medium">
            Send your work for review!
          </div>
          <div className="flex space-x-3">
            <button
              onClick={clearWork}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 rounded-lg transition-colors font-medium border border-gray-200"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={submitWork}
              disabled={(!textContent.trim() && mathTemplates.length === 0 && !finalAnswer.trim()) || isSubmitting}
              className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-sm hover:shadow-md"
            >
              <FiSend size={18} />
              <span>{isSubmitting ? 'Sending...' : 'Submit My Work'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <div className="px-4 pb-3 text-sm text-gray-600 bg-white text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">💡</span>
          <span className="font-medium">Use the math tools above and show your thinking step by step!</span>
        </div>
      </div>
    </motion.div>
  );
});

export default MathScratchpad;