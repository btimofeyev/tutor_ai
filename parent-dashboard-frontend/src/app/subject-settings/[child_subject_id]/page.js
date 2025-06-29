// app/subject-settings/[child_subject_id]/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../utils/api'; // Adjust path as needed
import Link from 'next/link';

const allPossibleContentTypes = ["lesson", "worksheet", "assignment", "test", "quiz", "notes", "reading_material", "other"];

// Helper to make content type names more readable
const formatContentTypeName = (contentType) => {
    return contentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function SubjectSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const childSubjectId = params.child_subject_id;

    const [weights, setWeights] = useState([]);
    const [subjectName, setSubjectName] = useState(''); // To display which subject we are editing
    const [childName, setChildName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchWeightsAndSubjectInfo = useCallback(async () => {
        if (!childSubjectId) return;
        setLoading(true);
        setError('');
        try {
            // Fetch weights
            const weightsRes = await api.get(`/weights/${childSubjectId}`);
            
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
            
            // Initialize weights for all content types if some are missing
            const currentWeightsMap = new Map(weightsRes.data.map(w => [w.content_type, parseFloat(w.weight)]));
            const initialWeights = allPossibleContentTypes.map(ct => ({
                content_type: ct,
                // Default new/unseen types to 0.00, or a sensible default for common gradable types
                weight: currentWeightsMap.get(ct) ?? (["test", "quiz", "assignment", "worksheet"].includes(ct) ? 0.10 : 0.00)
            }));

            setWeights(initialWeights);

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
        const newWeight = parseFloat(value);
        if (isNaN(newWeight) || newWeight < 0 || newWeight > 1.00) {
            // Invalid input - weight must be between 0 and 1
            return; 
        }
        setWeights(prevWeights =>
            prevWeights.map(w =>
                w.content_type === contentType ? { ...w, weight: newWeight } : w
            )
        );
    };

    const calculateTotalWeight = () => {
        return weights.reduce((sum, w) => sum + (w.weight || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const totalWeight = calculateTotalWeight();
        // Validate that weights sum to approximately 1.0 for gradable content types
        const gradableWeights = weights.filter(w => w.weight > 0);
        if (gradableWeights.length > 0 && Math.abs(totalWeight - 1.0) > 0.01) {
            const confirmSave = window.confirm(
                `Total weight is ${totalWeight.toFixed(2)}, not 1.00. This may affect grade calculations. Save anyway?`
            );
            if (!confirmSave) {
                setSaving(false);
                return;
            }
        }

        try {
            await api.post(`/weights/${childSubjectId}`, { weights });
            // Success - could be replaced with toast notification
            setError(''); // Clear any previous errors
            router.push('/dashboard'); // Or back to where they came from
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save weights.");
        } finally {
            setSaving(false);
        }
    };
    
    const totalWeightDisplay = calculateTotalWeight().toFixed(2);

    if (loading) return <div className="p-8 text-center">Loading weight settings...</div>;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg p-6 sm:p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Grade Weight Settings</h1>
                    <p className="text-sm text-gray-600">For {childName}'s {subjectName}</p>
                </div>

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {weights.map(({ content_type, weight }) => (
                            <div key={content_type} className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                                <label htmlFor={`weight-${content_type}`} className="text-sm font-medium text-gray-700">
                                    {formatContentTypeName(content_type)}
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        id={`weight-${content_type}`}
                                        name={content_type}
                                        value={weight === null || weight === undefined ? '' : weight.toFixed(2)} // Display with 2 decimal places
                                        onChange={(e) => handleWeightChange(content_type, e.target.value)}
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        className="w-24 text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-right"
                                        placeholder="e.g. 0.40"
                                    />
                                    <span className="ml-2 text-sm text-gray-500">% ({(weight * 100).toFixed(0)})</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-3 bg-blue-50 rounded-md text-right">
                        <span className="text-sm font-semibold text-blue-700">
                            Total Weight: {totalWeightDisplay} ({(parseFloat(totalWeightDisplay) * 100).toFixed(0)}%)
                        </span>
                        {Math.abs(parseFloat(totalWeightDisplay) - 1.0) > 0.001 && (
                            <p className="text-xs text-yellow-600 mt-1">Note: Total weight is not 100%. Grades will be proportional to these weights.</p>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <Link href="/dashboard">
                            <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Cancel
                            </button>
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Weights'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}