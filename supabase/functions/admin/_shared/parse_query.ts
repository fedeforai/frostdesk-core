export interface ParsedQueryParams {
  limit: number;
  offset: number;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | number | undefined;
}

/**
 * Parses query parameters from URL with safe defaults.
 * 
 * @param url - Request URL
 * @returns Parsed query parameters
 */
export function parseQuery(url: string): ParsedQueryParams {
  const urlObj = new URL(url);
  const params: ParsedQueryParams = {
    limit: 50,
    offset: 0,
  };

  // Parse limit
  const limitParam = urlObj.searchParams.get('limit');
  if (limitParam) {
    const limit = Number(limitParam);
    if (!isNaN(limit) && limit > 0) {
      params.limit = Math.min(limit, 100); // Cap at 100
    }
  }

  // Parse offset
  const offsetParam = urlObj.searchParams.get('offset');
  if (offsetParam) {
    const offset = Number(offsetParam);
    if (!isNaN(offset) && offset >= 0) {
      params.offset = offset;
    }
  }

  // Parse dateFrom
  const dateFrom = urlObj.searchParams.get('dateFrom');
  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  // Parse dateTo
  const dateTo = urlObj.searchParams.get('dateTo');
  if (dateTo) {
    params.dateTo = dateTo;
  }

  // Parse other string parameters
  for (const [key, value] of urlObj.searchParams.entries()) {
    if (!['limit', 'offset', 'dateFrom', 'dateTo'].includes(key)) {
      params[key] = value;
    }
  }

  return params;
}
