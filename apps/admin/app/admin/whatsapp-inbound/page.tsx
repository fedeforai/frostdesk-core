import { fetchWhatsappInboundRaw } from '@/lib/adminApi';
import WhatsappInboundTable from '@/components/admin/WhatsappInboundTable';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

export default async function WhatsappInboundPage() {
  try {
    const data = await fetchWhatsappInboundRaw();

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'WhatsApp Inbound' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          WhatsApp Inbound
        </h1>
        <WhatsappInboundTable items={data.items} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'WhatsApp Inbound' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          WhatsApp Inbound
        </h1>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
