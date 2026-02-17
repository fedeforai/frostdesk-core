'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchReportArchive,
  type ReportArchiveType,
  type ReportArchiveItem,
} from '@/lib/adminApi';
import s from './reportArchive.module.css';

const TABS: { key: ReportArchiveType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'investor', label: 'Investor' },
];

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function extractEnv(name: string): string {
  const parts = name.replace(/\.xlsx$|\.pdf$/i, '').split('_');
  return parts[parts.length - 1] || '—';
}

export default function ReportArchive() {
  const [activeTab, setActiveTab] = useState<ReportArchiveType>('daily');
  const [items, setItems] = useState<ReportArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (type: ReportArchiveType) => {
    setLoading(true);
    setError(false);
    setItems([]);
    try {
      const result = await fetchReportArchive(type, 20);
      if (result) {
        setItems(result.items);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const handleTabClick = (type: ReportArchiveType) => {
    if (type !== activeTab) {
      setActiveTab(type);
    }
  };

  return (
    <div className={s.archive}>
      <div className={s.archiveHeader}>
        <div className={s.archiveTitle}>Report Archive</div>
        <div className={s.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${s.tab} ${activeTab === tab.key ? s.tabActive : ''}`}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.archiveBody}>
        {loading && (
          <div className={s.archiveMessage}>Loading archive...</div>
        )}

        {error && !loading && (
          <div className={s.archiveError}>
            Unable to load archive.
            <button type="button" className={s.retryBtn} onClick={() => load(activeTab)}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={s.archiveMessage}>
            No &ldquo;{activeTab}&rdquo; reports archived.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <table className={s.archiveTable}>
            <thead>
              <tr>
                <th>File</th>
                <th>Date</th>
                <th>Env</th>
                <th>Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.path}>
                  <td className={s.fileName}>{item.name}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <span className={s.envBadge}>{extractEnv(item.name)}</span>
                  </td>
                  <td>{formatSize(item.size)}</td>
                  <td>
                    {item.download_url ? (
                      <a
                        href={item.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.downloadBtn}
                      >
                        Download
                      </a>
                    ) : (
                      <span className={s.noUrl}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
