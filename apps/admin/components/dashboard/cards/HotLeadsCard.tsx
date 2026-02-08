import base from './card.module.css';
import styles from './HotLeadsCard.module.css';

export type Lead = { name: string; tag?: string; status?: string };

export default function HotLeadsCard({ leads }: { leads: Lead[] }) {
  return (
    <div className={base.card}>
      <h3 className={base.cardTitle}>Hot Leads Now</h3>
      <ul className={styles.list}>
        {leads.map((l) => (
          <li key={l.name} className={styles.row}>
            <div className={styles.left}>
              <div className={styles.name}>{l.name}</div>
              {l.tag && <div className={styles.tag}>{l.tag}</div>}
            </div>
            {l.status && <span className={styles.badge}>{l.status}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
