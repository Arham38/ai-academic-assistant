import React from 'react';
import { UploadCloud, Sparkles, BookOpen, FileCheck, ArrowUpRight } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../../components/ui/card';
import { cn } from '../../../utils/cn';

export interface QuickActionsProps {
  onUploadClick?: () => void;
  tokensRemaining?: number;
  totalTokens?: number;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onUploadClick,
  tokensRemaining = 45000,
  totalTokens = 100000,
  className,
}) => {
  const quotaPercentage = Math.min(100, Math.round((tokensRemaining / totalTokens) * 100));

  return (
    <div className={cn('space-y-6', className)}>
      {/* 1. Primary Upload Dropzone / Action */}
      <Card className="overflow-hidden border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-card-foreground flex items-center justify-between">
            <span>Quick Upload</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </span>
          </CardTitle>
          <CardDescription>
            Drop PDF, DOCX, or LaTeX files for instant integrity scanning
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            onClick={onUploadClick}
            className="border-2 border-dashed border-border hover:border-indigo-400 bg-muted/30 hover:bg-muted/60 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">Click to upload or drag &amp; drop</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOCX, TXT up to 50MB</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Token Quota Monitor */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">AI Compute Quota</CardTitle>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {tokensRemaining.toLocaleString()} tokens
            </span>
          </div>
          <CardDescription>Monthly allocation for deep research &amp; RAG</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${quotaPercentage}%` }}
              role="progressbar"
              aria-valuenow={quotaPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{quotaPercentage}% Available</span>
            <span>Total: {totalTokens.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. AI Academic Tools Shortcuts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">AI Assistant Tools</CardTitle>
          <CardDescription>Specialized academic workflows</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-muted/60 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Agentic RAG Assistant</p>
                <p className="text-[10px] text-muted-foreground">
                  Multi-document synthesized query
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-muted/60 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 transition-colors">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Citation &amp; BibTeX Generator</p>
                <p className="text-[10px] text-muted-foreground">APA, MLA, IEEE, Chicago format</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-muted/60 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 transition-colors">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Originality Batch Scanner</p>
                <p className="text-[10px] text-muted-foreground">Cross-corpus semantic matches</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
