import type { IntentConfidenceBucket } from '@/lib/adminApi';

interface IntentConfidenceChartProps {
  buckets: IntentConfidenceBucket[];
}

/**
 * READ-ONLY intent confidence chart component.
 * 
 * WHAT IT DOES:
 * - Displays confidence buckets (low/medium/high) with counts
 * - Shows simple bar visualization
 * - Pure presentation component
 * 
 * WHAT IT DOES NOT DO:
 * - No interactions
 * - No buttons
 * - No actions
 * - No thresholds
 * - No mutations
 */
export default function IntentConfidenceChart({ buckets }: IntentConfidenceChartProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'high':
        return '#10b981'; // green
      case 'medium':
        return '#f59e0b'; // amber
      case 'low':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getBucketLabel = (bucket: string) => {
    switch (bucket) {
      case 'high':
        return 'High (≥85%)';
      case 'medium':
        return 'Medium (60-85%)';
      case 'low':
        return 'Low (<60%)';
      default:
        return bucket;
    }
  };

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ 
        marginBottom: '1.5rem', 
        fontSize: '1.25rem', 
        fontWeight: '600',
        color: '#111827',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        Intent Confidence Distribution
      </h2>

      {total === 0 ? (
        <p style={{ color: '#6b7280', padding: '1rem' }}>No data available</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {buckets.map((bucket) => {
            const percentage = total > 0 ? (bucket.count / total) * 100 : 0;
            const barWidth = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;

            return (
              <div key={bucket.bucket} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151' 
                  }}>
                    {getBucketLabel(bucket.bucket)}
                  </span>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280',
                      fontFamily: 'monospace',
                    }}>
                      {bucket.count.toLocaleString()}
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280',
                      minWidth: '3rem',
                      textAlign: 'right',
                    }}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '1.5rem', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '0.25rem',
                  overflow: 'hidden',
                }}>
                  <div style={{ 
                    width: `${barWidth}%`, 
                    height: '100%', 
                    backgroundColor: getBucketColor(bucket.bucket),
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })}
          
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              Total Classifications
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              fontFamily: 'monospace',
              color: '#111827',
              fontWeight: '600',
            }}>
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
