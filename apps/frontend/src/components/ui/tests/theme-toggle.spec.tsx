/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../../app/providers/ThemeProvider';
import { ThemeToggle } from '../theme-toggle';

describe('<ThemeToggle /> Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('should render trigger button with aria-label', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('should open menu with light, dark, and system options on click', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('menu', { name: /theme options/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
  });

  it('should switch to dark mode when Dark option is selected', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(toggleBtn);

    const darkOption = screen.getByRole('menuitem', { name: /dark/i });
    fireEvent.click(darkOption);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme-preference')).toBe('dark');
  });
});
