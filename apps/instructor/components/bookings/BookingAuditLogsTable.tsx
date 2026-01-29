import type { BookingAuditLogRow } from "@/lib/instructorApi"

export function BookingAuditLogsTable({ items }: { items: BookingAuditLogRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Created At</th>
          <th>Action</th>
          <th>Booking ID</th>
          <th>Request ID</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.created_at}</td>
            <td>{item.action}</td>
            <td>{item.booking_id ?? "-"}</td>
            <td>{item.request_id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
