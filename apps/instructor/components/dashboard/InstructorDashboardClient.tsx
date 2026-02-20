'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getConversations,
  getMessages,
  getHotLeads,
  getLatestConversation,
  getKpiSummary,
  getFunnelKpi,
  type InstructorConversation,
  type FunnelKpiResponse,
} from '@/lib/instructorApi';
import { usePolling } from '@/lib/usePolling';
import HomeDashboard from './HomeDashboard';
import type { Lead } from './cards/HotLeadsCard';
import type { Conversation } from './cards/ConversationCard';

function formatLastActivity(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function InstructorDashboardClient() {
  const [conversations, setConversations] = useState<InstructorConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [lastMessageByConvId, setLastMessageByConvId] = useState<Record<string, string>>({});
  const [kpiTiles, setKpiTiles] = useState<Array<{ value: number | string; label: string }>>([
    { value: 0, label: 'Drafts generated' },
    { value: 0, label: 'Drafts used' },
    { value: 0, label: 'Drafts ignored' },
    { value: '0%', label: 'Draft usage rate' },
  ]);
  const [kpiPollingBlocked, setKpiPollingBlocked] = useState(false);
  const [funnel, setFunnel] = useState<FunnelKpiResponse | null>(null);

  const loadKpiSummary = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      const res = await getKpiSummary('7d');
      if (res.ok && res.drafts) {
        const usageRate = res.drafts.generated > 0
          ? Math.round(res.drafts.usageRate * 100)
          : 0;
        setKpiTiles([
          { value: res.drafts.generated, label: 'Drafts generated' },
          { value: res.drafts.used, label: 'Drafts used' },
          { value: res.drafts.ignored, label: 'Drafts ignored' },
          { value: `${usageRate}%`, label: 'Draft usage rate' },
        ]);
      }
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err?.status === 401 || err?.status === 403) {
        setKpiPollingBlocked(true);
      }
    }
  }, []);

  useEffect(() => {
    void loadKpiSummary();
  }, [loadKpiSummary]);

  usePolling(
    useCallback(() => loadKpiSummary({ silent: true }), [loadKpiSummary]),
    10000,
    !kpiPollingBlocked
  );

  const loadFunnel = useCallback(async () => {
    try {
      const data = await getFunnelKpi('7d');
      setFunnel(data);
    } catch {
      setFunnel(null);
    }
  }, []);

  useEffect(() => {
    void loadFunnel();
  }, [loadFunnel]);

  const CONVERSATIONS_TIMEOUT_MS = 15_000;

  const loadConversations = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setError(null);
      setLoading(true);
    }
    try {
      const list = await Promise.race([
        getConversations(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), CONVERSATIONS_TIMEOUT_MS)
        ),
      ]);
      setConversations(list);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err?.status;
      const message = err?.message || 'Failed to load conversations';
      if (!silent) setError({ status, message });
      if (status === 401 || status === 403) setAuthBlocked(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  usePolling(
    useCallback(() => loadConversations({ silent: true }), [loadConversations]),
    5000,
    !authBlocked
  );

  const latest = getLatestConversation(conversations);
  const latestId = latest?.id ?? null;

  useEffect(() => {
    if (!latestId) return;
    if (lastMessageByConvId[latestId] !== undefined) return;

    let cancelled = false;
    getMessages(latestId)
      .then((msgs) => {
        if (cancelled) return;
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const text = last?.text ?? '';
        setLastMessageByConvId((prev) => (prev[latestId] === text ? prev : { ...prev, [latestId]: text }));
      })
      .catch(() => {
        if (!cancelled) setLastMessageByConvId((prev) => ({ ...prev, [latestId]: '' }));
      });
    return () => {
      cancelled = true;
    };
  }, [latestId, lastMessageByConvId]);

  const hotLeads: Lead[] = getHotLeads(conversations, 6).map((c) => ({
    name: c.customerName,
    tag: c.channel,
    status: c.status === 'hot' ? 'Needs Reply' : undefined,
    conversationId: c.id,
  }));

  const conversation: Conversation | null = latest
    ? {
        leadName: latest.customerName,
        meta: `${latest.channel} · Last message ${formatLastActivity(latest.updatedAt)}`,
        lastMessage: lastMessageByConvId[latest.id] ?? latest.lastMessagePreview ?? '',
        conversationId: latest.id,
      }
    : null;

  const empty = !loading && conversations.length === 0;

  return (
    <HomeDashboard
      leads={hotLeads}
      conversation={conversation}
      loading={loading}
      error={error}
      empty={empty}
      onRetry={() => void loadConversations()}
      kpiTiles={kpiTiles}
      funnel={funnel}
      funnelPrimaryHref="/instructor/bookings/new"
    />
  );
}
