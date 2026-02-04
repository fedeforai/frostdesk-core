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
          <tr
            key={b.id}
            style={b.status === 'confirmed' ? { backgroundColor: '#f0fdf4' } : undefined}
          >
            <td
              style={
                b.status === 'confirmed'
                  ? { borderLeft: '3px solid #16a34a', paddingLeft: '0.5rem' }
                  : undefined
              }
            >
              {b.customer_name ?? "-"}
            </td>
            <td>{b.start_time}</td>
            <td>{b.end_time}</td>
            <td
              style={
                b.status === 'confirmed'
                  ? { color: '#16a34a' }
                  : undefined
              }
            >
              {b.status === 'confirmed' ? (
                <>
                  <span style={{ color: '#16a34a' }}>✓</span> {b.status}
                </>
              ) : (
                b.status
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
