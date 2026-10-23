import React from 'react';
import { Sparkles, FileText, ShieldCheck } from 'lucide-react';
import { UserRole } from '@academic-assistant/shared-types';

export const HomePage: React.FC = () => {
  const currentRole: UserRole = 'STUDENT';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 text-white rounded-2xl p-8 shadow-md">
        <div className="flex items-center space-x-3 mb-4">
          <span className="p-2 bg-brand-500/20 border border-brand-400/30 rounded-lg">
            <Sparkles className="w-5 h-5 text-brand-300" />
          </span>
          <span className="text-xs uppercase font-semibold tracking-wider text-brand-200">
            Enterprise Academic Verification
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          AI-Powered Academic Integrity & Writing Assistant
        </h1>
        <p className="mt-3 text-brand-100 max-w-2xl text-base leading-relaxed">
          Autonomous semantic plagiarism detection, grammar and academic tone auditing, and
          multi-agent citation verification powered by LangGraph and dense vector embeddings.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <span className="text-xs px-3 py-1 bg-white/10 rounded-full font-medium">
            Active Workspace Role: <span className="font-bold text-brand-300">{currentRole}</span>
          </span>
        </div>
      </section>

      {/* Feature Highlight Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-indigo-50 text-brand-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Semantic Plagiarism Scanning</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Identifies paraphrasing, structural restructuring, and concept duplication across
            institutional vector corpora with zero cross-tenant contamination.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-indigo-50 text-brand-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Citation & Grammar Auditing</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Detects orphaned in-text citations, verifies CrossRef DOIs, and enforces strict academic
            prose standards across APA, MLA, and IEEE formats.
          </p>
        </div>
      </section>
    </div>
  );
};
