// app/subject-settings/[child_subject_id]/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';
import { ArrowLeftIcon, AcademicCapIcon, BookOpenIcon, ClipboardDocumentListIcon, BeakerIcon, DocumentTextIcon, PencilSquareIcon, BookmarkIcon, EllipsisHorizontalIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const allPossibleContentTypes = ["test", "quiz", "worksheet", "review", "lesson", "notes", "reading_material", "other"];

// Helper to make content type names more readable
const formatContentTypeName = (contentType) => {
    // Special case for worksheet to display as Assignment
    if (contentType === 'worksheet') {
        return 'Assignment';
    }
    return contentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Icon mapping for content types
const contentTypeIcons = {
    test: <AcademicCapIcon className="h-5 w-5" />,
    quiz: <BeakerIcon className="h-5 w-5" />,
    worksheet: <PencilSquareIcon className="h-5 w-5" />,
    review: <DocumentCheckIcon className="h-5 w-5" />,
    lesson: <BookOpenIcon className="h-5 w-5" />,
    notes: <DocumentTextIcon className="h-5 w-5" />,
    reading_material: <BookmarkIcon className="h-5 w-5" />,
    other: <EllipsisHorizontalIcon className="h-5 w-5" />
};

// Common grading presets
const gradingPresets = [
    {
        name: "Traditional",
        description: "Tests and quizzes weighted heavily",
        weights: {
            test: 35,
            quiz: 20,
            worksheet: 15,
            review: 25,
            lesson: 5,
            notes: 0,
            reading_material: 0,
            other: 0
        }
    },
    {
        name: "Balanced",
        description: "Equal weight across major categories",
        weights: {
            test: 25,
            quiz: 25,
            worksheet: 25,
            review: 25,
            lesson: 0,
            notes: 0,
            reading_material: 0,
            other: 0
        }
    },
    {
        name: "Project-Based",
        description: "Assignments and projects emphasized",
        weights: {
            test: 20,
            quiz: 15,
            worksheet: 40,
            review: 25,
            lesson: 0,
            notes: 0,
            reading_material: 0,
            other: 0
        }
    },
    {
        name: "Continuous Assessment",
        description: "Daily work and participation valued",
        weights: {
            test: 20,
            quiz: 15,
            worksheet: 25,
            review: 25,
            lesson: 10,
            notes: 5,
            reading_material: 0,
            other: 0
        }
    }
];

export default function SubjectSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const childSubjectId = params.child_subject_id;

    const [weights, setWeights] = useState({});
    const [subjectName, setSubjectName] = useState('');
    const [childName, setChildName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [showPresets, setShowPresets] = useState(false);

    // Custom categories state
    const [customCategories, setCustomCategories] = useState([]);
    const [showCustomCategories, setShowCustomCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryWeight, setNewCategoryWeight] = useState(0);
    const [addingCategory, setAddingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const fetchWeightsAndSubjectInfo = useCallback(async () => {
        if (!childSubjectId) return;
        setLoading(true);
        setError('');
        try {
            // Fetch weights and custom categories in parallel
            const [weightsRes, customCategoriesRes] = await Promise.all([
                api.get(`/weights/${childSubjectId}`),
                api.get(`/custom-categories/${childSubjectId}`)
            ]);

            // Set custom categories
            setCustomCategories(customCategoriesRes.data || []);

            // Fetch subject and child info for context
            try {
                const [childrenRes, subjectsRes] = await Promise.all([
                    api.get('/children'),
                    api.get('/subjects')
                ]);

                // Find the child and subject based on the child_subject_id
                const childSubject = weightsRes.data.find(w => w.child_subject_id == childSubjectId);
                if (childSubject) {
                    const child = childrenRes.data.find(c => c.id == childSubject.child_id);
                    const subject = subjectsRes.data.find(s => s.id == childSubject.subject_id);
                    setChildName(child?.name || 'Student');
                    setSubjectName(subject?.name || 'Subject');
                } else {
                    setSubjectName('Selected Subject');
                    setChildName('Student');
                }
            } catch (detailsError) {
                setSubjectName('Selected Subject');
                setChildName('Student');
            }

            // Convert weights to percentage format
            const weightsMap = {};
            weightsRes.data.forEach(w => {
                weightsMap[w.content_type] = Math.round(parseFloat(w.weight) * 100);
            });

            // Check if we have any existing weights
            const hasExistingWeights = weightsRes.data.length > 0 && weightsRes.data.some(w => parseFloat(w.weight) > 0);

            if (!hasExistingWeights) {
                // Initialize with default balanced weights that add up to 100%
                const defaultWeights = {
                    test: 25,
                    quiz: 20,
                    worksheet: 25,
                    review: 30,
                    lesson: 0,
                    notes: 0,
                    reading_material: 0,
                    other: 0
                };
                setWeights(defaultWeights);
            } else {
                // Initialize missing content types with 0 for existing weights
                allPossibleContentTypes.forEach(ct => {
                    if (!(ct in weightsMap)) {
                        weightsMap[ct] = 0;
                    }
                });
                setWeights(weightsMap);
            }

        } catch (err) {
            setError(err.response?.data?.error || "Failed to load weight settings.");
        } finally {
            setLoading(false);
        }
    }, [childSubjectId]);

    useEffect(() => {
        fetchWeightsAndSubjectInfo();
    }, [fetchWeightsAndSubjectInfo]);

    const handleWeightChange = (contentType, value) => {
        const newValue = parseInt(value) || 0;
        if (newValue < 0 || newValue > 100) return;

        setWeights(prev => ({
            ...prev,
            [contentType]: newValue
        }));

        // Clear preset selection when manually adjusting
        setSelectedPreset(null);
    };

    const applyPreset = (preset) => {
        setWeights(preset.weights);
        setSelectedPreset(preset.name);
        setShowPresets(false);
    };

    const calculateTotal = () => {
        const standardTotal = Object.values(weights).reduce((sum, weight) => sum + (weight || 0), 0);
        const customTotal = customCategories.reduce((sum, category) => sum + (Math.round(category.weight * 100) || 0), 0);
        return standardTotal + customTotal;
    };

    const autoBalance = () => {
        const activeTypes = Object.entries(weights).filter(([_, weight]) => weight > 0);
        if (activeTypes.length === 0) return;

        const equalWeight = Math.floor(100 / activeTypes.length);
        const remainder = 100 - (equalWeight * activeTypes.length);

        const newWeights = { ...weights };
        activeTypes.forEach(([type, _], index) => {
            newWeights[type] = equalWeight + (index < remainder ? 1 : 0);
        });

        setWeights(newWeights);
        setSelectedPreset(null);
    };

    // Custom category management functions
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setAddingCategory(true);
        try {
            const response = await api.post(`/custom-categories/${childSubjectId}`, {
                category_name: newCategoryName.trim(),
                weight: newCategoryWeight / 100 // Convert percentage to decimal
            });
            setCustomCategories([...customCategories, response.data]);
            setNewCategoryName('');
            setNewCategoryWeight(0);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add custom category');
        } finally {
            setAddingCategory(false);
        }
    };

    const handleUpdateCategory = async (categoryId, updates) => {
        try {
            const response = await api.put(`/custom-categories/category/${categoryId}`, updates);
            setCustomCategories(customCategories.map(cat =>
                cat.id === categoryId ? response.data : cat
            ));
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update custom category');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('Are you sure you want to delete this custom category?')) return;
        try {
            await api.delete(`/custom-categories/category/${categoryId}`);
            setCustomCategories(customCategories.filter(cat => cat.id !== categoryId));
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete custom category');
        }
    };

    const handleCategoryWeightChange = (categoryId, newWeight) => {
        const weightAsDecimal = newWeight / 100;
        handleUpdateCategory(categoryId, { weight: weightAsDecimal });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const total = calculateTotal();
        if (total !== 100 && total !== 0) {
            const confirmSave = window.confirm(
                `Total weight is ${total}%, not 100%. This may affect grade calculations. Save anyway?`
            );
            if (!confirmSave) {
                setSaving(false);
                return;
            }
        }

        try {
            // Convert percentages back to decimals for API
            const weightsArray = Object.entries(weights).map(([content_type, percentage]) => ({
                content_type,
                weight: percentage / 100
            }));

            await api.post(`/weights/${childSubjectId}`, { weights: weightsArray });

            // Show success and redirect
            router.push('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save weights.");
        } finally {
            setSaving(false);
        }
    };

    const total = calculateTotal();
    const isValid = total === 100 || total === 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading grade settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="mr-4">
                                <ArrowLeftIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Grade Weights</h1>
                                <p className="text-sm text-gray-600">{childName}&apos;s {subjectName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Quick Presets */}
                <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Quick Setup</h2>
                        <button
                            type="button"
                            onClick={() => setShowPresets(!showPresets)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {showPresets ? 'Hide' : 'Show'} Presets
                        </button>
                    </div>

                    {showPresets && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {gradingPresets.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => applyPreset(preset)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                                        selectedPreset === preset.name
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{preset.name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                                        </div>
                                        {selectedPreset === preset.name && (
                                            <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Custom Categories */}
                <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Custom Assignment Categories</h2>
                            <p className="text-sm text-gray-600 mt-1">Create subject-specific assignment types like &quot;Book Reports&quot; or &quot;Lab Reports&quot;</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCustomCategories(!showCustomCategories)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {showCustomCategories ? 'Hide' : 'Show'} Custom Categories
                        </button>
                    </div>

                    {showCustomCategories && (
                        <div className="space-y-4">
                            {/* Add New Category Form */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Category</h3>
                                <div className="flex items-end gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Category Name</label>
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="e.g., Book Reports, Lab Reports"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-600 mb-1">Weight %</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={newCategoryWeight}
                                            onChange={(e) => setNewCategoryWeight(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        disabled={!newCategoryName.trim() || addingCategory}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {addingCategory ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                            </div>

                            {/* Existing Custom Categories */}
                            {customCategories.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900">Existing Categories</h3>
                                    {customCategories.map((category) => (
                                        <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="text-purple-600">
                                                        <ClipboardDocumentListIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-900">{category.category_name}</span>
                                                        <span className="text-sm text-gray-500 ml-2">Custom Category</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="5"
                                                        value={Math.round(category.weight * 100)}
                                                        onChange={(e) => handleCategoryWeightChange(category.id, parseInt(e.target.value))}
                                                        className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                        style={{
                                                            background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${Math.round(category.weight * 100)}%, #E5E7EB ${Math.round(category.weight * 100)}%, #E5E7EB 100%)`
                                                        }}
                                                    />
                                                    <div className="flex items-center space-x-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="5"
                                                            value={Math.round(category.weight * 100)}
                                                            onChange={(e) => handleCategoryWeightChange(category.id, parseInt(e.target.value) || 0)}
                                                            className="w-16 text-center text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm text-gray-500">%</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {customCategories.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">No custom categories yet. Add one above to get started.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Weight Settings */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Assignment Weights</h2>
                            <button
                                type="button"
                                onClick={autoBalance}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Auto-Balance
                            </button>
                        </div>

                        <div className="space-y-4">
                            {allPossibleContentTypes.map((contentType) => {
                                const weight = weights[contentType] || 0;
                                const isActive = weight > 0;

                                return (
                                    <div
                                        key={contentType}
                                        className={`p-4 rounded-lg border transition-all ${
                                            isActive ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                                                    {contentTypeIcons[contentType]}
                                                </div>
                                                <label
                                                    htmlFor={`weight-${contentType}`}
                                                    className={`font-medium ${
                                                        isActive ? 'text-gray-900' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {formatContentTypeName(contentType)}
                                                </label>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="range"
                                                    id={`slider-${contentType}`}
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={weight}
                                                    onChange={(e) => handleWeightChange(contentType, e.target.value)}
                                                    className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                    style={{
                                                        background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${weight}%, #E5E7EB ${weight}%, #E5E7EB 100%)`
                                                    }}
                                                />
                                                <div className="flex items-center space-x-1">
                                                    <input
                                                        type="number"
                                                        id={`weight-${contentType}`}
                                                        min="0"
                                                        max="100"
                                                        step="5"
                                                        value={weight}
                                                        onChange={(e) => handleWeightChange(contentType, e.target.value)}
                                                        className="w-16 text-center text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-500">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Display */}
                        <div className={`mt-6 p-4 rounded-lg ${
                            isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                            <div className="flex items-center justify-between">
                                <span className={`font-semibold ${
                                    isValid ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                    Total Weight:
                                </span>
                                <span className={`text-xl font-bold ${
                                    isValid ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                    {total}%
                                </span>
                            </div>
                            {!isValid && total !== 0 && (
                                <p className="text-sm text-yellow-600 mt-2">
                                    Weights should add up to 100% for accurate grade calculations
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex justify-end space-x-3">
                            <Link href="/dashboard">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Weights'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
