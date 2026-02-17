'use client';

import { useRouter } from 'next/navigation';
import base from './card.module.css';
import styles from './HotLeadsCard.module.css';

export type Lead = { name: string; tag?: string; status?: string; conversationId?: string };

export default function HotLeadsCard({ leads }: { leads: Lead[] }) {
  const router = useRouter();

  const openLead = (lead: Lead) => {
    if (lead.conversationId) {
      router.push(`/instructor/inbox?c=${encodeURIComponent(lead.conversationId)}`);
    } else {
      router.push(`/instructor/inbox?customer=${encodeURIComponent(lead.name)}`);
    }
  };

  return (
    <div className={base.card}>
      <h3 className={base.cardTitle}>Hot Leads Now</h3>

      <ul className={styles.list}>
        {leads.map((l) => (
          <li key={l.conversationId ?? l.name} className={styles.row}>
            <button
              type="button"
              className={styles.rowBtn}
              onClick={() => openLead(l)}
              aria-label={`Open ${l.name} in Inbox`}
            >
              <div className={styles.left}>
                <div className={styles.name}>{l.name}</div>
                {l.tag && <div className={styles.tag}>{l.tag}</div>}
              </div>
              {l.status && <span className={styles.badge}>{l.status}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
