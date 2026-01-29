export function BookingLifecycleTimeline({ auditLog }: { auditLog: any[] }) {
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
        {auditLog.map((item, index) => (
          <tr key={item.id || index}>
            <td>{item.created_at ?? "-"}</td>
            <td>{item.action ?? "-"}</td>
            <td>{item.booking_id ?? "-"}</td>
            <td>{item.request_id ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
