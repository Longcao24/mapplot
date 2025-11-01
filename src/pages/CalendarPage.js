/**
 * CalendarPage Component
 * Calendar view for tasks, appointments, and customer activities
 * Now with Google Calendar integration!
 */

import React, { useState, useEffect } from 'react';
import { useTaskManager } from '../hooks/useTaskManager';
import { 
  isAuthorized,
  isGapiInitialized,
  listUpcomingEvents,
  syncTaskToCalendar,
  createCalendarEvent,
  initializeGoogleAPI
} from '../services/googleCalendar';
import './CalendarPage.css';

export default function CalendarPage() {
  const { tasks } = useTaskManager();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Check Google Calendar connection and load events
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // First, ensure Google API is initialized
        await initializeGoogleAPI();
        
        // Then check if user is authorized
        const connected = isAuthorized();
        setIsGoogleConnected(connected);
        
        // Only load events if both initialized AND authorized
        if (connected && isGapiInitialized()) {
          await loadGoogleEvents();
        } else if (!connected) {
          console.log('⚠️ Not connected to Google Calendar. Please authorize first.');
        }
      } catch (error) {
        console.error('❌ Error initializing Google Calendar:', error);
      }
    };
    checkConnection();
  }, []);

  // Load Google Calendar events
  const loadGoogleEvents = async () => {
    // Don't try to load if not initialized
    if (!isGapiInitialized()) {
      console.warn('⚠️ Cannot load events: Google API not initialized');
      return;
    }

    try {
      setLoadingEvents(true);
      const events = await listUpcomingEvents(50);
      setGoogleEvents(events);
      console.log('✅ Loaded Google Calendar events:', events.length, 'events');
    } catch (error) {
      console.error('❌ Error loading Google Calendar events:', error);
      setGoogleEvents([]); // Set empty array on error
    } finally {
      setLoadingEvents(false);
    }
  };

  // Sync task to Google Calendar
  const handleSyncTask = async (task) => {
    try {
      console.log('🔄 Attempting to sync task:', task);
      await syncTaskToCalendar(task);
      alert('✅ Task synced to Google Calendar!');
      await loadGoogleEvents();
    } catch (error) {
      console.error('❌ Error syncing task:', error);
      let errorMessage = '❌ Failed to sync task to Google Calendar';
      
      if (error.message) {
        errorMessage += `\n\nReason: ${error.message}`;
      }
      
      if (error.result && error.result.error) {
        errorMessage += `\n\nDetails: ${error.result.error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    if (!tasks) return [];
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  // Get Google Calendar events for a specific date
  const getGoogleEventsForDate = (date) => {
    if (!googleEvents || googleEvents.length === 0) return [];
    const dateStr = date.toISOString().split('T')[0];
    
    return googleEvents.filter(event => {
      if (!event.start) return false;
      const eventDate = event.start.dateTime || event.start.date;
      if (!eventDate) return false;
      const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  // Get all items (tasks + events) for a specific date
  const getAllItemsForDate = (date) => {
    const localTasks = getTasksForDate(date);
    const calendarEvents = getGoogleEventsForDate(date);
    return { tasks: localTasks, events: calendarEvents };
  };

  // Navigation functions
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h1>Calendar</h1>
          <p className="calendar-subtitle">Manage your tasks and appointments</p>
          {isGoogleConnected && (
            <div className="google-sync-status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4"/>
                <path d="M12 7V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Google Calendar synced ({googleEvents.length} events)</span>
              <button className="btn-refresh" onClick={loadGoogleEvents} disabled={loadingEvents}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: loadingEvents ? 'spin 1s linear infinite' : 'none' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="calendar-header-actions">
          <button className="btn-secondary" onClick={goToToday}>
            Today
          </button>
          <div className="view-switcher">
            <button 
              className={view === 'month' ? 'active' : ''}
              onClick={() => setView('month')}
            >
              Month
            </button>
            <button 
              className={view === 'week' ? 'active' : ''}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button 
              className={view === 'day' ? 'active' : ''}
              onClick={() => setView('day')}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-content">
        <div className="calendar-main">
          {/* Calendar Navigation */}
          <div className="calendar-nav">
            <button className="nav-btn" onClick={goToPreviousMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 className="month-year">{monthName}</h2>
            <button className="nav-btn" onClick={goToNextMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date, index) => {
              const { tasks: dayTasks, events: dayEvents } = date ? getAllItemsForDate(date) : { tasks: [], events: [] };
              const totalItems = dayTasks.length + dayEvents.length;
              return (
                <div
                  key={index}
                  className={`calendar-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
                  onClick={() => date && setSelectedDate(date)}
                >
                  {date && (
                    <>
                      <div className="day-number">{date.getDate()}</div>
                      {totalItems > 0 && (
                        <div className="day-items">
                          {/* Show tasks */}
                          {dayTasks.slice(0, 2).map(task => (
                            <div key={`task-${task.id}`} className={`item-indicator task-indicator priority-${task.priority || 'none'}`} title={task.title}>
                              <span className="item-text">{task.title}</span>
                            </div>
                          ))}
                          {/* Show Google events */}
                          {dayEvents.slice(0, 2 - dayTasks.slice(0, 2).length).map((event, idx) => (
                            <div key={`event-${idx}`} className="item-indicator event-indicator" title={event.summary}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="#4285F4">
                                <circle cx="12" cy="12" r="10"/>
                              </svg>
                              <span className="item-text">{event.summary}</span>
                            </div>
                          ))}
                          {totalItems > 2 && (
                            <div className="item-more">+{totalItems - 2} more</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar with selected date details */}
        <div className="calendar-sidebar">
          <div className="sidebar-header">
            <h3>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          </div>

          <div className="sidebar-content">
            {(() => {
              const { tasks: dayTasks, events: dayEvents } = getAllItemsForDate(selectedDate);
              const hasItems = dayTasks.length > 0 || dayEvents.length > 0;
              
              if (!hasItems) {
                return (
                  <div className="no-tasks">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9 11l3 3L22 4"/>
                      {/* <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/> */}
                    </svg>
                    <p>No tasks or events scheduled</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Local Tasks */}
                  {dayTasks.length > 0 && (
                    <div className="tasks-section">
                      <div className="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <h4>Tasks ({dayTasks.length})</h4>
                      </div>
                      <div className="items-list">
                        {dayTasks.map(task => (
                          <div key={task.id} className="task-card">
                            <div className="task-header">
                              <div className={`priority-badge priority-${task.priority || 'none'}`}>
                                {task.priority || 'none'}
                              </div>
                              <div className={`status-badge ${task.status}`}>
                                {task.status}
                              </div>
                            </div>
                            <h4>{task.title}</h4>
                            {task.note && <p className="task-note">{task.note}</p>}
                            {task.task_type && (
                              <div className="task-type">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                </svg>
                                {task.task_type}
                              </div>
                            )}
                            {isGoogleConnected && (
                              <button 
                                className="sync-to-google-btn"
                                onClick={() => handleSyncTask(task)}
                                title="Sync to Google Calendar"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4"/>
                                  <path d="M12 7V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                Sync to Google
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Google Calendar Events */}
                  {dayEvents.length > 0 && (
                    <div className="events-section">
                      <div className="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4"/>
                          <path d="M12 7V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <h4>Google Calendar ({dayEvents.length})</h4>
                      </div>
                      <div className="items-list">
                        {dayEvents.map((event, idx) => (
                          <div key={idx} className="event-card">
                            <div className="event-header">
                              <div className="event-time">
                                {event.start.dateTime 
                                  ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                  : 'All day'}
                              </div>
                            </div>
                            <h4>{event.summary}</h4>
                            {event.description && (
                              <p className="event-description">{event.description}</p>
                            )}
                            {event.location && (
                              <div className="event-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                  <circle cx="12" cy="10" r="3"/>
                                </svg>
                                {event.location}
                              </div>
                            )}
                            {event.htmlLink && (
                              <a 
                                href={event.htmlLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="view-in-google"
                              >
                                View in Google Calendar →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

