import React from 'react';
import {
  GraduationCap,
  FileCheck2,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { formatUserDisplayName } from '../../utils/userUtils';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const studentName = formatUserDisplayName(user);

  const recentScans = [
    {
      id: 'doc_1',
      title: 'Neural Networks in Academic Integrity.pdf',
      date: 'Today, 2:15 PM',
      originality: 98,
      status: 'Verified',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'doc_2',
      title: 'Distributed Systems Capstone Proposal.docx',
      date: 'Yesterday, 6:40 PM',
      originality: 94,
      status: 'Minor Citations Flagged',
      statusColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      id: 'doc_3',
      title: 'Ethics in Large Language Models Term Paper.pdf',
      date: 'Oct 21, 2026',
      originality: 100,
      status: 'Verified',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-xs mb-3 border border-white/10">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
            <span>Student Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {studentName}
          </h1>
          <p className="mt-2 text-indigo-200 text-sm leading-relaxed">
            Upload course assignments, verify academic originality, and format citations prior to
            submission using our institution-validated AI detection engine.
          </p>
        </div>
      </div>

      {/* Feature Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground mb-1">
              Plagiarism & Integrity Scan
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scan manuscripts against 10M+ academic repositories and peer-reviewed journals.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>New Scan</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground mb-1">Citation & Reference Check</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automatically validate IEEE, APA, MLA, and Chicago format references.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Check Citations</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground mb-1">AI Writing Refinement</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enhance academic tone, eliminate passive voice, and improve syntactic clarity.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
            <span>Start Assistant</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Quota Tracker & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">Recent Integrity Reports</h2>
            <span className="text-xs text-muted-foreground">Past 30 Days</span>
          </div>

          <div className="divide-y divide-border">
            {recentScans.map((scan) => (
              <div key={scan.id} className="py-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-foreground truncate">{scan.title}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{scan.date}</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {scan.originality}% Original
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border shrink-0 ${scan.statusColor}`}
                >
                  {scan.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-foreground">Monthly Allowance</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Institutional quota resets on the 1st of every month.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-muted-foreground">Integrity Scans</span>
                  <span className="text-foreground">4 / 20 Scans</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-muted-foreground">Page Length Limit</span>
                  <span className="text-foreground">25 Pages / Doc</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <span className="text-xs text-muted-foreground">
              Need higher capacity? Request a Faculty Upgrade.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
