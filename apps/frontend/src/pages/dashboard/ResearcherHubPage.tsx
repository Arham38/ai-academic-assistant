import React from 'react';
import { FlaskConical, Layers, Database, Cpu, ArrowUpRight, Sparkles, Search } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const ResearcherHubPage: React.FC = () => {
  const { user } = useAuth();

  const researcherName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : (user?.email ?? 'Principal Investigator');

  const activeProjects = [
    {
      id: 'proj_1',
      title: 'Agentic Cross-Corpus Retrieval on Quantum Cryptography',
      embeddingsCount: '48,200 Embeddings',
      status: 'Indexed (ChromaDB)',
      model: 'Embedding-004 + Gemini-1.5-Pro',
    },
    {
      id: 'proj_2',
      title: 'Long-Context Semantic Plagiarism Synthesis (Bioinformatics)',
      embeddingsCount: '112,000 Embeddings',
      status: 'Processing Stage 3',
      model: 'Agentic LangGraph Worker',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold backdrop-blur-xs mb-3 border border-blue-400/30">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>High-Dimensional Research Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, Dr. {researcherName}
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Execute high-dimensional semantic search across arXiv, PubMed, and institutional
            corpora. Orchestrate multi-step Agentic RAG evaluation pipelines with LangGraph.
          </p>
        </div>
      </div>

      {/* Advanced Research Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Multi-Document Agentic RAG</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Synthesize insights across heterogeneous research papers using recursive LangGraph
              workflows.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
            <span>Open Query Studio</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">ChromaDB Vector Clusters</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore semantic cosine similarity distances and high-dimensional document clusters.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
            <span>Inspect Vector Store</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Peer Review & Novelty Check</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyze novel contribution claims against global preprint servers to prevent
              duplication.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>Evaluate Novelty</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Quota & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Research Streams */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Active High-Capacity Corpora</h2>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Search className="w-3.5 h-3.5" />
              <span>Vector Collection</span>
            </div>
          </div>

          <div className="space-y-3">
            {activeProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{project.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {project.embeddingsCount} • {project.model}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0 self-start sm:self-auto">
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Compute & Token Quotas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Research Compute Quota</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Departmental High-Performance Tier (Renewed Monthly).
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600">Vector Embeddings</span>
                  <span className="text-slate-900">12,450 / 50,000</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600">Full Scans</span>
                  <span className="text-slate-900">142 / 500 Scans</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600">Max Document Depth</span>
                  <span className="text-slate-900">250 Pages / Corpus</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">
              Allocated under Institutional Grant Cluster #882
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
