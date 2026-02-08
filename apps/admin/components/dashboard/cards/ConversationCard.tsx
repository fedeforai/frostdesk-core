import base from './card.module.css';
import styles from './ConversationCard.module.css';

export type Conversation = {
  leadName: string;
  meta?: string;
  lastMessage?: string;
};

export default function ConversationCard({ conversation }: { conversation: Conversation }) {
  return (
    <div className={base.card}>
      <h3 className={base.cardTitle}>Conversation</h3>
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
