import PDFDocument from 'pdfkit';
import type { ComprehensiveDashboard } from '@frostdesk/db';

/**
 * Builds an Investor Snapshot PDF from ComprehensiveDashboard data.
 * Minimal 1-page design with 10 core KPIs.
 *
 * @param data - ComprehensiveDashboard snapshot
 * @param env  - Environment label (e.g. "production", "staging")
 * @returns Buffer containing the .pdf file
 */
export async function buildInvestorReport(
  data: ComprehensiveDashboard,
  env: string = 'unknown',
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'FrostDesk — Investor Snapshot',
          Author: 'FrostDesk Admin',
          Subject: 'Investor KPI Report',
        },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Colors ──────────────────────────────────────────────────
      const C = {
        brand: '#1E3A5F',
        accent: '#3B82F6',
        text: '#1E293B',
        muted: '#64748B',
        light: '#F1F5F9',
        ok: '#10B981',
        warn: '#F59E0B',
        critical: '#EF4444',
        white: '#FFFFFF',
      };

      const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ── Header ──────────────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill(C.brand);

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(C.white)
        .text('FrostDesk', 50, 30, { continued: true })
        .font('Helvetica')
        .fontSize(22)
        .text(' — Investor Snapshot');

      const dateStr = new Date(data.generated_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc
        .fontSize(10)
        .fillColor('#94A3B8')
        .text(`${dateStr}  ·  ${env}`, 50, 62);

      doc.moveDown(3);
      let y = 120;

      // ── KPI helpers ─────────────────────────────────────────────
      const COL_W = (pageW - 20) / 2;

      function drawKpiCard(
        col: 0 | 1,
        row: number,
        label: string,
        value: string,
        color: string = C.text,
      ) {
        const x = doc.page.margins.left + col * (COL_W + 20);
        const cardY = y + row * 72;
        const cardH = 62;

        // Card background
        doc
          .roundedRect(x, cardY, COL_W, cardH, 6)
          .fill(C.light);

        // Label
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(C.muted)
          .text(label.toUpperCase(), x + 16, cardY + 12, { width: COL_W - 32 });

        // Value
        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor(color)
          .text(value, x + 16, cardY + 28, { width: COL_W - 32 });
      }

      // ── Section title ───────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(C.brand)
        .text('Core Metrics', doc.page.margins.left, y);

      y += 24;

      // ── Row 0 ───────────────────────────────────────────────────
      drawKpiCard(0, 0, 'Conversations Today', String(data.today.conversations_new));
      drawKpiCard(1, 0, 'Open Conversations', String(data.today.conversations_open));

      // ── Row 1 ───────────────────────────────────────────────────
      drawKpiCard(0, 1, 'Escalations Today', String(data.ai.escalations_today),
        data.ai.escalations_today > 5 ? C.warn : C.text);
      drawKpiCard(1, 1, 'Bookings Created Today', String(data.today.bookings_created), C.accent);

      // ── Row 2 ───────────────────────────────────────────────────
      drawKpiCard(0, 2, 'Bookings Cancelled Today', String(data.today.bookings_cancelled),
        data.today.bookings_cancelled > 0 ? C.critical : C.text);
      drawKpiCard(1, 2, 'AI Approval Rate',
        data.ai.draft_approval_rate !== null ? `${data.ai.draft_approval_rate}%` : 'N/A',
        data.ai.draft_approval_rate !== null && data.ai.draft_approval_rate >= 70 ? C.ok : C.warn);

      // ── Row 3 ───────────────────────────────────────────────────
      drawKpiCard(0, 3, 'AI Errors Today', String(data.ai.draft_errors_today),
        data.ai.draft_errors_today > 0 ? C.critical : C.ok);
      drawKpiCard(1, 3, 'AI Drafts Sent Today', String(data.ai.drafts_sent_today));

      // ── Row 4 ───────────────────────────────────────────────────
      const quotaStr = data.system.quota.percentage !== null
        ? `${data.system.quota.percentage}%`
        : 'N/C';
      const quotaColor = data.system.quota.percentage !== null && data.system.quota.percentage > 90
        ? C.critical
        : data.system.quota.percentage !== null && data.system.quota.percentage > 70
          ? C.warn
          : C.ok;
      drawKpiCard(0, 4, 'Quota Usage', quotaStr, quotaColor);
      drawKpiCard(1, 4, 'Pilot Instructors',
        `${data.system.pilot_instructor_count} / ${data.system.pilot_max}`);

      // ── Summary line ────────────────────────────────────────────
      const summaryY = y + 5 * 72 + 16;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.muted)
        .text(
          `Active instructors (7d): ${data.instructors.active_7d}  ·  ` +
          `Total profiles: ${data.instructors.total_profiles}  ·  ` +
          `Onboarded: ${data.instructors.onboarded_profiles}  ·  ` +
          `AI calls (7d): ${data.ai.total_calls_7d}  ·  ` +
          `AI cost (7d): €${(data.ai.total_cost_cents_7d / 100).toFixed(2)}`,
          doc.page.margins.left,
          summaryY,
          { width: pageW },
        );

      // ── Footer ──────────────────────────────────────────────────
      const footerY = doc.page.height - doc.page.margins.bottom - 24;
      doc
        .moveTo(doc.page.margins.left, footerY)
        .lineTo(doc.page.margins.left + pageW, footerY)
        .strokeColor('#E2E8F0')
        .lineWidth(0.5)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C.muted)
        .text(
          `Generated ${data.generated_at}  ·  env: ${env}  ·  FrostDesk Admin`,
          doc.page.margins.left,
          footerY + 6,
          { width: pageW, align: 'center' },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
