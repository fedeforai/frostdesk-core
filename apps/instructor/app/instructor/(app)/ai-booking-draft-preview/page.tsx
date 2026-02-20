'use client';

import { useState } from 'react';
import { AIBookingDraftPreview } from '@/components/ai-booking-draft/AIBookingDraftPreview';
import { DraftSafetyNotice } from '@/components/ai-booking-draft/DraftSafetyNotice';
import { HumanConfirmBookingButton } from '@/components/ai-booking-draft/HumanConfirmBookingButton';
import { HumanConfirmDangerModal } from '@/components/ai-booking-draft/HumanConfirmDangerModal';
import { confirmAIBookingDraft } from '@/lib/instructorApi';

/** Preview/mock shape for AI booking draft (matches backend AIBookingDraft) */
interface PreviewDraft {
  instructor_id: string;
  start_time: string;
  end_time: string;
  service_id?: string | null;
  meeting_point_id?: string | null;
  customer_name?: string | null;
  draft_reason: string;
  created_at: string;
}

export default function AIBookingDraftPreviewPage() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const draft: PreviewDraft = {
    instructor_id: 'preview',
    start_time: '2026-02-01T09:00:00Z',
    end_time: '2026-02-01T11:00:00Z',
    service_id: null,
    meeting_point_id: null,
    customer_name: null,
    draft_reason: 'AI context preview only',
    created_at: new Date().toISOString(),
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Anteprima bozza prenotazione
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Bozza generata dall&apos;AI: conferma solo dopo aver verificato i dati.
      </p>

      <DraftSafetyNotice />
      <AIBookingDraftPreview draft={draft} />

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        border: '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: 8,
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          color: 'rgba(203, 213, 225, 0.92)',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ accentColor: 'rgb(59, 130, 246)' }}
          />
          Ho capito che questa azione creerà una prenotazione reale
        </label>

        <HumanConfirmBookingButton
          acknowledged={acknowledged}
          onClick={() => setModalOpen(true)}
        />
      </div>

      <HumanConfirmDangerModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={async () => {
          try {
            // requestId must be stable per user click.
            // Minimal: generate here.
            const requestId =
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : String(Date.now());

            const res = await confirmAIBookingDraft({
              confirmed: true,
              requestId,
              startTime: draft.start_time,
              endTime: draft.end_time,
              serviceId: draft.service_id ?? null,
              meetingPointId: draft.meeting_point_id ?? null,
              customerName: draft.customer_name ?? null,
              notes: null,
              draftPayload: draft,
            });

            window.location.href = `/instructor/bookings/${res.bookingId}`;
          } catch (e: any) {
            console.error(e);
            alert('Impossibile confermare la bozza. Riprova.');
          } finally {
            setModalOpen(false);
          }
        }}
      />
    </main>
  );
}
