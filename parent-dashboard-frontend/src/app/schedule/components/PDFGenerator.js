// app/schedule/components/PDFGenerator.js
"use client";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default class PDFGenerator {
  constructor() {
    this.pageWidth = 8.5 * 72; // 8.5 inches in points
    this.pageHeight = 11 * 72; // 11 inches in points
    this.margin = 0.75 * 72; // 0.75 inch margins
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.contentHeight = this.pageHeight - (this.margin * 2);
  }

  // Generate PDF using browser's print functionality
  async generatePrintablePDF(scheduleData, options = {}) {
    const {
      format: layoutFormat = 'weekly',
      includeLogo = false,
      includeNotes = true,
      colorScheme = 'color' // color, grayscale, blackwhite
    } = options;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const htmlContent = this.createPrintableHTML(scheduleData, {
      layoutFormat,
      includeLogo,
      includeNotes,
      colorScheme
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Optionally close the window after printing
        // printWindow.close();
      }, 500);
    };

    return printWindow;
  }

  // Create HTML content optimized for printing
  createPrintableHTML(scheduleData, options) {
    const {
      layoutFormat = 'weekly',
      includeLogo = false,
      includeNotes = true,
      colorScheme = 'color'
    } = options;

    const styles = this.getPrintStyles(colorScheme);
    
    let content = '';

    switch (layoutFormat) {
      case 'weekly':
        content = this.createWeeklyLayout(scheduleData, includeNotes);
        break;
      case 'daily':
        content = this.createDailyLayout(scheduleData, includeNotes);
        break;
      case 'monthly':
        content = this.createMonthlyLayout(scheduleData, includeNotes);
        break;
      case 'subject':
        content = this.createSubjectLayout(scheduleData, includeNotes);
        break;
      default:
        content = this.createWeeklyLayout(scheduleData, includeNotes);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Learning Schedule - ${scheduleData.childName}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }

  // CSS styles optimized for printing
  getPrintStyles(colorScheme) {
    const baseColors = {
      color: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#059669',
        math: '#dc2626',
        science: '#059669',
        english: '#7c3aed',
        social: '#ea580c',
        art: '#db2777',
        pe: '#0891b2'
      },
      grayscale: {
        primary: '#374151',
        secondary: '#6b7280',
        accent: '#4b5563',
        math: '#6b7280',
        science: '#6b7280',
        english: '#6b7280',
        social: '#6b7280',
        art: '#6b7280',
        pe: '#6b7280'
      },
      blackwhite: {
        primary: '#000000',
        secondary: '#000000',
        accent: '#000000',
        math: '#000000',
        science: '#000000',
        english: '#000000',
        social: '#000000',
        art: '#000000',
        pe: '#000000'
      }
    };

    const colors = baseColors[colorScheme] || baseColors.color;

    return `
      @media print {
        @page {
          size: letter;
          margin: 0.75in;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: white;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: white;
      }
      
      .page {
        max-width: 7.5in;
        margin: 0 auto;
        background: white;
        min-height: 10in;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid ${colors.primary};
        padding-bottom: 15px;
      }
      
      .title {
        font-size: 24px;
        font-weight: bold;
        color: ${colors.primary};
        margin: 0 0 5px 0;
      }
      
      .subtitle {
        font-size: 14px;
        color: ${colors.secondary};
        margin: 0;
      }
      
      .week-grid {
        display: grid;
        grid-template-columns: 80px repeat(7, 1fr);
        gap: 1px;
        border: 1px solid #ddd;
        margin-bottom: 20px;
      }
      
      .day-header {
        background: ${colors.primary};
        color: white;
        padding: 8px 4px;
        text-align: center;
        font-weight: bold;
        font-size: 11px;
      }
      
      .time-label {
        background: #f8fafc;
        padding: 6px 4px;
        text-align: center;
        font-size: 10px;
        color: ${colors.secondary};
        border-right: 1px solid #ddd;
      }
      
      .time-slot {
        padding: 4px;
        min-height: 40px;
        border-right: 1px solid #eee;
        border-bottom: 1px solid #eee;
        position: relative;
      }
      
      .session {
        background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#e3f2fd'};
        border: 1px solid ${colors.primary};
        border-radius: 3px;
        padding: 3px 6px;
        font-size: 10px;
        margin: 1px 0;
        position: relative;
      }
      
      .session.math { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#fef2f2'}; border-color: ${colors.math}; }
      .session.science { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#f0fdf4'}; border-color: ${colors.science}; }
      .session.english { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#faf5ff'}; border-color: ${colors.english}; }
      .session.social { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#fff7ed'}; border-color: ${colors.social}; }
      .session.art { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#fdf2f8'}; border-color: ${colors.art}; }
      .session.pe { background: ${colorScheme === 'blackwhite' ? '#f0f0f0' : '#f0f9ff'}; border-color: ${colors.pe}; }
      
      .session-title {
        font-weight: bold;
        margin-bottom: 2px;
      }
      
      .session-duration {
        font-size: 9px;
        color: ${colors.secondary};
      }
      
      .session-notes {
        font-size: 9px;
        color: ${colors.secondary};
        margin-top: 2px;
        font-style: italic;
      }
      
      .daily-layout {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }
      
      .daily-header {
        background: ${colors.primary};
        color: white;
        padding: 10px 15px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .daily-sessions {
        padding: 0 15px;
      }
      
      .daily-session {
        display: flex;
        align-items: flex-start;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .daily-time {
        width: 60px;
        font-weight: bold;
        color: ${colors.primary};
        flex-shrink: 0;
      }
      
      .daily-content {
        flex: 1;
        margin-left: 15px;
      }
      
      .monthly-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        border: 1px solid #ddd;
        margin-bottom: 20px;
      }
      
      .monthly-day {
        min-height: 80px;
        padding: 4px;
        border: 1px solid #eee;
        position: relative;
      }
      
      .monthly-day-number {
        font-weight: bold;
        font-size: 11px;
        margin-bottom: 4px;
      }
      
      .monthly-session {
        background: ${colors.accent};
        color: white;
        font-size: 8px;
        padding: 1px 3px;
        margin: 1px 0;
        border-radius: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .subject-section {
        margin-bottom: 25px;
        page-break-inside: avoid;
      }
      
      .subject-header {
        background: ${colors.primary};
        color: white;
        padding: 8px 12px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .subject-sessions {
        padding: 0 12px;
      }
      
      .subject-session {
        padding: 6px 0;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 10px;
        color: ${colors.secondary};
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin: 20px 0;
        padding: 15px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      
      .stat-item {
        text-align: center;
      }
      
      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: ${colors.primary};
        margin-bottom: 2px;
      }
      
      .stat-label {
        font-size: 10px;
        color: ${colors.secondary};
      }
      
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 15px 0;
        font-size: 10px;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid #ccc;
      }
      
      .completed {
        position: relative;
      }
      
      .completed::after {
        content: "✓";
        position: absolute;
        top: 2px;
        right: 2px;
        color: ${colors.accent};
        font-weight: bold;
        font-size: 10px;
      }
    `;
  }

  // Create weekly calendar layout
  createWeeklyLayout(scheduleData, includeNotes) {
    const { events = [], childName, dateRange } = scheduleData;
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.date || event.start), 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });

    // Generate week days
    const weekStart = dateRange?.start || startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = dateRange?.end || endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Time slots
    const timeSlots = [];
    for (let hour = 9; hour <= 15; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 15) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }

    // Calculate stats
    const totalHours = events.reduce((sum, e) => sum + (e.duration || 30), 0) / 60;
    const completedCount = events.filter(e => e.status === 'completed').length;
    const totalSubjects = new Set(events.map(e => e.subject_name || e.title)).size;

    return `
      <div class="page">
        <div class="header">
          <h1 class="title">Weekly Learning Schedule</h1>
          <p class="subtitle">${childName} • ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${Math.round(totalHours * 10) / 10}h</div>
            <div class="stat-label">Total Study Time</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${events.length}</div>
            <div class="stat-label">Sessions Scheduled</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${completedCount}</div>
            <div class="stat-label">Sessions Completed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${totalSubjects}</div>
            <div class="stat-label">Subjects</div>
          </div>
        </div>

        <div class="week-grid">
          <div class="time-label"></div>
          ${weekDays.map(day => `
            <div class="day-header">
              ${format(day, 'EEE')}<br>
              <span style="font-size: 14px; font-weight: normal;">${format(day, 'd')}</span>
            </div>
          `).join('')}
          
          ${timeSlots.map(timeSlot => `
            <div class="time-label">${timeSlot}</div>
            ${weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];
              const eventAtTime = dayEvents.find(event => {
                const eventTime = event.startTime || event.start_time || format(new Date(event.start), 'HH:mm');
                return eventTime.substring(0, 5) === timeSlot;
              });
              
              if (eventAtTime) {
                const subject = (eventAtTime.subject_name || eventAtTime.title || '').toLowerCase();
                const subjectClass = subject.includes('math') ? 'math' :
                                   subject.includes('science') ? 'science' :
                                   subject.includes('english') ? 'english' :
                                   subject.includes('social') || subject.includes('history') ? 'social' :
                                   subject.includes('art') ? 'art' :
                                   subject.includes('pe') || subject.includes('physical') ? 'pe' : '';
                
                return `
                  <div class="time-slot">
                    <div class="session ${subjectClass} ${eventAtTime.status === 'completed' ? 'completed' : ''}">
                      <div class="session-title">${eventAtTime.subject_name || eventAtTime.title}</div>
                      <div class="session-duration">${eventAtTime.duration || eventAtTime.duration_minutes || 30}min</div>
                      ${includeNotes && eventAtTime.notes ? `<div class="session-notes">${eventAtTime.notes}</div>` : ''}
                    </div>
                  </div>
                `;
              }
              
              return '<div class="time-slot"></div>';
            }).join('')}
          `).join('')}
        </div>

        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy')} • Learning Schedule for ${childName}
        </div>
      </div>
    `;
  }

  // Create daily schedule layout - simplified single page with all days
  createDailyLayout(scheduleData, includeNotes) {
    const { events = [], childName, dateRange } = scheduleData;
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.date || event.start), 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });

    const weekStart = dateRange?.start || startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = dateRange?.end || endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Calculate total stats
    const totalHours = events.reduce((sum, e) => sum + (e.duration || 30), 0) / 60;
    const totalSubjects = new Set(events.map(e => e.subject_name || e.title)).size;

    return `
      <div class="page">
        <div class="header">
          <h1 class="title">${scheduleData.selectedChildrenIds && scheduleData.selectedChildrenIds.length > 1 ? 'Multi-Child Daily Schedule' : 'Daily Learning Schedule'}</h1>
          <p class="subtitle">${childName} • ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}</p>
        </div>
        
        <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 25px; padding: 15px; background: #f8fafc; border-radius: 8px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #2563eb;">${Math.round(totalHours * 10) / 10}h</div>
            <div style="font-size: 11px; color: #64748b;">Total Study Time</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #059669;">${events.length}</div>
            <div style="font-size: 11px; color: #64748b;">Total Sessions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${totalSubjects}</div>
            <div style="font-size: 11px; color: #64748b;">Different Subjects</div>
          </div>
        </div>
        
        ${weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDate[dateKey] || []).sort((a, b) => {
            const timeA = a.startTime || a.start_time || format(new Date(a.start), 'HH:mm');
            const timeB = b.startTime || b.start_time || format(new Date(b.start), 'HH:mm');
            return timeA.localeCompare(timeB);
          });

          if (dayEvents.length === 0) return '';

          return `
            <div class="daily-layout" style="margin-bottom: 20px;">
              <div class="daily-header" style="font-size: 16px; padding: 8px 15px;">
                ${format(day, 'EEEE, MMMM d')}
              </div>
              <div class="daily-sessions">
                ${dayEvents.map(event => `
                  <div class="daily-session">
                    <div class="daily-time" style="font-size: 14px; min-width: 70px;">
                      ${event.startTime || event.start_time || format(new Date(event.start), 'HH:mm')}
                    </div>
                    <div class="daily-content">
                      <div style="font-weight: bold; margin-bottom: 2px; font-size: 14px;">
                        ${event.subject_name || event.title}
                        ${event.status === 'completed' ? ' ✓' : ''}
                      </div>
                      ${scheduleData.selectedChildrenIds && scheduleData.selectedChildrenIds.length > 1 ? `
                        <div style="font-size: 12px; color: #666; font-weight: 600; margin-bottom: 2px;">
                          ${scheduleData.selectedChildren ? 
                            scheduleData.selectedChildren.find(c => c.id === event.child_id)?.name || 'Unknown Child' : 
                            'Unknown Child'}
                        </div>
                      ` : ''}
                      <div style="font-size: 12px; color: #666;">
                        ${event.duration || event.duration_minutes || 30} minutes
                        ${includeNotes && event.notes ? ` • ${event.notes}` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy')} • Learning Schedule for ${childName}
        </div>
      </div>
    `;
  }

  // Create monthly overview layout
  createMonthlyLayout(scheduleData, includeNotes) {
    const { events = [], childName } = scheduleData;
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Create calendar grid
    const firstDayOfMonth = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.date || event.start), 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });

    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return `
      <div class="page">
        <div class="header">
          <h1 class="title">Monthly Overview</h1>
          <p class="subtitle">${childName} • ${format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        
        <div class="monthly-grid">
          <div class="day-header">Sun</div>
          <div class="day-header">Mon</div>
          <div class="day-header">Tue</div>
          <div class="day-header">Wed</div>
          <div class="day-header">Thu</div>
          <div class="day-header">Fri</div>
          <div class="day-header">Sat</div>
          
          ${weeks.map(week => 
            week.map(day => {
              if (!day) return '<div class="monthly-day"></div>';
              
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];
              
              return `
                <div class="monthly-day">
                  <div class="monthly-day-number">${format(day, 'd')}</div>
                  ${dayEvents.slice(0, 3).map(event => `
                    <div class="monthly-session">
                      ${event.subject_name || event.title}
                    </div>
                  `).join('')}
                  ${dayEvents.length > 3 ? `
                    <div style="font-size: 7px; color: #666;">+${dayEvents.length - 3} more</div>
                  ` : ''}
                </div>
              `;
            }).join('')
          ).join('')}
        </div>
        
        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy')} • Learning Schedule for ${childName}
        </div>
      </div>
    `;
  }

  // Create subject-organized layout
  createSubjectLayout(scheduleData, includeNotes) {
    const { events = [], childName, dateRange } = scheduleData;
    
    // Group events by subject
    const eventsBySubject = {};
    events.forEach(event => {
      const subject = event.subject_name || event.title || 'Other';
      if (!eventsBySubject[subject]) eventsBySubject[subject] = [];
      eventsBySubject[subject].push(event);
    });

    const weekStart = dateRange?.start || startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = dateRange?.end || endOfWeek(new Date(), { weekStartsOn: 1 });

    return `
      <div class="page">
        <div class="header">
          <h1 class="title">Schedule by Subject</h1>
          <p class="subtitle">${childName} • ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}</p>
        </div>
        
        ${Object.entries(eventsBySubject).map(([subject, subjectEvents]) => {
          const totalMinutes = subjectEvents.reduce((sum, e) => sum + (e.duration || 30), 0);
          const completedCount = subjectEvents.filter(e => e.status === 'completed').length;
          
          return `
            <div class="subject-section">
              <div class="subject-header">
                ${subject} • ${Math.round(totalMinutes / 60 * 10) / 10} hours • ${completedCount}/${subjectEvents.length} completed
              </div>
              <div class="subject-sessions">
                ${subjectEvents
                  .sort((a, b) => {
                    const dateA = new Date(a.date || a.start);
                    const dateB = new Date(b.date || b.start);
                    return dateA - dateB;
                  })
                  .map(event => `
                    <div class="subject-session">
                      <div>
                        <strong>${format(new Date(event.date || event.start), 'EEE, MMM d')}</strong>
                        at ${event.startTime || event.start_time || format(new Date(event.start), 'HH:mm')}
                        ${event.status === 'completed' ? ' ✓' : ''}
                        ${includeNotes && event.notes ? `<br><em style="font-size: 10px;">${event.notes}</em>` : ''}
                      </div>
                      <div style="text-align: right; color: #666;">
                        ${event.duration || event.duration_minutes || 30} min
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy')} • Learning Schedule for ${childName}
        </div>
      </div>
    `;
  }
}