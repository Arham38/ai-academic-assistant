/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../../../hooks/useTheme';

const ThemeConsumerTestComponent: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
};

describe('<ThemeProvider /> & useTheme Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.clearAllMocks();
  });

  it('should initialize with provided defaultTheme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumerTestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved-val')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('should switch theme and update DOM class & localStorage on setTheme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumerTestComponent />
      </ThemeProvider>,
    );

    // Switch to dark
    fireEvent.click(screen.getByText('Set Dark'));

    expect(screen.getByTestId('theme-val')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-val')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme-preference')).toBe('dark');

    // Switch to light
    fireEvent.click(screen.getByText('Set Light'));

    expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme-preference')).toBe('light');
  });

  it('should read persisted theme from localStorage on initial load', () => {
    localStorage.setItem('theme-preference', 'dark');

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumerTestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-val')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should throw an error if useTheme is called outside a ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider',
    );
  });
});
