/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FileText, MessageSquare } from 'lucide-react';
import { Tabs, TabItem } from '../tabs';

const mockTabs: TabItem[] = [
  { label: 'Overview', path: '/documents/123/overview', icon: FileText },
  { label: 'AI Chat', path: '/documents/123/chat', icon: MessageSquare, badge: 'Pro' },
];

describe('<Tabs /> UI Primitive', () => {
  it('should render accessible tablist and tabs with ARIA roles', () => {
    render(
      <MemoryRouter initialEntries={['/documents/123/overview']}>
        <Tabs tabs={mockTabs} />
      </MemoryRouter>,
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Overview');
    expect(tabs[1]).toHaveTextContent('AI Chat');
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('should apply active classes to the matching URL route', () => {
    render(
      <MemoryRouter initialEntries={['/documents/123/overview']}>
        <Tabs tabs={mockTabs} />
      </MemoryRouter>,
    );

    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    const chatTab = screen.getByRole('tab', { name: /ai chat/i });

    expect(overviewTab.className).toContain('text-indigo-600');
    expect(chatTab.className).toContain('text-slate-500');
  });

  it('should synchronize route and swap active tab on click', () => {
    render(
      <MemoryRouter initialEntries={['/documents/123/overview']}>
        <Tabs tabs={mockTabs} />
        <Routes>
          <Route path="/documents/123/overview" element={<div>Overview Content</div>} />
          <Route path="/documents/123/chat" element={<div>Chat Content</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Overview Content')).toBeInTheDocument();

    const chatTab = screen.getByRole('tab', { name: /ai chat/i });
    fireEvent.click(chatTab);

    expect(screen.getByText('Chat Content')).toBeInTheDocument();
    expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
  });
});
