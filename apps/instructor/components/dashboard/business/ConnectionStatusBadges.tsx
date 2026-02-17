'use client';

import { useState, useEffect } from 'react';
import { getStripeConnectStatus } from '@/lib/instructorApi';
import styles from './business.module.css';

type BadgeTone = 'green' | 'gray' | 'orange';

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const cls =
    tone === 'green'
      ? styles.badgeGreen
      : tone === 'orange'
        ? styles.badgeOrange
        : styles.badgeGray;

  return (
    <span className={`${styles.badge} ${cls}`}>
      <span className={styles.badgeDot} />
      {label}
    </span>
  );
}

export default function ConnectionStatusBadges({
  frostDeskConnected,
  calendarConnected,
}: {
  frostDeskConnected: boolean;
  calendarConnected: boolean | null;
}) {
  const [stripeTone, setStripeTone] = useState<BadgeTone>('gray');
  const [stripeLabel, setStripeLabel] = useState('Stripe: checking…');

  useEffect(() => {
    let cancelled = false;
    getStripeConnectStatus()
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'enabled' && res.chargesEnabled) {
          setStripeTone('green');
          setStripeLabel('Stripe: connected');
        } else if (res.status === 'pending' || res.status === 'restricted') {
          setStripeTone('orange');
          setStripeLabel('Stripe: requires onboarding');
        } else {
          setStripeTone('gray');
          setStripeLabel('Stripe: not connected');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStripeTone('gray');
          setStripeLabel('Stripe: unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const frostTone: BadgeTone = frostDeskConnected ? 'green' : 'gray';
  const frostLabel = frostDeskConnected ? 'FrostDesk: connected' : 'FrostDesk: disconnected';

  const calTone: BadgeTone =
    calendarConnected === null ? 'gray' : calendarConnected ? 'green' : 'gray';
  const calLabel =
    calendarConnected === null
      ? 'Calendar: checking…'
      : calendarConnected
        ? 'Google Calendar: connected'
        : 'Google Calendar: not connected';

  return (
    <div className={styles.statusBadges}>
      <Badge label={frostLabel} tone={frostTone} />
      <Badge label={calLabel} tone={calTone} />
      <Badge label={stripeLabel} tone={stripeTone} />
    </div>
  );
}
