import React from 'react';
import { FileText, Upload, Filter, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const documents = [
    {
      id: 'doc_101',
      name: 'Neural Networks in Academic Integrity.pdf',
      size: '2.4 MB',
      uploadedAt: 'Today, 2:15 PM',
      originalityScore: 98,
      status: 'COMPLETED',
      stage: 'SYNTHESIS',
    },
    {
      id: 'doc_102',
      name: 'Distributed Systems Capstone Proposal.docx',
      size: '840 KB',
      uploadedAt: 'Yesterday, 6:40 PM',
      originalityScore: 94,
      status: 'COMPLETED',
      stage: 'SYNTHESIS',
    },
    {
      id: 'doc_103',
      name: 'Ethics in Large Language Models Term Paper.pdf',
      size: '1.8 MB',
      uploadedAt: 'Oct 21, 2026',
      originalityScore: 100,
      status: 'COMPLETED',
      stage: 'SYNTHESIS',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Documents & Manuscripts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your uploaded papers, view semantic chunking status, and inspect plagiarism
            findings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload New Manuscript
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Showing 3 of 3 documents</span>
        </div>
        <div className="text-xs text-slate-400">Sort by: Most Recent</div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Document Name
                </th>
                <th scope="col" className="px-6 py-3.5">
                  File Size
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Uploaded Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Originality Score
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-xs">{doc.name}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{doc.size}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border ${
                        doc.originalityScore >= 95
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {doc.originalityScore >= 95 ? (
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                      )}
                      {doc.originalityScore}% Original
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      View Report
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
