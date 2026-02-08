'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import AppShell from '@/components/shell/AppShell';
import styles from './inbox.module.css';

import {
  getConversations,
  getMessages,
  sendInstructorReply,
  getConversationDraft,
  useDraft,
  ignoreDraft,
  type InstructorConversation,
  type InstructorMessage,
  type ConversationDraft,
} from '@/lib/instructorApi';
import { usePolling } from '@/lib/usePolling';
import { mergeConversations } from '@/lib/mergeConversations';

import { useLivePolling } from './useLivePolling';

type UiMessage = InstructorMessage & {
  clientStatus?: 'sending' | 'failed';
  clientError?: string;
  clientTempId?: string;
};

type ErrorState = { status?: number; message: string } | null;

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

function statusClass(status: InstructorConversation['status']): string {
  return status === 'hot' ? styles.statusHot : styles.statusWaiting;
}

function findConversationIdByCustomer(
  conversations: InstructorConversation[],
  customer: string
): string | null {
  const q = customer.trim().toLowerCase();
  if (!q) return null;

  const exact = conversations.find((c) => c.customerName.toLowerCase() === q);
  if (exact) return exact.id;

  const partial = conversations.find((c) => c.customerName.toLowerCase().includes(q));
  return partial ? partial.id : null;
}

function sortByCreatedAt(list: UiMessage[]): UiMessage[] {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export default function HumanInboxPage() {
  const sp = useSearchParams();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');

  const [conversations, setConversations] = useState<InstructorConversation[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [messagesByConversationId, setMessagesByConversationId] = useState<
    Record<string, UiMessage[]>
  >({});
  const [messagesLoadingById, setMessagesLoadingById] = useState<Record<string, boolean>>(
    {}
  );

  const [error, setError] = useState<ErrorState>(null);

  const [authBlocked, setAuthBlocked] = useState(false);
  const [pollingBlocked, setPollingBlocked] = useState(false);

  const [draftsByConversationId, setDraftsByConversationId] = useState<
    Record<string, ConversationDraft | null>
  >({});
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadConversations = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;

      if (!silent) {
        setError(null);
        setListLoading(true);
      }

      try {
        const list = await getConversations();
        setConversations(list);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const status = err?.status as number | undefined;
        const message = err?.message || 'Failed to load conversations';

        // Silent ticks should not spam the UI
        if (!silent) setError({ status, message });

        if (status === 401 || status === 403) {
          setAuthBlocked(true);
          setError({ status, message });
        }
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    []
  );

  const loadMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean; force?: boolean }) => {
      const silent = opts?.silent === true;
      const _force = opts?.force === true;

      if (!silent) {
        setError(null);
        setMessagesLoadingById((prev) => ({ ...prev, [conversationId]: true }));
      }

      try {
        const msgs = await getMessages(conversationId);
        setMessagesByConversationId((prev) => ({
          ...prev,
          [conversationId]: sortByCreatedAt(msgs as UiMessage[]),
        }));
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const status = err?.status as number | undefined;
        const message = err?.message || 'Failed to load messages';

        if (!silent) setError({ status, message });

        if (status === 401 || status === 403) {
          setAuthBlocked(true);
          setError({ status, message });
        }

        // If forced refresh fails, keep prior cached messages
        if (_force) return;
      } finally {
        if (!silent) {
          setMessagesLoadingById((prev) => ({ ...prev, [conversationId]: false }));
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const refreshConversationListSoft = useCallback(async () => {
    if (pollingBlocked) return;
    try {
      const fresh = await getConversations();
      setConversations((prev) => mergeConversations(prev, fresh));
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err?.status;
      if (status === 401 || status === 403) {
        setPollingBlocked(true);
        setAuthBlocked(true);
        setError({ status, message: err?.message || 'Authorization error' });
      }
    }
  }, [pollingBlocked]);

  usePolling(refreshConversationListSoft, 5000, !pollingBlocked);

  // Preselect from query params after conversations load
  useEffect(() => {
    if (!conversations.length) return;

    const byId = sp.get('c');
    if (byId) {
      const exists = conversations.some((c) => c.id === byId);
      if (exists) {
        setSelectedId(byId);
        return;
      }
    }

    const byCustomer = sp.get('customer');
    if (byCustomer) {
      const id = findConversationIdByCustomer(conversations, byCustomer);
      if (id) setSelectedId(id);
    }
  }, [conversations, sp]);

  // Load messages when selected changes (with caching)
  useEffect(() => {
    if (!selectedId) return;
    if (messagesByConversationId[selectedId]) return;
    void loadMessages(selectedId);
  }, [selectedId, messagesByConversationId, loadMessages]);

  // Load draft for selected conversation (per-conversation cache)
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in draftsByConversationId) return;
    setDraftError(null);
    setDraftLoading(true);
    getConversationDraft(selectedId)
      .then((draft) => {
        setDraftsByConversationId((prev) => ({ ...prev, [selectedId]: draft }));
      })
      .catch(() => {
        setDraftsByConversationId((prev) => ({ ...prev, [selectedId]: null }));
      })
      .finally(() => setDraftLoading(false));
  }, [selectedId, draftsByConversationId]);

  // Live polling: selected conversation messages every 2s (list is updated by usePolling + mergeConversations above)
  useLivePolling({
    enabled: !authBlocked && Boolean(selectedId),
    intervalMs: 2000,
    onTick: async () => {
      if (!selectedId) return;
      await loadMessages(selectedId, { silent: true, force: true });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        (c.lastMessagePreview || '').toLowerCase().includes(q)
    );
  }, [search, conversations]);

  const selectedConversation = selectedId
    ? conversations.find((c) => c.id === selectedId) ?? null
    : null;

  const messages = selectedId ? messagesByConversationId[selectedId] ?? [] : [];
  const messagesLoading = selectedId ? messagesLoadingById[selectedId] === true : false;

  const canSend = Boolean(selectedId && composerText.trim().length > 0);

  const currentDraft =
    selectedId && selectedId in draftsByConversationId
      ? draftsByConversationId[selectedId]
      : undefined;
  const draft = currentDraft ?? null;
  // Only proposed can be used/dismissed; expired is display-only (no /use).
  const draftActionable = draft?.effectiveState === 'proposed';

  const handleUseDraft = useCallback(async () => {
    if (!selectedId || !draft || !draftActionable) return;
    setDraftError(null);
    const finalText = composerText.trim() || draft.text;
    const edited = finalText !== draft.text;
    try {
      await useDraft(draft.id, { edited, finalText });
      setDraftsByConversationId((prev) => ({
        ...prev,
        [selectedId]: { ...draft, state: 'used', effectiveState: 'used' },
      }));
      setComposerText(finalText);
      composerTextareaRef.current?.focus();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDraftError(err?.message ?? 'Failed to use draft');
    }
  }, [selectedId, draft, draftActionable, composerText]);

  const handleDismissDraft = useCallback(async () => {
    if (!selectedId || !draft || !draftActionable) return;
    setDraftError(null);
    try {
      await ignoreDraft(draft.id);
      setDraftsByConversationId((prev) => ({
        ...prev,
        [selectedId]: { ...draft, state: 'ignored', effectiveState: 'ignored' },
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDraftError(err?.message ?? 'Failed to dismiss draft');
    }
  }, [selectedId, draft, draftActionable]);

  const bumpConversationAfterSend = useCallback((conversationId: string, text: string) => {
    const nowIso = new Date().toISOString();

    setConversations((prev) => {
      const next = prev.map((c) => {
        if (c.id !== conversationId) return c;

        const keepHot = c.status === 'hot';
        const status: InstructorConversation['status'] = keepHot ? 'hot' : 'waiting';

        return {
          ...c,
          lastMessagePreview: text,
          updatedAt: nowIso,
          unreadCount: 0,
          status,
        };
      });

      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return next;
    });
  }, []);

  const markMessageFailed = (conversationId: string, tempId: string, errMsg: string) => {
    setMessagesByConversationId((prev) => {
      const list = prev[conversationId] ?? [];
      return {
        ...prev,
        [conversationId]: sortByCreatedAt(
          list.map((m) => (m.id === tempId ? { ...m, clientStatus: 'failed' as const, clientError: errMsg } : m))
        ),
      };
    });
  };

  const replaceTempWithReal = (
    conversationId: string,
    tempId: string,
    real: { id: string; text: string; created_at: string }
  ) => {
    setMessagesByConversationId((prev) => {
      const list = prev[conversationId] ?? [];
      return {
        ...prev,
        [conversationId]: sortByCreatedAt(
          list.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: real.id,
                  text: real.text,
                  createdAt: real.created_at,
                  clientStatus: undefined,
                  clientError: undefined,
                  clientTempId: undefined,
                }
              : m
          )
        ),
      };
    });
  };

  const handleSend = async () => {
    const conversationId = selectedId;
    const text = composerText.trim();
    if (!conversationId || !text) return;

    setError(null);

    const tempId = `tmp-${Date.now()}`;
    const optimistic: UiMessage = {
      id: tempId,
      role: 'instructor',
      text,
      createdAt: new Date().toISOString(),
      clientStatus: 'sending',
      clientTempId: tempId,
    };

    setMessagesByConversationId((prev) => ({
      ...prev,
      [conversationId]: sortByCreatedAt([...(prev[conversationId] ?? []), optimistic]),
    }));

    setComposerText('');

    try {
      const res = await sendInstructorReply(conversationId, { text });
      const msg = res.message;

      replaceTempWithReal(conversationId, tempId, {
        id: msg.id,
        text: msg.text,
        created_at: msg.created_at,
      });

      bumpConversationAfterSend(conversationId, msg.text);

      // Debounced realignment
      window.setTimeout(() => {
        void loadConversations({ silent: true });
      }, 400);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err?.status as number | undefined;
      const msg = err?.message || 'Send failed';

      setComposerText(text);
      markMessageFailed(conversationId, tempId, msg);

      if (status === 401 || status === 403) {
        setAuthBlocked(true);
        setError({ status, message: msg });
      }
    }
  };

  const handleRetry = async (conversationId: string, tempId: string, text: string) => {
    setError(null);

    setMessagesByConversationId((prev) => {
      const list = prev[conversationId] ?? [];
      return {
        ...prev,
        [conversationId]: sortByCreatedAt(
          list.map((m) => (m.id === tempId ? { ...m, clientStatus: 'sending' as const, clientError: undefined } : m))
        ),
      };
    });

    try {
      const res = await sendInstructorReply(conversationId, { text: text.trim() });
      const msg = res.message;

      replaceTempWithReal(conversationId, tempId, {
        id: msg.id,
        text: msg.text,
        created_at: msg.created_at,
      });

      bumpConversationAfterSend(conversationId, msg.text);

      window.setTimeout(() => {
        void loadConversations({ silent: true });
      }, 400);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err?.status as number | undefined;
      const msg = err?.message || 'Retry failed';

      markMessageFailed(conversationId, tempId, msg);

      if (status === 401 || status === 403) {
        setAuthBlocked(true);
        setError({ status, message: msg });
      }
    }
  };

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <h1 className={styles.title}>Inbox</h1>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <div>
              <strong>Problem:</strong> {error.message}
              {error.status === 401 && (
                <>
                  {' '}
                  <Link className={styles.errorLink} href="/instructor/login">
                    Log in
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => void loadConversations()}
            >
              Retry
            </button>
          </div>
        )}

        <div className={styles.twoCol}>
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
              <div className={styles.listLoading}>Loading conversations…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyList}>No conversations</div>
            ) : (
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
                        {c.unreadCount > 0 && <span className={styles.unread}>{c.unreadCount}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.detailPanel}>
            {selectedConversation ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailName}>{selectedConversation.customerName}</div>
                  <div className={styles.detailMeta}>
                    {selectedConversation.channel} · Last activity{' '}
                    {formatLastActivity(selectedConversation.updatedAt)}
                  </div>
                </div>

                <div className={styles.messagesWrap}>
                  {messagesLoading ? (
                    <div className={styles.detailLoading}>Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className={styles.emptyMessages}>No messages yet</div>
                  ) : (
                    messages.map((m) => {
                      const isCustomer = m.role === 'customer';
                      const isFailed = m.clientStatus === 'failed';
                      const isSending = m.clientStatus === 'sending';

                      return (
                        <div
                          key={m.id}
                          className={`${styles.message} ${
                            isCustomer ? styles.messageCustomer : styles.messageInstructor
                          }`}
                        >
                          <div className={styles.messageRole}>{isCustomer ? 'customer' : 'instructor'}</div>
                          <div>{m.text}</div>

                          <div className={styles.messageTime}>
                            {formatMessageTime(m.createdAt)}
                            {!isCustomer && isSending && <span style={{ marginLeft: 8 }}>Sending…</span>}
                            {!isCustomer && isFailed && <span style={{ marginLeft: 8 }}>Failed</span>}
                          </div>

                          {!isCustomer && isFailed && (
                            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                              <div style={{ marginBottom: 8 }}>{m.clientError || 'Failed to send'}</div>
                              <button
                                type="button"
                                className={styles.inlineRetryBtn}
                                onClick={() => void handleRetry(selectedConversation.id, m.id, m.text)}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {draftLoading && (
                  <div className={styles.draftWrap} style={{ padding: 8, color: '#64748b' }}>
                    Loading draft…
                  </div>
                )}
                {!draftLoading && draft && (
                  <div className={styles.draftStack}>
                    <div className={styles.draftWrap}>
                      <div className={styles.draftHeaderRow}>
                        <span
                          className={
                            draft.effectiveState === 'proposed'
                              ? styles.activeBadge
                              : styles.usedBadge
                          }
                        >
                          {draft.effectiveState === 'proposed'
                            ? 'Active'
                            : draft.effectiveState === 'expired'
                              ? 'Expired'
                              : draft.effectiveState === 'used'
                                ? 'Used'
                                : 'Ignored'}
                        </span>
                        {draftActionable && (
                          <div className={styles.draftActions}>
                            <button
                              type="button"
                              className={styles.draftBtnPrimary}
                              onClick={() => void handleUseDraft()}
                            >
                              Use draft
                            </button>
                            <button
                              type="button"
                              className={styles.draftBtnSecondary}
                              onClick={() => void handleDismissDraft()}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={styles.draftText} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {draft.text}
                      </div>
                      {draft.effectiveState === 'expired' && (
                        <div className={styles.draftFootnote} style={{ marginTop: 6 }}>
                          Draft expired, request a new one.
                        </div>
                      )}
                      {draftError && (
                        <div className={styles.draftFootnote} style={{ color: '#b91c1c' }}>
                          {draftError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.composerWrap}>
                  <textarea
                    ref={composerTextareaRef}
                    className={styles.composerTextarea}
                    placeholder="Type a message to the customer…"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    rows={2}
                    aria-label="Message composer"
                  />
                  <button
                    type="button"
                    className={styles.sendBtn}
                    disabled={!canSend}
                    onClick={() => void handleSend()}
                    aria-disabled={!canSend}
                  >
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
