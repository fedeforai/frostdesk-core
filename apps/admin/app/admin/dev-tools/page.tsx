import { notFound } from 'next/navigation';
import PilotProtocolPage from '../pilot/page';

export default async function DevToolsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PilotProtocolPage />;
}
