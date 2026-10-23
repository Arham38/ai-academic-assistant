import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { cn } from '../../../utils/cn';

export interface MetricTrend {
  value: string | number;
  isPositive?: boolean;
  label?: string;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: MetricTrend;
  description?: string;
  badge?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  badge,
  className,
}) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all duration-200',
        className,
      )}
    >
      <CardContent className="p-6">
        {/* Top Header: Title & Icon */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              {title}
            </span>
            {badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {badge}
              </span>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 shrink-0">
            <Icon className="w-5 h-5 text-indigo-600" aria-hidden="true" />
          </div>
        </div>

        {/* Primary Value */}
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </div>
        </div>

        {/* Bottom Context: Trend / Description */}
        <div className="mt-3 flex items-center justify-between text-xs min-h-[20px]">
          {trend ? (
            <div className="flex items-center space-x-1.5">
              <span
                className={cn(
                  'inline-flex items-center font-bold px-1.5 py-0.5 rounded-md text-[11px]',
                  trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50',
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                )}
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-slate-400 font-medium truncate">{trend.label}</span>
              )}
            </div>
          ) : description ? (
            <span className="text-slate-400 font-medium truncate">{description}</span>
          ) : (
            <span className="text-slate-400 font-medium">Real-time telemetry</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
