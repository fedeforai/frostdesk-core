type AIBookingRecentBookingsPreviewProps = {
  recentBookings: {
    start_time: string;
    end_time: string;
  }[];
};

export function AIBookingRecentBookingsPreview({
  recentBookings,
}: AIBookingRecentBookingsPreviewProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Start time</th>
          <th>End time</th>
        </tr>
      </thead>
      <tbody>
        {recentBookings.map((booking, index) => (
          <tr key={index}>
            <td>{booking.start_time}</td>
            <td>{booking.end_time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
