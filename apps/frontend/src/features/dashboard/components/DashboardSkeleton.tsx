import React from 'react';
import { Skeleton } from '../../../components/ui/skeleton';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      {/* 1. Header Skeleton Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* 2. Metric Cards Grid Skeleton (4 Columns) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-slate-200/80 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-28 rounded-lg" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Main Body Skeleton: 2/3 Table + 1/3 Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Skeleton */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 space-y-2">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center space-x-3 w-[45%]">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200/80 shadow-xs">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-28 w-full rounded-xl" />
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
