/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '../Breadcrumbs';

describe('<Breadcrumbs /> Component', () => {
  it('should render breadcrumbs trail with home and current page for /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('aria-current', 'page');
  });

  it('should render deep hierarchical links for /documents/doc-99/chat', () => {
    render(
      <MemoryRouter initialEntries={['/documents/doc-99/chat']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Documents')).toBeInTheDocument();
    expect(screen.getByText('Doc #99')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI Chat');

    // Previous segments should be links
    expect(screen.getByText('My Documents').closest('a')).toHaveAttribute('href', '/documents');
    expect(screen.getByText('Doc #99').closest('a')).toHaveAttribute('href', '/documents/doc-99');
  });

  it('should support dynamic title resolver for document IDs', () => {
    const resolver = (segment: string) => {
      if (segment === 'doc-99') return 'Quantum_Thesis.pdf';
      return undefined;
    };

    render(
      <MemoryRouter initialEntries={['/documents/doc-99/overview']}>
        <Breadcrumbs dynamicTitleResolver={resolver} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Quantum_Thesis.pdf')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Overview');
  });
});
