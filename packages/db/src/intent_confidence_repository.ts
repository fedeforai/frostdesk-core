import { sql } from './client.js';

export async function getIntentConfidenceStats(params: {
  from?: string;
  to?: string;
}): Promise<Array<{
  bucket: 'low' | 'medium' | 'high';
  count: number;
}>> {
  const { from, to } = params;

  const result = await sql<Array<{
    bucket: 'low' | 'medium' | 'high';
    count: bigint;
  }>>`
    WITH confidence_buckets AS (
      SELECT 
        CASE
          WHEN (value->>'confidence')::numeric < 0.6 THEN 'low'
          WHEN (value->>'confidence')::numeric >= 0.6 AND (value->>'confidence')::numeric < 0.85 THEN 'medium'
          WHEN (value->>'confidence')::numeric >= 0.85 THEN 'high'
        END AS bucket
      FROM message_metadata
      WHERE key = 'intent_classification'
        AND value->>'confidence' IS NOT NULL
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
    )
    SELECT 
      bucket,
      COUNT(*)::bigint AS count
    FROM confidence_buckets
    WHERE bucket IS NOT NULL
    GROUP BY bucket
    ORDER BY 
      CASE bucket
        WHEN 'low' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'high' THEN 3
      END
  `;

  return result.map(row => ({
    bucket: row.bucket,
    count: Number(row.count),
  }));
}
