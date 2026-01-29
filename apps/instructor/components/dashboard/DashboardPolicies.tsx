type Policy = {
  id: string;
  rule_type: string;
  rule_title: string;
  version: number;
  is_active: boolean;
};

export function DashboardPolicies({ policies }: { policies: Policy[] }) {
  return (
    <section>
      <h3>Policies</h3>
      {policies.length === 0 && <p>No policies.</p>}
      <ul>
        {policies.map(p => (
          <li key={p.id}>
            {p.rule_type} — {p.rule_title} (v{p.version}) {p.is_active ? "active" : "inactive"}
          </li>
        ))}
      </ul>
    </section>
  );
}
