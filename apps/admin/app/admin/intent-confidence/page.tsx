import { fetchIntentConfidence } from '@/lib/adminApi';
import IntentConfidenceChart from '@/components/admin/IntentConfidenceChart';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface IntentConfidencePageProps {
  searchParams: {
    from?: string;
    to?: string;
  };
}

export default async function IntentConfidencePage({ searchParams }: IntentConfidencePageProps) {
  const { from, to } = searchParams;

  try {
    const data = await fetchIntentConfidence({ from, to });

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Intent Confidence' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Intent Confidence Telemetry
        </h1>
        <IntentConfidenceChart buckets={data.buckets} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Intent Confidence' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Intent Confidence Telemetry
        </h1>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
