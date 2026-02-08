// apps/admin/components/inbox/HumanInboxPage.tsx

'use client';

import { useMemo, useState } from 'react';
import AppShell from '@/components/shell/AppShell';
import StatusPill from '@/components/shared/StatusPill';
import { useAdminCheck, setAdminToken } from '@/components/shared/useAdminCheck';
import {
  MOCK_CONVERSATIONS,
  getMockMessages,
  type MockConversation,
  type MockMessage,
} from './mockInboxData';
import { kpiStore } from '@/lib/kpiStore';
import styles from './inbox.module.css';

const API_BASE = 'http://127.0.0.1:3001';

function formatLastActivity(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function statusClass(status: MockConversation['status']): string {
  return status === 'hot'
    ? styles.statusHot
    : status === 'waiting'
      ? styles.statusWaiting
      : styles.statusResolved;
}

type DraftState = Record<string, { used: boolean }>;

export default function HumanInboxPage() {
  const adminCheck = useAdminCheck(API_BASE);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState('');
  const [composerText, setComposerText] = useState('');

  // local UI state: which drafts have been used
  const [draftState, setDraftState] = useState<DraftState>({});
  // local UI state: appended "sent messages" when using a draft
  const [localSent, setLocalSent] = useState<Record<string, MockMessage[]>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_CONVERSATIONS;
    return MOCK_CONVERSATIONS.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.lastMessagePreview.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = selectedId
    ? MOCK_CONVERSATIONS.find((c) => c.id === selectedId) ?? null
    : null;

  const baseMessages: MockMessage[] = selectedId ? getMockMessages(selectedId) : [];
  const appendedMessages: MockMessage[] = selectedId ? (localSent[selectedId] ?? []) : [];
  const messages: MockMessage[] = [...baseMessages, ...appendedMessages];

  const handlePasteToken = () => {
    const t = pasteValue.trim();
    if (t) {
      setAdminToken(t);
      adminCheck.refetch();
      setPasteValue('');
    }
  };

  const handleUseDraft = (draftMsg: MockMessage) => {
    // mark used
    setDraftState((prev) => ({
      ...prev,
      [draftMsg.id]: { used: true },
    }));

    // KPI: Draft used +1
    kpiStore.incrementDraftUsed();

    // simulate sending draft as instructor message to customer
    if (selectedId) {
      const sent: MockMessage = {
        id: `${selectedId}-sent-${Date.now()}`,
        role: 'instructor',
        text: draftMsg.text,
        createdAt: new Date().toISOString(),
      };
      setLocalSent((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), sent],
      }));
    }
  };

  const handleDismissDraft = (draftMsg: MockMessage) => {
    // if you want: mark as used OR add a separate dismissed state.
    // minimal: mark used so buttons disable and UI shows it's no longer actionable
    setDraftState((prev) => ({
      ...prev,
      [draftMsg.id]: { used: true },
    }));
  };

  const selectedConversationMeta = selectedId
    ? MOCK_CONVERSATIONS.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <h1 className={styles.title}>Human Inbox</h1>
          <div className={styles.bannerRow}>
            <StatusPill label={adminCheck.label} tone={adminCheck.tone} />
            {adminCheck.message && (
              <span className={styles.bannerMessage}>{adminCheck.message}</span>
            )}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.listPanel}>
            <div className={styles.pasteRow}>
              <input
                type="text"
                className={styles.pasteInput}
                placeholder="Paste token"
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                aria-label="Paste token"
              />
              <button
                type="button"
                className={styles.pasteBtn}
                onClick={handlePasteToken}
              >
                Paste token
              </button>
            </div>

            <div className={styles.searchWrap}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search conversations"
              />
            </div>

            <ul className={styles.conversationList}>
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`${styles.convItem} ${selectedId === c.id ? styles.convItemSelected : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className={styles.convName}>{c.customerName}</div>
                    <div className={styles.convPreview}>{c.lastMessagePreview}</div>
                    <div className={styles.convMeta}>
                      <span className={styles.channelTag}>{c.channel}</span>
                      <span>{formatLastActivity(c.updatedAt)}</span>
                      <span className={`${styles.statusBadge} ${statusClass(c.status)}`}>
                        {c.status}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className={styles.unread}>{c.unreadCount}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.detailPanel}>
            {selectedConversationMeta ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailName}>
                    {selectedConversationMeta.customerName}
                  </div>
                  <div className={styles.detailMeta}>
                    {selectedConversationMeta.channel} · Last activity{' '}
                    {formatLastActivity(selectedConversationMeta.updatedAt)}
                  </div>
                </div>

                <div className={styles.messagesWrap}>
                  {messages.map((m) => {
                    // AI Draft is not part of the customer chat bubble stream
                    if (m.role === 'ai_draft') {
                      const used = draftState[m.id]?.used === true;
                      return (
                        <div key={m.id} className={styles.draftWrap}>
                          <div className={styles.draftHeaderRow}>
                            <div className={styles.draftTitle}>AI suggested draft</div>
                            {used && <span className={styles.usedBadge}>USED</span>}
                          </div>

                          <div>{m.text}</div>

                          <div className={styles.draftActions}>
                            <button
                              type="button"
                              className={`${styles.draftBtnPrimary} ${used ? styles.btnDisabled : ''}`}
                              disabled={used}
                              onClick={() => handleUseDraft(m)}
                            >
                              Use draft
                            </button>
                            <button
                              type="button"
                              className={`${styles.draftBtnSecondary} ${used ? styles.btnDisabled : ''}`}
                              disabled={used}
                              onClick={() => handleDismissDraft(m)}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // customer / instructor are real chat bubbles
                    return (
                      <div
                        key={m.id}
                        className={`${styles.message} ${
                          m.role === 'customer'
                            ? styles.messageCustomer
                            : styles.messageInstructor
                        }`}
                      >
                        <div className={styles.messageRole}>
                          {m.role === 'customer' ? 'customer' : 'instructor'}
                        </div>
                        <div>{m.text}</div>
                        <div className={styles.messageTime}>
                          {formatMessageTime(m.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.composerWrap}>
                  <textarea
                    className={styles.composerTextarea}
                    placeholder="Type a message to the customer…"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    rows={2}
                    aria-label="Message composer"
                  />
                  <button type="button" className={styles.sendBtn} disabled>
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyDetail}>Select a conversation</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
