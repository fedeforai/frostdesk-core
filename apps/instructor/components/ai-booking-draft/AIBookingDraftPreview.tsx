import { AIBookingDraft } from "../../../../packages/db/src/ai_booking_draft_types";

interface Props {
  draft: AIBookingDraft;
}

export function AIBookingDraftPreview({ draft }: Props) {
  return (
    <section>
      <h2>AI Booking Draft (Preview)</h2>

      <table>
        <tbody>
          <tr>
            <td>Customer</td>
            <td>{draft.customer_name ?? "-"}</td>
          </tr>
          <tr>
            <td>Start time</td>
            <td>{draft.start_time}</td>
          </tr>
          <tr>
            <td>End time</td>
            <td>{draft.end_time}</td>
          </tr>
          <tr>
            <td>Service</td>
            <td>{draft.service_id ?? "-"}</td>
          </tr>
          <tr>
            <td>Meeting point</td>
            <td>{draft.meeting_point_id ?? "-"}</td>
          </tr>
          <tr>
            <td>Draft reason</td>
            <td>{draft.draft_reason}</td>
          </tr>
          <tr>
            <td>Generated at</td>
            <td>{draft.created_at}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
