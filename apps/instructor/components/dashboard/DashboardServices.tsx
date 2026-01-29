type Service = {
  id: string;
  service_name: string;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  is_active: boolean;
};

export function DashboardServices({ services }: { services: Service[] }) {
  return (
    <section>
      <h3>Services</h3>
      {services.length === 0 && <p>No services configured.</p>}
      <ul>
        {services.map(s => (
          <li key={s.id}>
            {s.service_name} — {s.duration_minutes} min — {s.price_amount} {s.price_currency} ({s.is_active ? "active" : "inactive"})
          </li>
        ))}
      </ul>
    </section>
  );
}
