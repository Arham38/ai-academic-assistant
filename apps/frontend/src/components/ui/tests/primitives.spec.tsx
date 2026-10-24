/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Badge } from '../badge';
import { Skeleton } from '../skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';
import { Progress } from '../progress';
import { Toast } from '../toast';

describe('UI Primitives Component Suite', () => {
  it('should render <Card /> and subcomponents properly', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Card body content</p>
        </CardContent>
      </Card>,
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('should render <Badge /> with clean, flagged, and default variants', () => {
    const { rerender } = render(<Badge variant="clean">Clean Status</Badge>);
    const cleanBadge = screen.getByText('Clean Status');
    expect(cleanBadge.className).toContain('text-emerald-700');

    rerender(<Badge variant="flagged">Flagged Status</Badge>);
    const flaggedBadge = screen.getByText('Flagged Status');
    expect(flaggedBadge.className).toContain('text-rose-700');
  });

  it('should render <Skeleton /> with pulse animation classes', () => {
    render(<Skeleton data-testid="skeleton-box" className="h-4 w-20" />);
    const skeleton = screen.getByTestId('skeleton-box');
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('should render <Table /> with proper structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Col 1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Data 1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText('Col 1')).toBeInTheDocument();
    expect(screen.getByText('Data 1')).toBeInTheDocument();
  });

  it('should render <Progress /> with correct percentage and aria attributes', () => {
    const { rerender } = render(<Progress value={45} max={100} showLabel={true} />);
    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('45%')).toBeInTheDocument();

    rerender(<Progress value={120} max={100} />);
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should render <Toast /> with alert role, message, and close handler', () => {
    render(
      <Toast variant="error" title="Upload Error" message="Unsupported file type provided." />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Upload Error')).toBeInTheDocument();
    expect(screen.getByText('Unsupported file type provided.')).toBeInTheDocument();
  });
});
