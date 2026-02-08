import { getUserRole } from '@/lib/getUserRole';
import AdminSidebarNav from './AdminSidebarNav';

interface NavItem {
  label: string;
  href: string;
  roles: string[]; // Roles that can see this item
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'Instructor approvals', href: '/admin/instructor-approvals', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'Pilot', href: '/admin/pilot', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'Inbox', href: '/admin/human-inbox', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'Bookings', href: '/admin/bookings', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'Calendar', href: '/admin/calendar', roles: ['system_admin', 'human_approver', 'human_operator'] },
  { label: 'System', href: '/admin/system-health', roles: ['system_admin'] },
];

export default async function AdminSidebar() {
  const role = await getUserRole();

  // Filter nav items based on role
  const visibleItems = navItems.filter(item => {
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <div style={{
      width: '200px',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      padding: '1rem 0',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
          FrostDesk
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          Admin
        </div>
      </div>
      
      <AdminSidebarNav items={visibleItems} />
    </div>
  );
}
