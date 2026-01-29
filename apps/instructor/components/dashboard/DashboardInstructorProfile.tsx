type Props = {
  instructor: {
    name: string;
    languages: string;
    resort_base: string;
  } | null;
};

export function DashboardInstructorProfile({ instructor }: Props) {
  if (!instructor) return <p>No profile data.</p>;

  return (
    <section>
      <h3>Instructor</h3>
      <p>Name: {instructor.name}</p>
      <p>Languages: {instructor.languages}</p>
      <p>Base resort: {instructor.resort_base}</p>
    </section>
  );
}
