type AIBookingBusySlotsPreviewProps = {
  busySlots: {
    start_time: string;
    end_time: string;
  }[];
};

export function AIBookingBusySlotsPreview({
  busySlots,
}: AIBookingBusySlotsPreviewProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Start time</th>
          <th>End time</th>
        </tr>
      </thead>
      <tbody>
        {busySlots.map((slot, index) => (
          <tr key={index}>
            <td>{slot.start_time}</td>
            <td>{slot.end_time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
