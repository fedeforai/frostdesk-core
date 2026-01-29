/**
 * Google Calendar API adapter.
 * Pure integration layer - no intelligent parsing, no filtering.
 * Events returned as-is from Google Calendar API.
 * Errors bubble up without transformation.
 */
export interface ExchangeAuthCodeResult {
    access_token: string;
    refresh_token: string | null;
    expires_in: number;
    token_type: string;
    scope?: string;
}
export interface RefreshAccessTokenResult {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
}
export interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    description?: string;
    start?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    status?: string;
    htmlLink?: string;
    created?: string;
    updated?: string;
    [key: string]: unknown;
}
export interface FetchEventsResult {
    items: GoogleCalendarEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
}
/**
 * Exchanges OAuth authorization code for access and refresh tokens.
 *
 * @param code - OAuth authorization code from Google
 * @returns Token response from Google OAuth API
 * @throws Error if API call fails (errors bubble up)
 */
export declare function exchangeAuthCode(code: string): Promise<ExchangeAuthCodeResult>;
/**
 * Refreshes an access token using a refresh token.
 *
 * @param refreshToken - Refresh token from previous OAuth exchange
 * @returns New token response from Google OAuth API
 * @throws Error if API call fails (errors bubble up)
 */
export declare function refreshAccessToken(refreshToken: string): Promise<RefreshAccessTokenResult>;
/**
 * Fetches calendar events from Google Calendar API.
 * Returns events exactly as received from Google - no parsing, no filtering.
 *
 * @param accessToken - OAuth access token
 * @param calendarId - Google Calendar ID (e.g., 'primary' or full email)
 * @param timeMin - Optional minimum time (ISO 8601)
 * @param timeMax - Optional maximum time (ISO 8601)
 * @param maxResults - Optional maximum number of results (default: 2500)
 * @param pageToken - Optional page token for pagination
 * @returns Events response from Google Calendar API
 * @throws Error if API call fails (errors bubble up)
 */
export declare function fetchEvents(accessToken: string, calendarId: string, timeMin?: string, timeMax?: string, maxResults?: number, pageToken?: string): Promise<FetchEventsResult>;
//# sourceMappingURL=google_calendar_adapter.d.ts.map