import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  FlaskConical,
  Shield,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '@academic-assistant/shared-types';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: string;
  description?: string;
  end?: boolean;
}

/**
 * Centralized array of navigation objects.
 * Encapsulates core application portals, icons, and authorized roles.
 */
export const navigationConfig: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['STUDENT', 'RESEARCHER', 'ADMIN'],
    description: 'Central academic operations hub and summary metrics',
    end: true,
  },
  {
    name: 'My Documents',
    href: '/documents',
    icon: FileText,
    roles: ['STUDENT', 'RESEARCHER', 'ADMIN'],
    description: 'Manuscript library, uploads, and plagiarism scan histories',
  },
  {
    name: 'Student Hub',
    href: '/dashboard/student',
    icon: GraduationCap,
    roles: ['STUDENT', 'RESEARCHER', 'ADMIN'],
    description: 'Course assignments, originality checker, and citation tools',
    end: true,
  },
  {
    name: 'Researcher Hub',
    href: '/dashboard/research',
    icon: FlaskConical,
    roles: ['RESEARCHER', 'ADMIN'],
    badge: 'Pro',
    description: 'Multi-document Agentic RAG and ChromaDB vector clusters',
    end: true,
  },
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: Shield,
    roles: ['ADMIN'],
    badge: 'System',
    description: 'Institutional user governance and cluster health telemetry',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['STUDENT', 'RESEARCHER', 'ADMIN'],
    description: 'Personal profile details and security credential rotation',
  },
];

/**
 * Filter navigation configuration by the user's active role.
 * If no role is present, returns an empty array.
 */
export const getAuthorizedNavigation = (
  items: NavigationItem[] = navigationConfig,
  userRole?: string | null,
): NavigationItem[] => {
  if (!userRole) return [];
  return items.filter((item) => item.roles.includes(userRole as UserRole));
};

/**
 * Check if a specific route href is authorized for a given user role.
 */
export const isRouteAuthorized = (href: string, userRole?: string | null): boolean => {
  if (!userRole) return false;
  const match = navigationConfig.find((item) => item.href === href);
  if (!match) return true; // If not in restricted config, allow
  return match.roles.includes(userRole as UserRole);
};
