export interface CreateCalendarEventParams {
  calendarId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  metadata?: Record<string, string>;
}

export interface CreateCalendarEventResult {
  eventId: string;
}

export interface DeleteCalendarEventParams {
  calendarId: string;
  eventId: string;
}

export interface GetCalendarAvailabilityParams {
  calendarId: string;
  startTime: Date;
  endTime: Date;
}

export interface CalendarAvailabilityWindow {
  startTime: Date;
  endTime: Date;
}

/**
 * Creates a calendar event on Google Calendar.
 * 
 * @param params - Event creation parameters
 * @returns Event ID from Google Calendar
 * @throws Error if API call fails
 */
export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CreateCalendarEventResult> {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required');
  }

  const event = {
    summary: params.title,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: 'UTC',
    },
    extendedProperties: params.metadata ? {
      private: params.metadata,
    } : undefined,
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create calendar event: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return {
    eventId: result.id,
  };
}

/**
 * Deletes a calendar event from Google Calendar.
 * 
 * @param params - Event deletion parameters
 * @throws Error if API call fails
 */
export async function deleteCalendarEvent(
  params: DeleteCalendarEventParams
): Promise<void> {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required');
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(params.eventId)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete calendar event: ${response.status} ${errorText}`);
  }
}

/**
 * Gets calendar availability (occupied time windows) for a given time range.
 * 
 * @param params - Availability query parameters
 * @returns Array of occupied time windows
 * @throws Error if API call fails
 */
export async function getCalendarAvailability(
  params: GetCalendarAvailabilityParams
): Promise<CalendarAvailabilityWindow[]> {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required');
  }

  const timeMin = params.startTime.toISOString();
  const timeMax = params.endTime.toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get calendar availability: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const occupiedWindows: CalendarAvailabilityWindow[] = [];

  if (result.items && Array.isArray(result.items)) {
    for (const event of result.items) {
      if (event.start && event.start.dateTime && event.end && event.end.dateTime) {
        occupiedWindows.push({
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
        });
      }
    }
  }

  return occupiedWindows;
}
