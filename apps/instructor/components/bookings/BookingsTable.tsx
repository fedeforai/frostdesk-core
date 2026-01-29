type Booking = {
  id: string
  customer_name: string | null
  start_time: string
  end_time: string
  status: string
}

export function BookingsTable({ items }: { items: Booking[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Start</th>
          <th>End</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((b) => (
          <tr key={b.id}>
            <td>{b.customer_name ?? "-"}</td>
            <td>{b.start_time}</td>
            <td>{b.end_time}</td>
            <td>{b.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
