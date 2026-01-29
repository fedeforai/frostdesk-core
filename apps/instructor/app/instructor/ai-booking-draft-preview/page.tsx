'use client';

import { useState } from 'react';
import { AIBookingDraftPreview } from "@/components/ai-booking-draft/AIBookingDraftPreview";
import { DraftSafetyNotice } from "@/components/ai-booking-draft/DraftSafetyNotice";
import { HumanConfirmBookingButton } from '@/components/ai-booking-draft/HumanConfirmBookingButton';
import { HumanConfirmDangerModal } from '@/components/ai-booking-draft/HumanConfirmDangerModal';
import { confirmAIBookingDraft } from '@/lib/instructorApi';
import { AIBookingDraft } from "../../../../../packages/db/src/ai_booking_draft_types";

export default function AIBookingDraftPreviewPage() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const draft: AIBookingDraft = {
    instructor_id: "preview",
    start_time: "2026-02-01T09:00:00Z",
    end_time: "2026-02-01T11:00:00Z",
    service_id: null,
    meeting_point_id: null,
    customer_name: null,
    draft_reason: "AI context preview only",
    created_at: new Date().toISOString(),
  };

  return (
    <main>
      <DraftSafetyNotice />
      <AIBookingDraftPreview draft={draft} />
      <div style={{ marginTop: '32px' }}>
        <label style={{ display: 'block', marginBottom: '12px' }}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          {' '}I understand this will create a real booking
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
            alert('Failed to confirm draft.');
          } finally {
            setModalOpen(false);
          }
        }}
      />
    </main>
  );
}
