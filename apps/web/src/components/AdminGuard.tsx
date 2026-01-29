import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkAdminStatus } from '../lib/api';
import Forbidden403 from './Forbidden403';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const admin = await checkAdminStatus(session.user.id);
        setIsAdmin(admin);
      } catch (error) {
        console.error('Admin check failed:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAdmin();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Forbidden403 />;
  }

  return <>{children}</>;
}
