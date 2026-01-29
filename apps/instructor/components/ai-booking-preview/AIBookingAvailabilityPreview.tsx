type AIBookingAvailabilityPreviewProps = {
  availability: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
};

export function AIBookingAvailabilityPreview({
  availability,
}: AIBookingAvailabilityPreviewProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Day of week</th>
          <th>Start time</th>
          <th>End time</th>
        </tr>
      </thead>
      <tbody>
        {availability.map((item) => (
          <tr key={item.id}>
            <td>{item.day_of_week}</td>
            <td>{item.start_time}</td>
            <td>{item.end_time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
