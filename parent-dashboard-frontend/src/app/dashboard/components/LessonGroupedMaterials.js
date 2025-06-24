'use client';
import React, { useState, useEffect } from 'react';
import { 
    BookOpenIcon,
    DocumentIcon,
    ClipboardDocumentListIcon,
    AcademicCapIcon,
    PlayIcon,
    ChevronDownIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import MaterialListItem from './MaterialListItem';
import api from '../../../utils/api';

const MaterialTypeIcon = ({ type, isPrimary }) => {
    if (isPrimary) {
        return <BookOpenIcon className="h-4 w-4 text-blue-600" />;
    }
    
    switch (type) {
        case 'worksheet_for':
            return <ClipboardDocumentListIcon className="h-4 w-4 text-green-600" />;
        case 'assignment_for':
            return <AcademicCapIcon className="h-4 w-4 text-purple-600" />;
        case 'supplement_for':
            return <PlayIcon className="h-4 w-4 text-orange-600" />;
        default:
            return <DocumentIcon className="h-4 w-4 text-gray-600" />;
    }
};

const MaterialTypeLabel = ({ type, isPrimary }) => {
    if (isPrimary) return '📄 Primary Lesson';
    
    switch (type) {
        case 'worksheet_for':
            return '📋 Worksheet';
        case 'assignment_for':
            return '📝 Assignment';
        case 'supplement_for':
            return '📚 Supplemental';
        default:
            return '📄 Material';
    }
};

export default function LessonGroupedMaterials({
    lessonContainer,
    onOpenEditModal,
    onToggleComplete,
    onDeleteMaterial
}) {
    const [groupedMaterials, setGroupedMaterials] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!lessonContainer?.id) return;
        
        const fetchGroupedMaterials = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/materials/lesson/${lessonContainer.id}/grouped`);
                setGroupedMaterials(response.data.materials);
            } catch (err) {
                console.error('Error fetching grouped materials:', err);
                setError(err.response?.data?.error || 'Failed to load materials');
            } finally {
                setLoading(false);
            }
        };

        fetchGroupedMaterials();
    }, [lessonContainer?.id]);

    if (loading) {
        return (
            <div className="bg-gray-50/80 rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                <div className="px-4 py-3">
                    <div className="flex items-center">
                        <div className="h-4 w-4 bg-gray-300 rounded mr-3"></div>
                        <div className="h-5 bg-gray-300 rounded w-32"></div>
                        <div className="ml-2 h-4 bg-gray-300 rounded w-8"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <div className="flex items-center text-red-700">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">Error loading lesson materials: {error}</span>
                </div>
            </div>
        );
    }

    if (!groupedMaterials) {
        return null;
    }

    const totalMaterials = (groupedMaterials.primary_lesson ? 1 : 0) + 
                           groupedMaterials.worksheets.length + 
                           groupedMaterials.assignments.length + 
                           groupedMaterials.supplements.length + 
                           groupedMaterials.other.length;

    if (totalMaterials === 0) {
        return (
            <div className="bg-gray-50/80 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center text-gray-500">
                    <BookOpenIcon className="h-4 w-4 mr-3" />
                    <span className="text-sm font-semibold text-gray-700">{lessonContainer.title}</span>
                    <span className="ml-2 text-xs text-gray-500">(empty)</span>
                </div>
            </div>
        );
    }

    const renderMaterialGroup = (materials, groupTitle, typeKey) => {
        if (materials.length === 0) return null;
        
        return (
            <div className="mb-3">
                <div className="flex items-center mb-2">
                    <MaterialTypeIcon type={typeKey} isPrimary={typeKey === 'primary'} />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                        {groupTitle} ({materials.length})
                    </span>
                </div>
                <div className="space-y-1 ml-6">
                    {materials.map(material => (
                        <MaterialListItem
                            key={material.id}
                            lesson={material}
                            onOpenEditModal={onOpenEditModal}
                            onToggleComplete={onToggleComplete}
                            onDeleteMaterial={onDeleteMaterial}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50/80 rounded-lg border border-gray-200 overflow-hidden">
            <button
                className="w-full px-4 py-3 flex items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset hover:bg-gray-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <BookOpenIcon className="h-4 w-4 mr-3 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-700">{lessonContainer.title}</span>
                    <span className="ml-2 text-xs text-gray-500 font-normal">({totalMaterials} materials)</span>
                </div>
                <div className="flex-shrink-0 ml-3">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                {isExpanded && (
                    <div className="px-4 pb-3 border-t border-gray-200">
                        {/* Primary Lesson */}
                        {groupedMaterials.primary_lesson && (
                            <div className="mb-3 pt-3">
                                <div className="flex items-center mb-2">
                                    <MaterialTypeIcon isPrimary={true} />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Primary Lesson</span>
                                </div>
                                <div className="ml-6">
                                    <MaterialListItem
                                        lesson={groupedMaterials.primary_lesson}
                                        onOpenEditModal={onOpenEditModal}
                                        onToggleComplete={onToggleComplete}
                                        onDeleteMaterial={onDeleteMaterial}
                                                    />
                                </div>
                            </div>
                        )}

                        {/* Worksheets */}
                        {renderMaterialGroup(groupedMaterials.worksheets, 'Worksheets', 'worksheet_for')}
                        
                        {/* Assignments */}
                        {renderMaterialGroup(groupedMaterials.assignments, 'Assignments', 'assignment_for')}
                        
                        {/* Supplements */}
                        {renderMaterialGroup(groupedMaterials.supplements, 'Supplemental Materials', 'supplement_for')}
                        
                        {/* Other Materials */}
                        {renderMaterialGroup(groupedMaterials.other, 'Other Materials', 'other')}
                    </div>
                )}
            </div>
        </div>
    );
}