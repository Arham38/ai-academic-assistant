/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileText, ShieldCheck, Zap } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';

describe('<MetricCard /> Component', () => {
  it('should render title, value, icon, and description correctly', () => {
    render(
      <MetricCard
        title="Documents Scanned"
        value={42}
        icon={FileText}
        description="Total scanned files"
      />,
    );

    expect(screen.getByText('Documents Scanned')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total scanned files')).toBeInTheDocument();
  });

  it('should render positive trend styling with trending up indicator', () => {
    render(
      <MetricCard
        title="Avg Plagiarism"
        value="3.2%"
        icon={ShieldCheck}
        trend={{ value: '+5.4%', isPositive: true, label: 'vs last week' }}
      />,
    );

    const trendElement = screen.getByText('+5.4%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement.className).toContain('text-emerald-700');
    expect(trendElement.className).toContain('bg-emerald-50');
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('should render negative trend styling with red indicator', () => {
    render(
      <MetricCard
        title="AI Tokens Remaining"
        value="12,000"
        icon={Zap}
        trend={{ value: '-18.2%', isPositive: false, label: 'depleted' }}
      />,
    );

    const trendElement = screen.getByText('-18.2%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement.className).toContain('text-rose-700');
    expect(trendElement.className).toContain('bg-rose-50');
  });

  it('should render optional badge when provided', () => {
    render(<MetricCard title="System Cluster" value="99.9%" icon={Zap} badge="Enterprise" />);

    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });
});
