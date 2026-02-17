import AdminSidebarNav from './AdminSidebarNav';
import type { AdminSidebarIconName } from './AdminSidebarIcons';

export interface NavItem {
  label: string;
  href: string;
  icon: AdminSidebarIconName;
  roles: string[];
  section: 'menu' | 'sistema';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard', roles: ['system_admin', 'human_approver', 'human_operator'], section: 'menu' },
  { label: 'AI & Inbox', href: '/admin/human-inbox', icon: 'inbox', roles: ['system_admin', 'human_approver', 'human_operator'], section: 'menu' },
  { label: 'Bookings', href: '/admin/bookings', icon: 'calendar', roles: ['system_admin', 'human_approver', 'human_operator'], section: 'menu' },
  { label: 'Calendar', href: '/admin/calendar', icon: 'calendarDays', roles: ['system_admin', 'human_approver', 'human_operator'], section: 'menu' },
  { label: 'Instructors', href: '/admin/instructor-approvals', icon: 'users', roles: ['system_admin', 'human_approver', 'human_operator'], section: 'menu' },
  { label: 'Settings', href: '/admin/pilot', icon: 'settings', roles: ['system_admin'], section: 'sistema' },
  { label: 'Logs', href: '/admin/dev-tools', icon: 'logs', roles: ['system_admin'], section: 'sistema' },
];

export default function AdminSidebar({
  role,
  collapsed,
  onToggleCollapse,
}: {
  role?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const visibleItems = navItems.filter((item) => {
    if (!role) return false;
    return item.roles.includes(role);
  });
  return (
    <AdminSidebarNav
      items={visibleItems}
      collapsed={collapsed ?? false}
      onToggleCollapse={onToggleCollapse}
    />
  );
}
