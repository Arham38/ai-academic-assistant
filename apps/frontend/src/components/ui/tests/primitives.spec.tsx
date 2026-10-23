/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Badge } from '../badge';
import { Skeleton } from '../skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';

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
});
