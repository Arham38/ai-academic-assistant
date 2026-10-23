import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { generateBreadcrumbs } from '../../config/route-maps';
import { cn } from '../../utils/cn';

export interface BreadcrumbsProps {
  dynamicTitleResolver?: (segment: string, fullPath: string) => string | undefined;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ dynamicTitleResolver, className }) => {
  const location = useLocation();
  const items = generateBreadcrumbs(location.pathname, dynamicTitleResolver);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-xs sm:text-sm font-medium', className)}
    >
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <li key={item.href + index} className="flex items-center space-x-1.5 sm:space-x-2">
              {!isFirst && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-300 shrink-0 select-none"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <h1
                  className="font-bold text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[140px] sm:max-w-[220px]"
                  aria-current="page"
                >
                  {item.label}
                </h1>
              ) : (
                <Link
                  to={item.href}
                  className="text-slate-500 hover:text-indigo-600 transition-colors truncate max-w-[100px] sm:max-w-[160px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
