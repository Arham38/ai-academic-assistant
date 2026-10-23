import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  GraduationCap,
  FlaskConical,
  Shield,
  ArrowUpRight,
  Sparkles,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const DashboardOverview: React.FC = () => {
  const { user, role, isAdmin, isResearcher } = useAuth();

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : (user?.email ?? 'Scholar');

  const getRoleBadgeClasses = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESEARCHER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STUDENT':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-xs mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Academic Platform Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Your centralized workspace for multi-modal semantic plagiarism scans, citation
            compliance, and neural Agentic RAG literature synthesis.
          </p>

          <div className="mt-4 flex items-center space-x-3 text-xs">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border ${getRoleBadgeClasses()}`}
            >
              <Shield className="w-3 h-3 mr-1" />
              Tier: {role ?? 'STUDENT'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300 font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Workspace Portal */}
        <Link
          to="/dashboard/student"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Student Integrity Hub</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify term papers, check APA/IEEE reference formatting, and refine academic style.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>Enter Student Hub</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* My Documents Repository */}
        <Link
          to="/documents"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Manuscript Library</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Browse previously indexed PDF and DOCX files, inspection reports, and chunk
              embeddings.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>View All Documents</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* High-Capacity Tier (Researcher or Admin) */}
        {isResearcher || isAdmin ? (
          <Link
            to={isAdmin ? '/admin' : '/dashboard/research'}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                {isAdmin ? <Shield className="w-6 h-6" /> : <FlaskConical className="w-6 h-6" />}
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                {isAdmin ? 'Institutional Governance' : 'Researcher Studio'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isAdmin
                  ? 'Manage user privileges, audit multi-tenant security logs, and monitor FastAPI telemetry.'
                  : 'Multi-document Agentic RAG, high-dimensional vector clusters, and novelty evaluations.'}
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
              <span>{isAdmin ? 'Open Admin Console' : 'Open Researcher Hub'}</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-700 mb-1">Researcher Studio (Pro)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Multi-document agentic evaluation pipelines and high-volume token quotas for
                faculty.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 text-xs font-semibold text-slate-400">
              <span>Faculty Authorization Required</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Scans Feed & Resource Allowance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Integrity Reports</h2>
            <Link
              to="/documents"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  Comparative Analysis of Transformer Architectures.pdf
                </p>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Today, 11:20 AM</span>
                  <span>•</span>
                  <span className="text-indigo-600 font-medium">99% Original</span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                Verified
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  Agentic RAG Workflows in Distributed Systems.docx
                </p>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Oct 22, 2026</span>
                  <span>•</span>
                  <span className="text-indigo-600 font-medium">95% Original</span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                1 Citation Flagged
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Account Quotas</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Usage metrics reset at the beginning of each billing cycle.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600">Monthly Document Scans</span>
                  <span className="text-slate-900">4 / 20 Used</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600">AI Synthesizer Credits</span>
                  <span className="text-slate-900">18,500 / 25,000</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/settings"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Manage Subscription & Quotas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
