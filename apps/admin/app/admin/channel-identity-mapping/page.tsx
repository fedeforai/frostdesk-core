import { fetchChannelIdentityMappings } from '@/lib/adminApi';
import ChannelIdentityMappingTable from '@/components/admin/ChannelIdentityMappingTable';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

export default async function ChannelIdentityMappingPage() {
  try {
    const data = await fetchChannelIdentityMappings();

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Channel Identity Mapping' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          Channel Identity Mapping
        </h1>
        <ChannelIdentityMappingTable mappings={data.items} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Channel Identity Mapping' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          Channel Identity Mapping
        </h1>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
