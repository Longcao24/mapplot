/**
 * Google Calendar Integration Service
 * Handles OAuth authentication and calendar API operations
 */

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY_calendar;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Initialize Google API client
 */
export const initializeGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    if (gapiInited && gisInited) {
      resolve();
      return;
    }

    // Load GAPI client
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = async () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          console.log('✅ Google API Client initialized');
          if (gisInited) resolve();
        } catch (error) {
          console.error('❌ Error initializing GAPI:', error);
          reject(error);
        }
      });
    };
    document.body.appendChild(gapiScript);

    // Load GIS (Google Identity Services)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // Will be set during authorization
      });
      gisInited = true;
      console.log('✅ Google Identity Services initialized');
      if (gapiInited) resolve();
    };
    document.body.appendChild(gisScript);
  });
};

/**
 * Authorize with Google Calendar
 */
export const authorizeGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    tokenClient.callback = async (response) => {
      if (response.error !== undefined) {
        console.error('❌ Authorization error:', response);
        reject(response);
        return;
      }
      
      console.log('✅ Authorization successful');
      
      // Store access token
      localStorage.setItem('google_access_token', response.access_token);
      localStorage.setItem('google_token_expiry', Date.now() + (response.expires_in * 1000));
      
      resolve(response);
    };

    // Check if already authorized
    const token = window.gapi.client.getToken();
    if (token === null) {
      // Prompt for authorization
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Already authorized
      resolve(token);
    }
  });
};

/**
 * Check if Google API is initialized
 */
export const isGapiInitialized = () => {
  return gapiInited && gisInited;
};

/**
 * Check if user is authorized
 */
export const isAuthorized = () => {
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  
  if (!token || !expiry) return false;
  
  // Check if token is expired
  return Date.now() < parseInt(expiry);
};

/**
 * Revoke access token
 */
export const revokeGoogleCalendar = () => {
  try {
    // Check if gapi is initialized before trying to revoke
    if (gapiInited && window.gapi && window.gapi.client) {
      const token = window.gapi.client.getToken();
      if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Access token revoked');
        });
        window.gapi.client.setToken(null);
      }
    }
  } catch (error) {
    console.warn('⚠️ Error revoking token:', error);
  }
  
  // Always clear localStorage
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
};

/**
 * Set access token if exists
 */
export const setStoredToken = () => {
  // Check if gapi is initialized
  if (!gapiInited || !window.gapi || !window.gapi.client) {
    console.warn('⚠️ Cannot set token: Google API not initialized');
    return false;
  }

  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  
  if (token && expiry && Date.now() < parseInt(expiry)) {
    window.gapi.client.setToken({ access_token: token });
    return true;
  }
  return false;
};

/**
 * List upcoming calendar events
 */
export const listUpcomingEvents = async (maxResults = 10) => {
  try {
    // Check if gapi is initialized
    if (!gapiInited || !window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      console.warn('⚠️ Google API not fully initialized yet');
      throw new Error('Google API not initialized');
    }
    
    // Ensure token is set
    if (!isAuthorized()) {
      throw new Error('Not authorized. Please connect Google Calendar first.');
    }
    
    // Set the stored token before making API call
    setStoredToken();

    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: maxResults,
      orderBy: 'startTime',
    });

    const events = response.result.items;
    console.log('📅 Upcoming events:', events);
    return events || [];
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    if (error.result) {
      console.error('Error details:', error.result.error);
    }
    throw error;
  }
};

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (eventData) => {
  try {
    // Ensure API is initialized
    if (!gapiInited || !window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      throw new Error('Google Calendar API not initialized');
    }
    
    // Validate input data
    if (!eventData.title) {
      throw new Error('Event title is required');
    }
    if (!eventData.startTime || !eventData.endTime) {
      throw new Error('Event start and end times are required');
    }
    
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };
    
    // Only add attendees if there are valid ones
    if (eventData.attendees && eventData.attendees.length > 0) {
      event.attendees = eventData.attendees;
    }

    console.log('📤 Creating Google Calendar event:', event);

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('✅ Event created:', response.result);
    return response.result;
  } catch (error) {
    console.error('❌ Error creating event:', error);
    if (error.result) {
      console.error('Error details:', error.result.error);
    }
    throw error;
  }
};

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = async (eventId, eventData) => {
  try {
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await window.gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });

    console.log('✅ Event updated:', response.result);
    return response.result;
  } catch (error) {
    console.error('❌ Error updating event:', error);
    throw error;
  }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (eventId) => {
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log('✅ Event deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    throw error;
  }
};

/**
 * Get calendar list
 */
export const getCalendarList = async () => {
  try {
    const response = await window.gapi.client.calendar.calendarList.list();
    console.log('📋 Calendar list:', response.result.items);
    return response.result.items || [];
  } catch (error) {
    console.error('❌ Error fetching calendar list:', error);
    throw error;
  }
};

/**
 * Sync task to Google Calendar
 */
export const syncTaskToCalendar = async (task) => {
  try {
    // Ensure token is set
    if (!isAuthorized()) {
      throw new Error('Not authorized. Please connect Google Calendar first.');
    }
    
    // Set the stored token before making API call
    setStoredToken();
    
    // Parse the due date properly (handling timezone issues)
    let startTime, endTime;
    if (task.due_date) {
      // Parse date string carefully to avoid timezone conversion issues
      let dueDate;
      const dateStr = task.due_date.toString();
      
      // If it's a date-only string (YYYY-MM-DD), parse it in local timezone
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        dueDate = new Date(year, month - 1, day, 9, 0, 0, 0); // 9 AM local time
      } else {
        // Otherwise parse normally
        dueDate = new Date(task.due_date);
      }
      
      // If it's an invalid date, use current time
      if (isNaN(dueDate.getTime())) {
        startTime = new Date().toISOString();
        endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      } else {
        // Ensure time is set to 9 AM if not already set
        if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0 && dueDate.getSeconds() === 0) {
          dueDate.setHours(9, 0, 0, 0);
        }
        startTime = dueDate.toISOString();
        // End time is 1 hour later (10 AM)
        endTime = new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString();
        
        console.log('📅 Parsed due date:', {
          original: task.due_date,
          parsed: dueDate.toLocaleDateString(),
          startTime: new Date(startTime).toLocaleString(),
          endTime: new Date(endTime).toLocaleString()
        });
      }
    } else {
      // No due date - use current time
      startTime = new Date().toISOString();
      endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    
    // Validate email for attendees
    const validateEmail = (email) => {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };
    
    // Build attendees list only if assigned_to is a valid email
    const attendees = [];
    if (task.assigned_to && validateEmail(task.assigned_to)) {
      attendees.push({ email: task.assigned_to.trim() });
    }
    
    // Convert task to calendar event format
    const eventData = {
      title: task.title,
      description: task.note || task.description || `Task: ${task.title}\nPriority: ${task.priority || 'none'}\nStatus: ${task.status}`,
      startTime: startTime,
      endTime: endTime,
      attendees: attendees,
    };

    console.log('🔄 Syncing task to Google Calendar:', eventData);
    
    const event = await createCalendarEvent(eventData);
    console.log('✅ Task synced to calendar:', event);
    return event;
  } catch (error) {
    console.error('❌ Error syncing task:', error);
    console.error('Task data:', task);
    throw error;
  }
};

