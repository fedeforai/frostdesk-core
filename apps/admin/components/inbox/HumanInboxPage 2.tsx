'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchHumanInbox,
  fetchHumanInboxDetail,
  sendOutboundMessage,
  type HumanInboxItem,
  type HumanInboxDetail,
} from '@/lib/adminApi';
import styles from './inbox.module.css';

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

function statusClass(needsHuman: boolean, status: string): string {
  if (needsHuman) return styles.statusHot;
  if (status === 'resolved' || status === 'closed') return styles.statusResolved;
  return styles.statusWaiting;
}

function statusLabel(needsHuman: boolean, status: string): string {
  if (needsHuman) return 'needs reply';
  return status || 'waiting';
}

export default function HumanInboxPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);

  const [conversations, setConversations] = useState<HumanInboxItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [detail, setDetail] = useState<HumanInboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setListError(null);
    setListLoading(true);
    try {
      const res = await fetchHumanInbox();
      setConversations(res.items);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setListError(err?.message ?? 'Failed to load inbox');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadDetail = useCallback(async (conversationId: string) => {
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetchHumanInboxDetail(conversationId);
      setDetail(res.detail);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDetailError(err?.message ?? 'Failed to load conversation');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleSend = async () => {
    if (!selectedId || !composerText.trim() || sending) return;
    setSending(true);
    try {
      await sendOutboundMessage({
        conversationId: selectedId,
        text: composerText.trim(),
      });
      setComposerText('');
      void loadDetail(selectedId);
      void loadConversations();
    } catch {
      // keep text in composer so user can retry
    } finally {
      setSending(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.conversation_id.toLowerCase().includes(q) ||
        (c.last_message.text ?? '').toLowerCase().includes(q) ||
        c.channel.toLowerCase().includes(q)
    );
  }, [search, conversations]);

  const selectedConv = selectedId
    ? conversations.find((c) => c.conversation_id === selectedId) ?? null
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.title}>Inbox</h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
            Conversations requiring attention
          </p>
        </div>
      </div>

      {listError && (
        <div style={{
          padding: '0.75rem 1rem',
          margin: '0 0 1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => void loadConversations()}
            style={{
              padding: '4px 12px',
              border: '1px solid #fecaca',
              borderRadius: '0.375rem',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#991b1b',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.twoCol}>
        {/* ── List panel ────────────────────────── */}
        <div className={styles.listPanel}>
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

          {listLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
              Loading conversations…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
              No conversations
            </div>
          ) : (
            <ul className={styles.conversationList}>
              {filtered.map((c) => (
                <li key={c.conversation_id}>
                  <button
                    type="button"
                    className={`${styles.convItem} ${selectedId === c.conversation_id ? styles.convItemSelected : ''}`}
                    onClick={() => setSelectedId(c.conversation_id)}
                  >
                    <div className={styles.convName}>
                      {c.channel}
                      {c.needs_human && (
                        <span style={{ marginLeft: 6, fontSize: '0.625rem', color: '#dc2626', fontWeight: 700 }}>
                          ● NEEDS REPLY
                        </span>
                      )}
                    </div>
                    <div className={styles.convPreview}>
                      {c.last_message.text?.slice(0, 120) ?? '—'}
                    </div>
                    <div className={styles.convMeta}>
                      <span className={styles.channelTag}>{c.channel}</span>
                      <span>{formatLastActivity(c.last_activity_at)}</span>
                      <span className={`${styles.statusBadge} ${statusClass(c.needs_human, c.status)}`}>
                        {statusLabel(c.needs_human, c.status)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Detail panel ────────────────────────── */}
        <div className={styles.detailPanel}>
          {selectedConv && selectedId ? (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailName}>
                  {selectedConv.channel} conversation
                </div>
                <div className={styles.detailMeta}>
                  ID: {selectedId.slice(0, 8)}… · Status: {selectedConv.status} · Last activity{' '}
                  {formatLastActivity(selectedConv.last_activity_at)}
                </div>
              </div>

              <div className={styles.messagesWrap}>
                {detailLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    Loading messages…
                  </div>
                ) : detailError ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#991b1b', fontSize: '0.875rem' }}>
                    {detailError}
                  </div>
                ) : detail && detail.messages.length > 0 ? (
                  detail.messages.map((m) => {
                    const isCustomer = m.direction === 'inbound';
                    return (
                      <div
                        key={m.message_id}
                        className={`${styles.message} ${
                          isCustomer ? styles.messageCustomer : styles.messageInstructor
                        }`}
                      >
                        <div className={styles.messageRole}>
                          {isCustomer ? 'customer' : 'outbound'}
                          {m.intent && (
                            <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#6b7280' }}>
                              intent: {m.intent}
                              {m.confidence != null && ` (${Math.round(m.confidence * 100)}%)`}
                            </span>
                          )}
                        </div>
                        <div>{m.message_text ?? ''}</div>
                        <div className={styles.messageTime}>
                          {formatMessageTime(m.created_at)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    No messages
                  </div>
                )}

                {detail?.booking && (
                  <div style={{
                    margin: '1rem 0',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#166534',
                  }}>
                    Booking: {detail.booking.status} (ID: {detail.booking.booking_id.slice(0, 8)}…)
                  </div>
                )}
              </div>

              <div className={styles.composerWrap}>
                <textarea
                  className={styles.composerTextarea}
                  placeholder="Type a message (admin outbound)…"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  rows={2}
                  aria-label="Message composer"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={!composerText.trim() || sending}
                  onClick={() => void handleSend()}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  );
}
