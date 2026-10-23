import { describe, it, expect } from 'vitest';
import { generateBreadcrumbs, STATIC_ROUTE_MAP } from '../route-maps';

describe('Route Maps Configuration & Breadcrumb Parser', () => {
  it('should contain expected static routes and human labels', () => {
    expect(STATIC_ROUTE_MAP['/dashboard'].label).toBe('Dashboard');
    expect(STATIC_ROUTE_MAP['/documents'].label).toBe('My Documents');
    expect(STATIC_ROUTE_MAP['/settings'].label).toBe('Settings');
    expect(STATIC_ROUTE_MAP['/dashboard/student'].label).toBe('Student Hub');
    expect(STATIC_ROUTE_MAP['/dashboard/research'].label).toBe('Researcher Hub');
    expect(STATIC_ROUTE_MAP['/admin'].label).toBe('Admin Panel');
  });

  it('should parse root or /dashboard into Home > Dashboard trail', () => {
    const crumbs = generateBreadcrumbs('/dashboard');
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0]).toEqual({ label: 'Home', href: '/dashboard', isCurrent: false });
    expect(crumbs[1]).toEqual({ label: 'Dashboard', href: '/dashboard', isCurrent: true });
  });

  it('should parse shallow route /documents into Home > My Documents', () => {
    const crumbs = generateBreadcrumbs('/documents');
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0].label).toBe('Home');
    expect(crumbs[1].label).toBe('My Documents');
    expect(crumbs[1].isCurrent).toBe(true);
  });

  it('should parse deep nested route /documents/doc-123/chat into hierarchical trail', () => {
    const crumbs = generateBreadcrumbs('/documents/doc-123/chat');
    expect(crumbs.map((c) => c.label)).toEqual(['Home', 'My Documents', 'Doc #123', 'AI Chat']);
    expect(crumbs[3].isCurrent).toBe(true);
    expect(crumbs[3].href).toBe('/documents/doc-123/chat');
  });

  it('should utilize dynamic title resolver when provided for document ID segments', () => {
    const resolver = (segment: string) => {
      if (segment === 'doc-456') return 'Thesis_Draft.pdf';
      return undefined;
    };

    const crumbs = generateBreadcrumbs('/documents/doc-456/overview', resolver);
    expect(crumbs.map((c) => c.label)).toEqual([
      'Home',
      'My Documents',
      'Thesis_Draft.pdf',
      'Overview',
    ]);
  });
});
