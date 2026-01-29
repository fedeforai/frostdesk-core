/**
 * Google Calendar API adapter.
 * Pure integration layer - no intelligent parsing, no filtering.
 * Events returned as-is from Google Calendar API.
 * Errors bubble up without transformation.
 */
/**
 * Exchanges OAuth authorization code for access and refresh tokens.
 *
 * @param code - OAuth authorization code from Google
 * @returns Token response from Google OAuth API
 * @throws Error if API call fails (errors bubble up)
 */
export async function exchangeAuthCode(code) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables are required');
    }
    const formData = new URLSearchParams();
    formData.append('code', code);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('redirect_uri', redirectUri);
    formData.append('grant_type', 'authorization_code');
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to exchange auth code: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    return {
        access_token: result.access_token,
        refresh_token: result.refresh_token || null,
        expires_in: result.expires_in,
        token_type: result.token_type,
        scope: result.scope,
    };
}
/**
 * Refreshes an access token using a refresh token.
 *
 * @param refreshToken - Refresh token from previous OAuth exchange
 * @returns New token response from Google OAuth API
 * @throws Error if API call fails (errors bubble up)
 */
export async function refreshAccessToken(refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
    }
    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('grant_type', 'refresh_token');
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh access token: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    return {
        access_token: result.access_token,
        expires_in: result.expires_in,
        token_type: result.token_type,
        scope: result.scope,
    };
}
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
export async function fetchEvents(accessToken, calendarId, timeMin, timeMax, maxResults, pageToken) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    if (timeMin) {
        url.searchParams.append('timeMin', timeMin);
    }
    if (timeMax) {
        url.searchParams.append('timeMax', timeMax);
    }
    if (maxResults !== undefined) {
        url.searchParams.append('maxResults', maxResults.toString());
    }
    else {
        url.searchParams.append('maxResults', '2500');
    }
    if (pageToken) {
        url.searchParams.append('pageToken', pageToken);
    }
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch calendar events: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    return {
        items: result.items || [],
        nextPageToken: result.nextPageToken,
        nextSyncToken: result.nextSyncToken,
    };
}
//# sourceMappingURL=google_calendar_adapter.js.map