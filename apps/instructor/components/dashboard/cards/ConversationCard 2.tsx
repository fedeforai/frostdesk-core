'use client';

import { useRouter } from 'next/navigation';
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
        <h3 className={base.cardTitle}>Conversation</h3>

        <button
          type="button"
          className={styles.openBtn}
          onClick={openInInbox}
          aria-label={`Open ${conversation.leadName} in Inbox`}
        >
          Open in Inbox
        </button>
      </div>

      <div className={styles.leadName}>{conversation.leadName}</div>

      {conversation.meta && <div className={styles.meta}>{conversation.meta}</div>}

      {conversation.lastMessage && (
        <>
          <div className={styles.label}>Last message</div>
          <div className={styles.snippet}>{conversation.lastMessage}</div>
        </>
      )}
    </div>
  );
}
