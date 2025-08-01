// app/schedule/components/ScheduleExportManager.js
"use client";
import { useState } from 'react';
import { 
  ShareIcon, 
  DocumentArrowDownIcon,
  EnvelopeIcon,
  LinkIcon,
  PhotoIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

export default function ScheduleExportManager({
  isOpen,
  onClose,
  calendarEvents = [],
  childName = 'Student',
  dateRange,
  childSubjects = [],
  onGeneratePDF
}) {
  const [exportOptions, setExportOptions] = useState({
    format: 'summary', // summary, detailed, subject-specific
    period: 'week', // week, month, custom
    includeCompleted: true,
    includeNotes: true,
    includeProgress: false,
    recipientType: 'teacher', // teacher, tutor, parent, family
    customDateRange: {
      start: format(new Date(), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 7), 'yyyy-MM-dd')
    }
  });

  const [shareOptions, setShareOptions] = useState({
    method: 'download', // download, email, link, copy
    recipientEmail: '',
    accessLevel: 'view', // view, comment
    expirationDays: 7
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Export format options
  const EXPORT_FORMATS = {
    summary: {
      name: 'Weekly Summary',
      description: 'Clean overview with key highlights',
      icon: DocumentTextIcon
    },
    detailed: {
      name: 'Detailed Schedule',
      description: 'Complete timeline with all sessions',
      icon: CalendarDaysIcon
    },
    'subject-specific': {
      name: 'Subject Focus',
      description: 'Organized by subject areas',
      icon: DocumentArrowDownIcon
    }
  };

  // Recipient type presets
  const RECIPIENT_PRESETS = {
    teacher: {
      name: 'Classroom Teacher',
      defaultFormat: 'summary',
      includeProgress: true,
      includeNotes: true
    },
    tutor: {
      name: 'Private Tutor',
      defaultFormat: 'subject-specific',
      includeProgress: true,
      includeNotes: true
    },
    parent: {
      name: 'Parent/Guardian',
      defaultFormat: 'detailed',
      includeProgress: false,
      includeNotes: false
    },
    family: {
      name: 'Family Member',
      defaultFormat: 'summary',
      includeProgress: false,
      includeNotes: false
    }
  };

  // Generate export content based on options
  const generateExportContent = () => {
    setIsGenerating(true);
    
    try {
      const content = createExportContent();
      setGeneratedContent(content);
      setPreviewMode(true);
    } catch (error) {
      console.error('Failed to generate export:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const createExportContent = () => {
    const startDate = dateRange?.start || startOfWeek(new Date(), { weekStartsOn: 1 });
    const endDate = dateRange?.end || endOfWeek(new Date(), { weekStartsOn: 1 });
    
    // Filter events based on date range
    const filteredEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date || event.start);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Group events by date
    const eventsByDate = {};
    filteredEvents.forEach(event => {
      const dateKey = format(new Date(event.date || event.start), 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // Calculate statistics
    const totalHours = filteredEvents.reduce((sum, event) => {
      return sum + (event.duration || event.duration_minutes || 30);
    }, 0) / 60;

    const subjectBreakdown = {};
    filteredEvents.forEach(event => {
      const subject = event.base_subject_name || event.subject_name || event.title || 'Other';
      const duration = event.duration || event.duration_minutes || 30;
      subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + duration;
    });

    const completedSessions = filteredEvents.filter(e => e.status === 'completed').length;
    const completionRate = filteredEvents.length > 0 ? 
      Math.round((completedSessions / filteredEvents.length) * 100) : 0;

    switch (exportOptions.format) {
      case 'summary':
        return createSummaryExport({
          childName,
          dateRange: { start: startDate, end: endDate },
          totalHours,
          subjectBreakdown,
          completionRate,
          eventsByDate,
          totalSessions: filteredEvents.length
        });
      
      case 'detailed':
        return createDetailedExport({
          childName,
          dateRange: { start: startDate, end: endDate },
          eventsByDate,
          totalHours,
          completionRate
        });
      
      case 'subject-specific':
        return createSubjectSpecificExport({
          childName,
          dateRange: { start: startDate, end: endDate },
          subjectBreakdown,
          filteredEvents,
          totalHours
        });
      
      default:
        return createSummaryExport({
          childName,
          dateRange: { start: startDate, end: endDate },
          totalHours,
          subjectBreakdown,
          completionRate,
          eventsByDate,
          totalSessions: filteredEvents.length
        });
    }
  };

  const createSummaryExport = ({ childName, dateRange, totalHours, subjectBreakdown, completionRate, eventsByDate, totalSessions }) => {
    const topSubjects = Object.entries(subjectBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([subject, minutes]) => ({ subject, hours: Math.round(minutes / 60 * 10) / 10 }));

    return {
      title: `Learning Schedule Summary - ${childName}`,
      subtitle: `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
      sections: [
        {
          title: 'Overview',
          content: [
            `Total Study Time: ${Math.round(totalHours * 10) / 10} hours`,
            `Sessions Completed: ${Math.round(completionRate)}% (${Math.round(totalSessions * completionRate / 100)}/${totalSessions})`,
            `Active Subjects: ${Object.keys(subjectBreakdown).length}`
          ]
        },
        {
          title: 'Subject Focus Areas',
          content: topSubjects.map(({ subject, hours }) => 
            `${subject}: ${hours} hours`
          )
        },
        {
          title: 'Daily Schedule Highlights',
          content: Object.entries(eventsByDate).map(([date, events]) => {
            const dayTotal = events.reduce((sum, e) => sum + (e.duration || 30), 0);
            const subjects = [...new Set(events.map(e => e.base_subject_name || e.subject_name || e.title))].slice(0, 3);
            return `${format(new Date(date), 'EEE, MMM d')}: ${Math.round(dayTotal/60*10)/10}h - ${subjects.join(', ')}`;
          })
        }
      ],
      footer: `Generated on ${format(new Date(), 'MMM d, yyyy')} for ${RECIPIENT_PRESETS[exportOptions.recipientType]?.name || 'Teacher'}`
    };
  };

  const createDetailedExport = ({ childName, dateRange, eventsByDate, totalHours, completionRate }) => {
    return {
      title: `Detailed Learning Schedule - ${childName}`,
      subtitle: `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
      sections: [
        {
          title: 'Schedule Overview',
          content: [
            `Total Study Time: ${Math.round(totalHours * 10) / 10} hours`,
            `Completion Rate: ${completionRate}%`
          ]
        },
        ...Object.entries(eventsByDate).map(([date, events]) => ({
          title: format(new Date(date), 'EEEE, MMMM d'),
          content: events
            .sort((a, b) => (a.startTime || a.start_time || '').localeCompare(b.startTime || b.start_time || ''))
            .map(event => {
              const time = event.startTime || event.start_time || format(new Date(event.start), 'HH:mm');
              const subject = event.base_subject_name || event.subject_name || event.title || 'Study';
              const duration = event.duration || event.duration_minutes || 30;
              const status = event.status === 'completed' ? ' ✓' : '';
              const notes = exportOptions.includeNotes && event.notes ? ` - ${event.notes}` : '';
              
              return `${time} - ${subject} (${duration}min)${status}${notes}`;
            })
        }))
      ],
      footer: `Generated on ${format(new Date(), 'MMM d, yyyy')}`
    };
  };

  const createSubjectSpecificExport = ({ childName, dateRange, subjectBreakdown, filteredEvents, totalHours }) => {
    const subjectSections = Object.entries(subjectBreakdown).map(([subject, totalMinutes]) => {
      const subjectEvents = filteredEvents.filter(e => 
        (e.base_subject_name || e.subject_name || e.title || 'Other') === subject
      );
      
      const sessions = subjectEvents.map(event => {
        const date = format(new Date(event.date || event.start), 'MMM d');
        const time = event.startTime || event.start_time || format(new Date(event.start), 'HH:mm');
        const duration = event.duration || event.duration_minutes || 30;
        const status = event.status === 'completed' ? ' ✓' : '';
        
        return `${date} at ${time} (${duration}min)${status}`;
      });

      return {
        title: `${subject} - ${Math.round(totalMinutes / 60 * 10) / 10} hours total`,
        content: sessions
      };
    });

    return {
      title: `Subject-Specific Schedule - ${childName}`,
      subtitle: `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
      sections: [
        {
          title: 'Summary',
          content: [
            `Total Study Time: ${Math.round(totalHours * 10) / 10} hours`,
            `Subjects Covered: ${Object.keys(subjectBreakdown).length}`
          ]
        },
        ...subjectSections
      ],
      footer: `Generated on ${format(new Date(), 'MMM d, yyyy')}`
    };
  };

  const handleDownload = (format = 'txt') => {
    if (!generatedContent) return;

    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'txt') {
      content = formatAsText(generatedContent);
      filename = `${childName}-schedule-${format(new Date(), 'yyyy-MM-dd')}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'pdf') {
      if (onGeneratePDF) {
        onGeneratePDF(generatedContent);
        return;
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatAsText = (content) => {
    let text = `${content.title}\n${content.subtitle}\n\n`;
    
    content.sections.forEach(section => {
      text += `${section.title}\n`;
      text += ''.padEnd(section.title.length, '-') + '\n';
      section.content.forEach(line => {
        text += `${line}\n`;
      });
      text += '\n';
    });
    
    text += `\n${content.footer}`;
    return text;
  };

  const handleCopyToClipboard = () => {
    if (!generatedContent) return;
    
    const text = formatAsText(generatedContent);
    navigator.clipboard.writeText(text).then(() => {
      // Show success feedback
    });
  };

  const handleRecipientChange = (recipientType) => {
    const preset = RECIPIENT_PRESETS[recipientType];
    if (preset) {
      setExportOptions(prev => ({
        ...prev,
        recipientType,
        format: preset.defaultFormat,
        includeProgress: preset.includeProgress,
        includeNotes: preset.includeNotes
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShareIcon className="h-5 w-5" />
              Export & Share Schedule
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!previewMode ? (
            <div className="space-y-6">
              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who will receive this schedule?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(RECIPIENT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handleRecipientChange(key)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        exportOptions.recipientType === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(EXPORT_FORMATS).map(([key, format]) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setExportOptions(prev => ({ ...prev, format: key }))}
                        className={`p-4 text-left rounded-lg border transition-colors ${
                          exportOptions.format === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">{format.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{format.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Additional Information
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCompleted}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeCompleted: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Show completed sessions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeNotes}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeNotes: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Include session notes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeProgress}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeProgress: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Include progress indicators</span>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end">
                <button
                  onClick={generateExportContent}
                  disabled={isGenerating}
                  className="btn-primary px-6 py-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4 inline mr-2" />
                      Preview Export
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-gray-900">Preview</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Back to Options
                  </button>
                  <button
                    onClick={() => handleDownload('txt')}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 inline mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    <PrinterIcon className="h-4 w-4 inline mr-1" />
                    PDF
                  </button>
                  <button
                    onClick={handleCopyToClipboard}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 inline mr-1" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              {generatedContent && (
                <div className="bg-gray-50 rounded-lg p-6 max-h-[400px] overflow-y-auto">
                  <div className="bg-white p-6 rounded shadow-sm">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      {generatedContent.title}
                    </h1>
                    <p className="text-gray-600 mb-6">{generatedContent.subtitle}</p>
                    
                    {generatedContent.sections.map((section, index) => (
                      <div key={index} className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">
                          {section.title}
                        </h2>
                        <div className="space-y-1">
                          {section.content.map((line, lineIndex) => (
                            <p key={lineIndex} className="text-gray-700">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-sm text-gray-500 mt-6 pt-6 border-t border-gray-200">
                      {generatedContent.footer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}