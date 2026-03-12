'use client';

import { useRouter } from 'next/navigation';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations } from '@/lib/app/translations';
import base from './card.module.css';
import styles from './ConversationCard.module.css';

export type Conversation = {
  leadName: string;
  meta?: string;
  lastMessage?: string;
  conversationId?: string;
};

export default function ConversationCard({
  conversation,
}: {
  conversation: Conversation;
}) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale).dashboard;

  const openInInbox = () => {
    if (conversation.conversationId) {
      router.push(`/instructor/inbox?c=${encodeURIComponent(conversation.conversationId)}`);
    } else {
      router.push(`/instructor/inbox?customer=${encodeURIComponent(conversation.leadName)}`);
    }
  };

  return (
    <div className={base.card}>
      <div className={styles.headerRow}>
        <h3 className={base.cardTitle}>{t.conversation}</h3>

        <button
          type="button"
          className={styles.openBtn}
          onClick={openInInbox}
          aria-label={`${t.openInInbox} ${conversation.leadName}`}
        >
          {t.openInInbox}
        </button>
      </div>

      <div className={styles.leadName}>{conversation.leadName}</div>

      {conversation.meta && <div className={styles.meta}>{conversation.meta}</div>}

      {conversation.lastMessage && (
        <>
          <div className={styles.label}>{t.lastMessage}</div>
          <div className={styles.snippet}>{conversation.lastMessage}</div>
        </>
      )}
    </div>
  );
}
