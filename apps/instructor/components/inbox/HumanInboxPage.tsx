'use client';

import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useVirtualizer } from '@tanstack/react-virtual';

import styles from './inbox.module.css';

import {
  getConversations,
  getMessages,
  sendInstructorReply,
  getConversationDraft,
  getConversationContext,
  cancelInstructorBooking,
  checkAvailability,
  confirmBookingDraft,
  getBookingPaymentInfo,
  getConversationAiState,
  regenerateConversationAiDraft,
  updateInstructorBooking,
  useDraft,
  ignoreDraft,
  patchConversationAiState,
  type InstructorConversation,
  type InstructorMessage,
  type ConversationDraft,
  type ConversationAiState,
  type SuggestedAction,
  type ConversationContextUpcomingBooking,
  type ConversationContextPendingDraft,
  type AvailabilityCheckResponse,
} from '@/lib/instructorApi';
import { useRouter } from 'next/navigation';
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

/** Heuristic: message may contain a specific date or time (risky to send without double-check). */
function containsRiskyDateOrTime(text: string): boolean {
  const t = text.trim().toLowerCase();
  const timeLike = /\d{1,2}\s*[h:]\s*\d{0,2}|alle\s+\d{1,2}|ore\s+\d{1,2}|\d{1,2}:\d{2}/i;
  const dateLike = /domani|oggi|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/i;
  return timeLike.test(t) || dateLike.test(t);
}

const CONV_LIST_ITEM_HEIGHT = 122;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  const hue = Math.abs(h % 360);
  return `hsl(${hue}, 42%, 38%)`;
}

const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: InstructorConversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasUnread = conversation.unreadCount > 0;
  return (
    <li style={{ listStyle: 'none', margin: 0 }}>
      <button
        type="button"
        className={`${styles.convItem} ${isSelected ? styles.convItemSelected : ''} ${hasUnread ? styles.convItemUnread : ''}`}
        onClick={onSelect}
      >
        <div
          className={styles.convAvatar}
          style={{ backgroundColor: avatarColor(conversation.customerName) }}
          aria-hidden
        >
          {getInitials(conversation.customerName)}
        </div>
        <div className={styles.convBody}>
          <div className={styles.convTop}>
            <div className={styles.convName}>
              {conversation.customerName}
              {conversation.isKnownCustomer && (
                <span className={styles.knownBadge} title="Known customer">★</span>
              )}
              {hasUnread && <span className={styles.unreadDot} aria-label="Unread" />}
            </div>
            <span className={styles.convTime}>{formatLastActivity(conversation.updatedAt)}</span>
          </div>
          {conversation.isKnownCustomer && (conversation.customerBookingsCount ?? 0) > 0 && (
            <div className={styles.customerSignals}>
              {conversation.customerBookingsCount} {(conversation.customerBookingsCount ?? 0) === 1 ? 'lesson' : 'lessons'}
              {conversation.customerLastSeenAt && <> · last {formatLastActivity(conversation.customerLastSeenAt)}</>}
            </div>
          )}
          <div className={styles.convPreview}>{conversation.lastMessagePreview}</div>
          <div className={styles.convMeta}>
            <span className={styles.channelTag}>{conversation.channel}</span>
            <span className={styles.convMetaSep}>·</span>
            <span className={`${styles.statusBadge} ${statusClass(conversation.status)}`}>
              {conversation.status}
            </span>
            {hasUnread && conversation.unreadCount > 0 && (
              <span className={styles.unreadCount}>{conversation.unreadCount}</span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
});

function ConversationListVirtual({
  filtered,
  selectedId,
  onSelect,
}: {
  filtered: InstructorConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CONV_LIST_ITEM_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className={styles.conversationList}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const c = filtered[virtualRow.index];
          return (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ConversationListItem
                conversation={c}
                isSelected={selectedId === c.id}
                onSelect={() => onSelect(c.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
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
  const [suggestedActionsByConversationId, setSuggestedActionsByConversationId] = useState<
    Record<string, SuggestedAction[]>
  >({});
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const [aiStateByConversationId, setAiStateByConversationId] = useState<
    Record<string, ConversationAiState | null>
  >({});
  const [aiStateLoading, setAiStateLoading] = useState(false);
  const [aiStateError, setAiStateError] = useState<string | null>(null);

  const [contextByConversationId, setContextByConversationId] = useState<
    Record<string, { upcoming_bookings: ConversationContextUpcomingBooking[]; pending_booking_draft: ConversationContextPendingDraft | null } | null>
  >({});
  const [contextLoading, setContextLoading] = useState(false);
  const [cancelBookingModal, setCancelBookingModal] = useState<{ bookingId: string; startTime: string } | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{
    bookingId: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [rescheduleSavingId, setRescheduleSavingId] = useState<string | null>(null);
  const [rescheduleEdit, setRescheduleEdit] = useState<{ date: string; startTime: string; durationMinutes: number } | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const [confirmDraftModal, setConfirmDraftModal] = useState<{
    draft: ConversationContextPendingDraft;
    step: 'summary' | 'conflict';
    checkResult: AvailabilityCheckResponse | null;
  } | null>(null);
  const [confirmDraftEdit, setConfirmDraftEdit] = useState<{
    booking_date: string;
    start_time: string;
    end_time: string;
    customer_name: string;
    meeting_point_text: string;
  } | null>(null);
  const [confirmDraftChecking, setConfirmDraftChecking] = useState(false);
  const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
  const [confirmSuccessBanner, setConfirmSuccessBanner] = useState<{ bookingId: string } | null>(null);
  const [paymentLinkLoadingBookingId, setPaymentLinkLoadingBookingId] = useState<string | null>(null);
  const [preSendCheckPendingText, setPreSendCheckPendingText] = useState<string | null>(null);

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

  // Clear AI state error when switching conversation
  useEffect(() => {
    setAiStateError(null);
  }, [selectedId]);

  // Load messages when selected changes (with caching)
  useEffect(() => {
    if (!selectedId) return;
    if (messagesByConversationId[selectedId]) return;
    void loadMessages(selectedId);
  }, [selectedId, messagesByConversationId, loadMessages]);

  // Load draft and suggested actions for selected conversation (per-conversation cache)
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in draftsByConversationId) return;
    setDraftError(null);
    setDraftLoading(true);
    getConversationDraft(selectedId)
      .then(({ draft, suggested_actions }) => {
        setDraftsByConversationId((prev) => ({ ...prev, [selectedId]: draft }));
        setSuggestedActionsByConversationId((prev) => ({ ...prev, [selectedId]: suggested_actions }));
      })
      .catch(() => {
        setDraftsByConversationId((prev) => ({ ...prev, [selectedId]: null }));
        setSuggestedActionsByConversationId((prev) => ({ ...prev, [selectedId]: [] }));
      })
      .finally(() => setDraftLoading(false));
  }, [selectedId, draftsByConversationId]);

  // Load AI state when selecting a conversation (so label shows immediately)
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in aiStateByConversationId) return;
    getConversationAiState(selectedId)
      .then((state) => {
        setAiStateByConversationId((prev) => ({ ...prev, [selectedId]: state ?? null }));
      })
      .catch(() => {
        setAiStateByConversationId((prev) => ({ ...prev, [selectedId]: null }));
      });
  }, [selectedId, aiStateByConversationId]);

  // Load conversation context (upcoming bookings, pending draft) for in-thread cancel/confirm
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in contextByConversationId) return;
    setContextLoading(true);
    getConversationContext(selectedId)
      .then((ctx) => {
        setContextByConversationId((prev) => ({
          ...prev,
          [selectedId]: {
            upcoming_bookings: ctx.upcoming_bookings ?? [],
            pending_booking_draft: ctx.pending_booking_draft ?? null,
          },
        }));
      })
      .catch(() => {
        setContextByConversationId((prev) => ({
          ...prev,
          [selectedId]: { upcoming_bookings: [], pending_booking_draft: null },
        }));
      })
      .finally(() => setContextLoading(false));
  }, [selectedId, contextByConversationId]);

  const refreshContextForSelected = useCallback(() => {
    if (!selectedId) return;
    setContextByConversationId((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  }, [selectedId]);

  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      setCancellingBookingId(bookingId);
      setCancelBookingModal(null);
      try {
        await cancelInstructorBooking(bookingId);
        refreshContextForSelected();
        setComposerText((t) =>
          t.trim() ? t : 'Booking cancelled. Message me when you want to reschedule.'
        );
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Failed to cancel booking');
      } finally {
        setCancellingBookingId(null);
      }
    },
    [refreshContextForSelected]
  );

  function draftToStartEndUtc(draft: ConversationContextPendingDraft): { start_utc: string; end_utc: string } {
    const start = draft.start_time.length === 5 ? `${draft.start_time}:00` : draft.start_time;
    const end = draft.end_time.length === 5 ? `${draft.end_time}:00` : draft.end_time;
    return {
      start_utc: `${draft.booking_date}T${start}.000Z`,
      end_utc: `${draft.booking_date}T${end}.000Z`,
    };
  }

  const handleOpenConfirmDraft = useCallback((draft: ConversationContextPendingDraft) => {
    setConfirmDraftModal({ draft, step: 'summary', checkResult: null });
    const start = draft.start_time.length === 5 ? draft.start_time : draft.start_time.slice(0, 5);
    const end = draft.end_time.length === 5 ? draft.end_time : draft.end_time.slice(0, 5);
    setConfirmDraftEdit({
      booking_date: draft.booking_date,
      start_time: start,
      end_time: end,
      customer_name: draft.customer_name?.trim() ?? '',
      meeting_point_text: draft.meeting_point_text?.trim() ?? '',
    });
  }, []);

  const handleCheckAvailabilityForDraft = useCallback(async () => {
    if (!confirmDraftModal || confirmDraftModal.step !== 'summary') return;
    setConfirmDraftChecking(true);
    setDraftError(null);
    try {
      const draft = confirmDraftModal.draft;
      const edit = confirmDraftEdit;
      const start_utc = edit
        ? `${edit.booking_date}T${edit.start_time.length === 5 ? edit.start_time : edit.start_time + ':00'}.000Z`
        : draftToStartEndUtc(draft).start_utc;
      const end_utc = edit
        ? `${edit.booking_date}T${edit.end_time.length === 5 ? edit.end_time : edit.end_time + ':00'}.000Z`
        : draftToStartEndUtc(draft).end_utc;
      const result = await checkAvailability({ start_utc, end_utc });
      setConfirmDraftModal((prev) =>
        prev ? { ...prev, checkResult: result, step: result.hasConflict ? 'conflict' : 'summary' } : null
      );
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Availability check unavailable');
    } finally {
      setConfirmDraftChecking(false);
    }
  }, [confirmDraftModal, confirmDraftEdit]);

  const handleConfirmDraftSubmit = useCallback(async () => {
    if (!confirmDraftModal) return;
    const draftId = confirmDraftModal.draft.id;
    setConfirmingDraftId(draftId);
    setDraftError(null);
    try {
      const { bookingId } = await confirmBookingDraft(draftId);
      setConfirmDraftModal(null);
      setConfirmDraftEdit(null);
      refreshContextForSelected();
      setComposerText((t) =>
        t.trim() ? t : 'Booking confirmed. You will receive the details shortly.'
      );
      setConfirmSuccessBanner({ bookingId });
      window.setTimeout(() => setConfirmSuccessBanner(null), 10000);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Confirmation failed');
    } finally {
      setConfirmingDraftId(null);
    }
  }, [confirmDraftModal, refreshContextForSelected]);

  const handleCloseConfirmDraftModal = useCallback(() => {
    setConfirmDraftModal(null);
    setConfirmDraftEdit(null);
    setDraftError(null);
  }, []);

  const handleCreatePaymentLinkFromThread = useCallback(
    async (bookingId: string) => {
      setPaymentLinkLoadingBookingId(bookingId);
      setDraftError(null);
      try {
        const info = await getBookingPaymentInfo(bookingId);
        if (info?.paymentUrl) {
          setComposerText(`Here is the payment link: ${info.paymentUrl}`);
          composerTextareaRef.current?.focus();
        } else {
          router.push(`/instructor/bookings/${bookingId}`);
        }
      } catch {
        setDraftError('Could not get link. Open the booking to generate it.');
        router.push(`/instructor/bookings/${bookingId}`);
      } finally {
        setPaymentLinkLoadingBookingId(null);
      }
    },
    [router]
  );

  function formatBookingDateTime(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

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

  // ── Draft actions ──────────────────────────────────────────────────────

  /** Insert: puts AI text into composer (stripped of boilerplate prefix), marks draft as used. */
  const handleInsertDraft = useCallback(async () => {
    if (!selectedId || !draft || !draftActionable) return;
    setDraftError(null);
    // Strip the stub "Suggested reply for human review." prefix that the AI adds
    const cleanText = draft.text
      .replace(/^Suggested reply for human review\.?\s*/i, '')
      .trim();
    setComposerText(cleanText);
    composerTextareaRef.current?.focus();
    try {
      await useDraft(draft.id, { edited: false, finalText: draft.text });
      setDraftsByConversationId((prev) => ({
        ...prev,
        [selectedId]: { ...draft, state: 'used', effectiveState: 'used' },
      }));
    } catch {
      // fail-open: text already in composer, marking used is best-effort
    }
  }, [selectedId, draft, draftActionable]);

  const [regenerating, setRegenerating] = useState(false);
  const [sendAsIsLoading, setSendAsIsLoading] = useState(false);

  /** Regenerate: re-runs AI classification and draft on last inbound message. */
  const handleRegenerateDraft = useCallback(async () => {
    if (!selectedId) return;
    setDraftError(null);
    setRegenerating(true);
    try {
      const newDraft = await regenerateConversationAiDraft(selectedId);
      setDraftsByConversationId((prev) => ({
        ...prev,
        [selectedId]: newDraft,
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDraftError(err?.message ?? 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  }, [selectedId]);

  /** Dismiss: hides draft card locally and marks as ignored on server. */
  const handleDismissDraft = useCallback(async () => {
    if (!selectedId || !draft || !draftActionable) return;
    setDraftError(null);
    // Immediate local hide
    setDraftsByConversationId((prev) => ({
      ...prev,
      [selectedId]: { ...draft, state: 'ignored', effectiveState: 'ignored' },
    }));
    try {
      await ignoreDraft(draft.id);
    } catch {
      // fail-open: card already hidden
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

  const doSend = useCallback(
    async (textToSend: string) => {
      const conversationId = selectedId;
      if (!conversationId) return;

      setError(null);
      setComposerText('');

      const tempId = `tmp-${Date.now()}`;
      const optimistic: UiMessage = {
        id: tempId,
        role: 'instructor',
        text: textToSend,
        createdAt: new Date().toISOString(),
        clientStatus: 'sending',
        clientTempId: tempId,
      };

      setMessagesByConversationId((prev) => ({
        ...prev,
        [conversationId]: sortByCreatedAt([...(prev[conversationId] ?? []), optimistic]),
      }));

      try {
        const res = await sendInstructorReply(conversationId, { text: textToSend });
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
        const msg = err?.message || 'Send failed';

        setComposerText(textToSend);
        markMessageFailed(conversationId, tempId, msg);

        if (status === 401 || status === 403) {
          setAuthBlocked(true);
          setError({ status, message: msg });
        }
      }
    },
    [
      selectedId,
      replaceTempWithReal,
      bumpConversationAfterSend,
      loadConversations,
      markMessageFailed,
    ]
  );

  const handleSend = async () => {
    const conversationId = selectedId;
    const text = composerText.trim();
    if (!conversationId || !text) return;

    if (containsRiskyDateOrTime(text)) {
      setPreSendCheckPendingText(text);
      return;
    }

    await doSend(text);
  };

  /** Send the suggested reply as-is and mark draft as used. */
  const handleSendAsIs = useCallback(async () => {
    if (!selectedId || !draft || draft.effectiveState !== 'proposed') return;
    const cleanText = draft.text
      .replace(/^Suggested reply for human review\.?\s*/i, '')
      .trim();
    if (!cleanText) return;
    setDraftError(null);
    setSendAsIsLoading(true);
    try {
      await doSend(cleanText);
      await useDraft(draft.id, { edited: false, finalText: draft.text });
      setDraftsByConversationId((prev) => ({
        ...prev,
        [selectedId]: { ...draft, state: 'used', effectiveState: 'used' },
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDraftError(err?.message ?? 'Invio fallito');
    } finally {
      setSendAsIsLoading(false);
    }
  }, [selectedId, draft, doSend]);

  const handleTakeOver = useCallback(async () => {
    if (!selectedId) return;
    setAiStateError(null);
    setAiStateLoading(true);
    try {
      await patchConversationAiState(selectedId, { ai_state: 'ai_paused_by_human' });
      setAiStateByConversationId((prev) => ({ ...prev, [selectedId]: 'ai_paused_by_human' }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setAiStateError(err?.message ?? 'Failed to pause AI');
    } finally {
      setAiStateLoading(false);
    }
  }, [selectedId]);

  const handleResumeAi = useCallback(async () => {
    if (!selectedId) return;
    setAiStateError(null);
    setAiStateLoading(true);
    try {
      await patchConversationAiState(selectedId, { ai_state: 'ai_on' });
      setAiStateByConversationId((prev) => ({ ...prev, [selectedId]: 'ai_on' }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setAiStateError(err?.message ?? 'Failed to resume AI');
    } finally {
      setAiStateLoading(false);
    }
  }, [selectedId]);

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

  const isAuthError = error && (error.status === 401 || /UNAUTHORIZED|No session/i.test(error.message));

  const DAY1_BANNER_KEY = 'frostdesk_inbox_day1_banner_dismissed';
  const [showDay1Banner, setShowDay1Banner] = useState(false);
  useEffect(() => {
    try {
      setShowDay1Banner(!localStorage.getItem(DAY1_BANNER_KEY));
    } catch {
      setShowDay1Banner(false);
    }
  }, []);
  const dismissDay1Banner = useCallback(() => {
    try {
      localStorage.setItem(DAY1_BANNER_KEY, '1');
    } catch {
      // ignore
    }
    setShowDay1Banner(false);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.title}>Inbox</h1>
          <p className={styles.subtitle}>Conversations and messages</p>
        </div>
      </div>

      {showDay1Banner && (
        <div className={styles.day1Banner} role="status">
          <span>Next step: reply to a conversation or check today&apos;s bookings.</span>
          <button
            type="button"
            className={styles.day1BannerDismiss}
            onClick={dismissDay1Banner}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <div>
            {isAuthError ? (
              <>
                Session expired or not authenticated.{' '}
                <Link className={styles.errorLink} href="/instructor/login">
                  Login
                </Link>
              </>
            ) : (
              error.message
            )}
          </div>
          {!isAuthError && (
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => void loadConversations()}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {error ? (
        <div className={styles.emptyList} style={{ marginTop: 8 }}>
          Retry above to load conversations.
        </div>
      ) : (
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
            <div className={styles.syncStrip}>
              <span className={styles.syncLabel}>
                {listLoading
                  ? (conversations.length > 0 ? 'Updating…' : 'Loading…')
                  : conversations.length > 0
                    ? `Last updated: ${formatLastActivity(conversations.reduce((acc, c) => (c.updatedAt > acc ? c.updatedAt : acc), conversations[0]?.updatedAt ?? ''))}`
                    : 'Last updated: —'}
              </span>
              <button
                type="button"
                className={styles.syncBtn}
                disabled={listLoading}
                aria-busy={listLoading}
                onClick={() => void loadConversations()}
                aria-label="Refresh conversations"
              >
                Refresh
              </button>
            </div>

            {listLoading ? (
              <div className={styles.listLoading}>Loading conversations…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyStateBlock}>
                <p className={styles.emptyStateBlockTitle}>No conversations</p>
                <p className={styles.emptyStateBlockBody}>
                  Messages that customers send to your WhatsApp number will appear here. Connect and verify your number in Settings to receive messages.
                </p>
                <Link href="/instructor/settings" className={styles.emptyStateCta}>
                  Go to Settings
                </Link>
              </div>
            ) : (
              <ConversationListVirtual
                filtered={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>

          <div className={styles.detailPanel}>
            {selectedConversation ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailName}>
                    {selectedConversation.customerName}
                    {selectedConversation.isKnownCustomer && (
                      <span className={styles.knownBadge} title="Known customer"> ★</span>
                    )}
                  </div>
                  <div className={styles.detailMeta}>
                    {selectedConversation.channel} · {formatLastActivity(selectedConversation.updatedAt)}
                    {selectedConversation.isKnownCustomer && (selectedConversation.customerBookingsCount ?? 0) > 0 && (
                      <> · {selectedConversation.customerBookingsCount} {(selectedConversation.customerBookingsCount ?? 0) === 1 ? 'lesson' : 'lessons'}</>
                    )}
                  </div>
                  <div className={styles.detailActions}>
                    <span className={styles.detailActionsPill}>
                      {aiStateByConversationId[selectedConversation.id] === 'ai_paused_by_human'
                        ? 'AI paused'
                        : aiStateByConversationId[selectedConversation.id] === 'ai_on'
                          ? 'AI on'
                          : draft?.effectiveState === 'proposed'
                            ? 'Suggestion ready'
                            : 'No suggestion'}
                    </span>
                    <button
                      type="button"
                      className={styles.detailActionsBtn}
                      disabled={aiStateLoading}
                      onClick={() => void handleTakeOver()}
                    >
                      Take over
                    </button>
                    <button
                      type="button"
                      className={styles.detailActionsBtn}
                      disabled={aiStateLoading}
                      onClick={() => void handleResumeAi()}
                    >
                      Resume AI
                    </button>
                  </div>
                  {aiStateError && (
                    <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#f87171' }}>{aiStateError}</div>
                  )}
                </div>

                {confirmSuccessBanner && (
                  <div
                    className={styles.confirmSuccessBanner}
                    role="status"
                    aria-live="polite"
                  >
                    <span>Booking created. To cancel it go to Lessons and click Cancel.</span>
                    <Link
                      href={`/instructor/bookings/${confirmSuccessBanner.bookingId}`}
                      className={styles.confirmSuccessBannerLink}
                    >
                      Open booking
                    </Link>
                    <button
                      type="button"
                      className={styles.confirmSuccessBannerDismiss}
                      onClick={() => setConfirmSuccessBanner(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                )}

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
                          <div>{m.text}</div>
                          <div className={`${styles.messageFooter} ${isCustomer ? styles.messageFooterLeft : styles.messageFooterRight}`}>
                            <span className={styles.messageTime}>{formatMessageTime(m.createdAt)}</span>
                            {!isCustomer && isSending && <span className={styles.messageStatus}>Sending…</span>}
                            {!isCustomer && isFailed && (
                              <>
                                <span className={styles.messageStatus}>Failed</span>
                                <button
                                  type="button"
                                  className={styles.messageRetry}
                                  onClick={() => void handleRetry(selectedConversation.id, m.id, m.text)}
                                >
                                  Retry
                                </button>
                              </>
                            )}
                          </div>
                          {!isCustomer && isFailed && m.clientError && (
                            <div className={styles.messageStatus} style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                              {m.clientError}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ── Upcoming booking(s): cancel in thread ── */}
                {selectedId && (contextByConversationId[selectedId]?.upcoming_bookings?.length ?? 0) > 0 && (
                  <div className={styles.actionsStrip}>
                    {contextLoading ? (
                      <div className={styles.aiSuggestionLoading}>Loading…</div>
                    ) : (
                      (contextByConversationId[selectedId]?.upcoming_bookings ?? []).map((b) => (
                        <div key={b.id} className={styles.aiSuggestionCard} style={{ marginBottom: 8 }}>
                          <div className={styles.aiSuggestionLabel}>Prossima prenotazione</div>
                          <div className={styles.aiSuggestionText}>
                            {formatBookingDateTime(b.start_time)}
                            {b.customer_name ? ` · ${b.customer_name}` : ''}
                          </div>
                          <div className={styles.aiSuggestionActions}>
                            <button
                              type="button"
                              className={styles.aiSuggestionBtn}
                              disabled={rescheduleSavingId === b.id}
                              onClick={() => {
                                const start = new Date(b.start_time);
                                const end = new Date(b.end_time);
                                setRescheduleModal({ bookingId: b.id, start_time: b.start_time, end_time: b.end_time });
                                setRescheduleEdit({
                                  date: start.toISOString().slice(0, 10),
                                  startTime: start.toTimeString().slice(0, 5),
                                  durationMinutes: Math.round((end.getTime() - start.getTime()) / 60000) || 60,
                                });
                              }}
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnDanger}`}
                              disabled={cancellingBookingId === b.id}
                              onClick={() => setCancelBookingModal({ bookingId: b.id, startTime: b.start_time })}
                            >
                              {cancellingBookingId === b.id ? 'Cancelling…' : 'Cancel this booking'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pending booking draft: confirm in thread */}
                {selectedId &&
                  contextByConversationId[selectedId]?.pending_booking_draft &&
                  !contextLoading && (
                    <div className={styles.actionsStrip}>
                      <div className={styles.aiSuggestionCard} style={{ marginBottom: 8 }}>
                        <div className={styles.aiSuggestionLabel}>Booking proposal</div>
                        <div className={styles.aiSuggestionText}>
                          {formatBookingDateTime(
                            `${contextByConversationId[selectedId]!.pending_booking_draft!.booking_date}T${contextByConversationId[selectedId]!.pending_booking_draft!.start_time}`
                          )}
                          {(contextByConversationId[selectedId]!.pending_booking_draft!.customer_name ?? '').trim() &&
                            ` · ${contextByConversationId[selectedId]!.pending_booking_draft!.customer_name}`}
                        </div>
                        <div className={styles.aiSuggestionActions}>
                          <button
                            type="button"
                            className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnPrimary}`}
                            onClick={() =>
                              handleOpenConfirmDraft(contextByConversationId[selectedId]!.pending_booking_draft!)
                            }
                          >
                            Conferma prenotazione
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Cancel booking confirm modal */}
                {cancelBookingModal && (
                  <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
                    <div className={styles.modalContent}>
                      <h2 id="cancel-booking-title" className={styles.modalTitle}>Annulla prenotazione</h2>
                      <p className={styles.modalBody}>
                        Vuoi annullare la prenotazione del {formatBookingDateTime(cancelBookingModal.startTime)}?
                        Il cliente riceverà una conferma dell’annullamento.
                      </p>
                      <div className={styles.modalActions}>
                        <button
                          type="button"
                          className={styles.modalBtnSecondary}
                          onClick={() => setCancelBookingModal(null)}
                        >
                          Indietro
                        </button>
                        <button
                          type="button"
                          className={styles.modalBtnDanger}
                          disabled={cancellingBookingId === cancelBookingModal.bookingId}
                          onClick={() => void handleCancelBooking(cancelBookingModal.bookingId)}
                        >
                          {cancellingBookingId === cancelBookingModal.bookingId ? 'Annullamento…' : 'Sì, annulla'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reschedule booking modal */}
                {rescheduleModal && rescheduleEdit && (
                  <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="reschedule-booking-title">
                    <div className={styles.modalContent} style={{ maxWidth: 400 }}>
                      <h2 id="reschedule-booking-title" className={styles.modalTitle}>Reschedule booking</h2>
                      <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                          Date
                          <input
                            type="date"
                            value={rescheduleEdit.date}
                            onChange={(e) => setRescheduleEdit((prev) => prev ? { ...prev, date: e.target.value } : null)}
                            style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                          Start time
                          <input
                            type="time"
                            value={rescheduleEdit.startTime}
                            onChange={(e) => setRescheduleEdit((prev) => prev ? { ...prev, startTime: e.target.value } : null)}
                            style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                          Durata (minuti)
                          <input
                            type="number"
                            min={15}
                            step={15}
                            value={rescheduleEdit.durationMinutes}
                            onChange={(e) => setRescheduleEdit((prev) => prev ? { ...prev, durationMinutes: Math.max(15, parseInt(String(e.target.value), 10) || 60) } : null)}
                            style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </label>
                      </div>
                      <div className={styles.modalActions}>
                        <button
                          type="button"
                          className={styles.modalBtnSecondary}
                          onClick={() => { setRescheduleModal(null); setRescheduleEdit(null); }}
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          className={styles.modalBtnPrimary}
                          disabled={rescheduleSavingId === rescheduleModal.bookingId}
                          onClick={async () => {
                            const { bookingId } = rescheduleModal;
                            const start = new Date(`${rescheduleEdit.date}T${rescheduleEdit.startTime}`);
                            const end = new Date(start.getTime() + rescheduleEdit.durationMinutes * 60 * 1000);
                            setRescheduleSavingId(bookingId);
                            try {
                              await updateInstructorBooking(bookingId, {
                                startTime: start.toISOString(),
                                endTime: end.toISOString(),
                              });
                              refreshContextForSelected();
                              setRescheduleModal(null);
                              setRescheduleEdit(null);
                            } catch (e) {
                              setDraftError(e instanceof Error ? e.message : 'Errore riprogrammazione');
                            } finally {
                              setRescheduleSavingId(null);
                            }
                          }}
                        >
                          {rescheduleSavingId === rescheduleModal.bookingId ? 'Salvataggio…' : 'Salva'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pre-send checkpoint: date/time in message */}
                {preSendCheckPendingText !== null && (
                  <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="presend-check-title">
                    <div className={styles.modalContent}>
                      <h2 id="presend-check-title" className={styles.modalTitle}>Conferma invio</h2>
                      <p className={styles.modalBody}>
                        Il messaggio contiene una data o un orario. Controlla che sia corretto prima di inviare.
                        Vuoi inviare comunque?
                      </p>
                      <div className={styles.modalActions}>
                        <button
                          type="button"
                          className={styles.modalBtnSecondary}
                          onClick={() => setPreSendCheckPendingText(null)}
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          className={styles.modalBtnPrimary}
                          onClick={() => {
                            const text = preSendCheckPendingText;
                            setPreSendCheckPendingText(null);
                            if (text) void doSend(text);
                          }}
                        >
                          Invia comunque
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm draft modal: summary + availability + confirm */}
                {confirmDraftModal && (
                  <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-draft-title">
                    <div className={styles.modalContent} style={{ maxWidth: 480 }}>
                      <h2 id="confirm-draft-title" className={styles.modalTitle}>
                        {confirmDraftModal.step === 'conflict' ? 'Conflitto di disponibilità' : 'Stai creando questa prenotazione'}
                      </h2>
                      <div className={styles.modalBody}>
                        {confirmDraftEdit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                              Data
                              <input
                                type="date"
                                value={confirmDraftEdit.booking_date}
                                onChange={(e) => setConfirmDraftEdit((prev) => prev ? { ...prev, booking_date: e.target.value } : null)}
                                style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                              />
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                                Inizio
                                <input
                                  type="time"
                                  value={confirmDraftEdit.start_time}
                                  onChange={(e) => setConfirmDraftEdit((prev) => prev ? { ...prev, start_time: e.target.value } : null)}
                                  style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                                />
                              </label>
                              <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                                Fine
                                <input
                                  type="time"
                                  value={confirmDraftEdit.end_time}
                                  onChange={(e) => setConfirmDraftEdit((prev) => prev ? { ...prev, end_time: e.target.value } : null)}
                                  style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                                />
                              </label>
                            </div>
                            <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                              Ospite
                              <input
                                type="text"
                                value={confirmDraftEdit.customer_name}
                                onChange={(e) => setConfirmDraftEdit((prev) => prev ? { ...prev, customer_name: e.target.value } : null)}
                                placeholder="Nome cliente"
                                style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                              />
                            </label>
                            <label style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)' }}>
                              Punto ritrovo
                              <input
                                type="text"
                                value={confirmDraftEdit.meeting_point_text}
                                onChange={(e) => setConfirmDraftEdit((prev) => prev ? { ...prev, meeting_point_text: e.target.value } : null)}
                                placeholder="Dove"
                                style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: 'rgba(226,232,240,0.95)', width: '100%', boxSizing: 'border-box' }}
                              />
                            </label>
                          </div>
                        ) : (
                          <p style={{ marginBottom: 8 }}>
                            {formatBookingDateTime(
                              `${confirmDraftModal.draft.booking_date}T${confirmDraftModal.draft.start_time}`
                            )}
                            {confirmDraftModal.draft.customer_name && ` · ${confirmDraftModal.draft.customer_name}`}
                            {confirmDraftModal.draft.meeting_point_text && ` · ${confirmDraftModal.draft.meeting_point_text}`}
                          </p>
                        )}
                        {confirmDraftModal.step === 'conflict' && confirmDraftModal.checkResult?.conflicts?.length ? (
                          <p style={{ fontSize: '0.875rem', color: '#fca5a5', marginTop: 8 }}>
                            In questo slot risultano altri impegni in calendario. Puoi confermare comunque o cambiare orario.
                          </p>
                        ) : null}
                        {confirmDraftModal.checkResult?.availabilityUnknown ? (
                          <p style={{ fontSize: '0.875rem', color: '#fbbf24', marginTop: 8 }}>
                            Impossibile verificare il calendario; conferma a tuo rischio.
                          </p>
                        ) : null}
                      </div>
                      <div className={styles.modalActions} style={{ flexWrap: 'wrap', gap: 8 }}>
                        {confirmDraftModal.step === 'summary' && !confirmDraftModal.checkResult?.hasConflict && (
                          <button
                            type="button"
                            className={styles.modalBtnSecondary}
                            disabled={confirmDraftChecking}
                            onClick={() => void handleCheckAvailabilityForDraft()}
                          >
                            {confirmDraftChecking ? 'Verifica…' : 'Verifica disponibilità'}
                          </button>
                        )}
                        {confirmDraftModal.step === 'conflict' && (
                          <button
                            type="button"
                            className={styles.modalBtnSecondary}
                            onClick={handleCloseConfirmDraftModal}
                          >
                            Cambia orario
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.modalBtnPrimary}
                          disabled={confirmingDraftId === confirmDraftModal.draft.id}
                          onClick={() => void handleConfirmDraftSubmit()}
                        >
                          {confirmingDraftId === confirmDraftModal.draft.id
                            ? 'Conferma…'
                            : confirmDraftModal.step === 'conflict'
                              ? 'Conferma comunque'
                              : 'Conferma prenotazione'}
                        </button>
                        <button type="button" className={styles.modalBtnSecondary} onClick={handleCloseConfirmDraftModal}>
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Actions strip: AI suggestion + next actions + composer ── */}
                <div className={styles.actionsStrip}>
                  {(draftLoading || regenerating) && (
                    <div className={styles.aiSuggestionLoading}>
                      <span style={{ animation: 'pulse 1.5s infinite', opacity: 0.7 }}>●</span>
                      {regenerating ? 'Regenerating suggestion…' : 'Loading suggestion…'}
                    </div>
                  )}
                  {!draftLoading && !regenerating && draft && draft.effectiveState === 'proposed' && (
                    <div className={styles.aiSuggestionCard}>
                      <div className={styles.aiSuggestionLabel}>
                        Suggested reply
                        <span className={styles.aiSuggestionBadge} title="Suggerimento generato dall’AI">AI</span>
                      </div>
                      <div className={styles.aiSuggestionText}>
                        {draft.text.replace(/^Suggested reply for human review\.?\s*/i, '').trim()}
                      </div>
                      <div className={styles.aiSuggestionActions}>
                        <button
                          type="button"
                          className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnPrimary}`}
                          disabled={sendAsIsLoading}
                          onClick={() => void handleSendAsIs()}
                        >
                          {sendAsIsLoading ? 'Invio…' : 'Invia così'}
                        </button>
                        <button
                          type="button"
                          className={styles.aiSuggestionBtn}
                          disabled={sendAsIsLoading}
                          onClick={() => void handleInsertDraft()}
                        >
                          Inserisci
                        </button>
                        <button
                          type="button"
                          className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnSecondary}`}
                          disabled={regenerating || sendAsIsLoading}
                          onClick={() => void handleRegenerateDraft()}
                        >
                          {regenerating ? '…' : 'Rigenera'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnDanger}`}
                          disabled={sendAsIsLoading}
                          onClick={() => void handleDismissDraft()}
                        >
                          Scarta
                        </button>
                      </div>
                      {draftError && (
                        <div style={{ padding: '0 14px 10px', fontSize: '0.75rem', color: '#fca5a5' }}>
                          {draftError}
                        </div>
                      )}
                    </div>
                  )}
                  {!draftLoading && !regenerating && draft && draft.effectiveState === 'expired' && (
                    <div className={styles.aiSuggestionExpired}>
                      <span>Suggestion expired</span>
                      <button
                        type="button"
                        className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnPrimary}`}
                        onClick={() => void handleRegenerateDraft()}
                        disabled={regenerating}
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                  {!draftLoading && !regenerating && messages.length > 0 && (!draft || (draft.effectiveState !== 'proposed' && draft.effectiveState !== 'expired')) && (
                    <div className={styles.aiSuggestionEmpty}>
                      <span>No suggestion for this message</span>
                      <button
                        type="button"
                        className={`${styles.aiSuggestionBtn} ${styles.aiSuggestionBtnPrimary}`}
                        onClick={() => void handleRegenerateDraft()}
                        disabled={regenerating}
                      >
                        {regenerating ? '…' : 'Regenerate'}
                      </button>
                    </div>
                  )}

                  {/* Suggested actions: only when backend returns actions for this conversation */}
                  {selectedId && (suggestedActionsByConversationId[selectedId]?.length ?? 0) > 0 && (
                    <div className={styles.nextActionsWrap}>
                      <div className={styles.nextActionsLabel}>Suggested actions</div>
                      <div className={styles.nextActionsRow}>
                        {(suggestedActionsByConversationId[selectedId] ?? []).map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            className={styles.nextActionBtn}
                            disabled={
                              action.id === 'create_payment_link' &&
                              paymentLinkLoadingBookingId === action.payload?.bookingId
                            }
                            onClick={() => {
                              if (action.id === 'confirm_booking_draft' && action.payload?.bookingDraftId) {
                                const pending = selectedId && contextByConversationId[selectedId]?.pending_booking_draft;
                                if (pending) {
                                  handleOpenConfirmDraft(pending);
                                } else {
                                  router.push('/instructor/booking-drafts');
                                }
                              }
                              if (action.id === 'create_payment_link' && action.payload?.bookingId) {
                                void handleCreatePaymentLinkFromThread(action.payload.bookingId);
                              }
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
      )}
    </div>
  );
}
