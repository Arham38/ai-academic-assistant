/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../features/auth/authSlice';
import { baseApi } from '../../../features/api/baseApi';
import { DocumentLayout } from '../DocumentLayout';
import { DocumentOverview } from '../DocumentOverview';
import { DocumentChat } from '../DocumentChat';

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'usr_turing', email: 'alan@cambridge.edu', role: 'RESEARCHER' },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

describe('<DocumentLayout /> Nested Routing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRoute = (initialPath: string) => {
    const store = createMockStore();
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/documents/:documentId" element={<DocumentLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<DocumentOverview />} />
              <Route path="chat" element={<DocumentChat />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
  };

  it('should render document header, metadata, and all three navigation tabs', () => {
    renderWithRoute('/documents/doc-1/overview');

    // Header elements
    expect(screen.getByText('Quantum_Entanglement_Cryptography_Thesis.pdf')).toBeInTheDocument();
    expect(screen.getByText('Verified Clean (2.1%)')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();

    // Tabs
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Overview');
    expect(tabs[1]).toHaveTextContent('AI Synthesis Chat');
    expect(tabs[2]).toHaveTextContent('Integrity Report');
  });

  it('should render DocumentOverview sub-view when mounted at /overview', () => {
    renderWithRoute('/documents/doc-1/overview');

    expect(screen.getByText('Total Words')).toBeInTheDocument();
    expect(screen.getByText('8,420')).toBeInTheDocument();
    expect(screen.getByText('Abstract & Synthesis Summary')).toBeInTheDocument();
    expect(screen.getByText('Corpus Cross-Reference Matches')).toBeInTheDocument();
  });

  it('should render DocumentChat sub-view when deep linked to /chat', () => {
    renderWithRoute('/documents/doc-1/chat');

    expect(screen.getByText('Agentic RAG Assistant')).toBeInTheDocument();
    expect(screen.getByText(/124 Chunks Indexed \(ChromaDB\)/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ask anything about this manuscript...'),
    ).toBeInTheDocument();
  });

  it('should synchronize URL and switch view when clicking between tabs', () => {
    renderWithRoute('/documents/doc-1/overview');

    // Starts at Overview
    expect(screen.getByText('Total Words')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Ask anything about this manuscript...'),
    ).not.toBeInTheDocument();

    // Click on Chat tab
    const chatTab = screen.getByRole('tab', { name: /ai synthesis chat/i });
    fireEvent.click(chatTab);

    // Now Chat is mounted and Overview is unmounted
    expect(
      screen.getByPlaceholderText('Ask anything about this manuscript...'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Total Words')).not.toBeInTheDocument();
  });
});
