export interface RouteMeta {
  label: string;
  section?: string;
}

/**
 * Static route mapping translating exact paths to human-readable labels and operational sections.
 */
export const STATIC_ROUTE_MAP: Record<string, RouteMeta> = {
  '/': { label: 'Home', section: 'Platform' },
  '/dashboard': { label: 'Dashboard', section: 'Academic Hub' },
  '/dashboard/student': { label: 'Student Hub', section: 'Academic Hub' },
  '/dashboard/research': { label: 'Researcher Hub', section: 'Academic Hub' },
  '/dashboard/admin': { label: 'Admin Panel', section: 'System Administration' },
  '/admin': { label: 'Admin Panel', section: 'System Administration' },
  '/documents': { label: 'My Documents', section: 'Repository' },
  '/settings': { label: 'Settings', section: 'Account' },
  '/login': { label: 'Sign In', section: 'Authentication' },
  '/register': { label: 'Create Account', section: 'Authentication' },
};

/**
 * Common path segment translations when building hierarchical breadcrumb trails.
 */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  student: 'Student Hub',
  research: 'Researcher Hub',
  admin: 'Admin Panel',
  documents: 'My Documents',
  settings: 'Settings',
  overview: 'Overview',
  chat: 'AI Chat',
  report: 'Integrity Report',
  analytics: 'Analytics',
  history: 'History',
};

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

/**
 * Parses any application pathname into a structured array of breadcrumb objects.
 * Supports custom dynamic resolvers for entities like document IDs.
 */
export function generateBreadcrumbs(
  pathname: string,
  dynamicResolver?: (segment: string, fullPath: string) => string | undefined,
): BreadcrumbItem[] {
  // Normalize path and remove query parameters/trailing slashes
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '');
  if (!cleanPath || cleanPath === '') {
    return [{ label: 'Home', href: '/', isCurrent: true }];
  }

  const rawSegments = cleanPath.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Always prepend Home
  items.push({
    label: 'Home',
    href: '/dashboard',
    isCurrent: cleanPath === '/' || cleanPath === '/dashboard',
  });

  // If the path is just root or /dashboard, return early with Home > Dashboard
  if (cleanPath === '/' || cleanPath === '/dashboard') {
    return [
      { label: 'Home', href: '/dashboard', isCurrent: false },
      { label: 'Dashboard', href: '/dashboard', isCurrent: true },
    ];
  }

  let accumulatedPath = '';

  rawSegments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isCurrent = index === rawSegments.length - 1;

    // Check exact static match first
    const staticMatch = STATIC_ROUTE_MAP[accumulatedPath];
    if (staticMatch) {
      items.push({
        label: staticMatch.label,
        href: accumulatedPath,
        isCurrent,
      });
      return;
    }

    // Check custom dynamic title resolver (e.g. document titles)
    const dynamicLabel = dynamicResolver?.(segment, accumulatedPath);
    if (dynamicLabel) {
      items.push({
        label: dynamicLabel,
        href: accumulatedPath,
        isCurrent,
      });
      return;
    }

    // Check segment lookup dictionary
    const segmentLabel = SEGMENT_LABELS[segment.toLowerCase()];
    if (segmentLabel) {
      items.push({
        label: segmentLabel,
        href: accumulatedPath,
        isCurrent,
      });
      return;
    }

    // Heuristic fallback for IDs (e.g. doc-123 -> Doc #123 or formatted label)
    if (/^(doc-|usr-|rep-)/i.test(segment) || /^[a-f0-9-]{8,}$/i.test(segment)) {
      const shortId = segment.replace(/^(doc-|usr-|rep-)/i, '').slice(0, 8);
      items.push({
        label: `Doc #${shortId}`,
        href: accumulatedPath,
        isCurrent,
      });
      return;
    }

    // Humanize standard kebab-case or snake_case segment
    const humanized = segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    items.push({
      label: humanized,
      href: accumulatedPath,
      isCurrent,
    });
  });

  // Deduplicate consecutive identical hrefs if Home and first segment overlap
  return items.filter((item, idx, arr) => {
    if (idx === 0) return true;
    return item.href !== arr[idx - 1].href;
  });
}
