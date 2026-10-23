import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Users, Server, ArrowLeft } from 'lucide-react';

export const AdminPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Institutional Admin Console
            </h1>
            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold border border-purple-200">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Restricted RBAC Access
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            System administration, user privilege management, and multi-tenant audit logs.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Account Governance</h2>
              <p className="text-xs text-slate-500">Manage student, researcher, and staff roles</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Enforce institutional access policies, view active session tokens, and trigger instant
            remote account revokings across distributed clusters.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cluster Health & Metrics</h2>
              <p className="text-xs text-slate-500">FastAPI AI Worker and Express BFF telemetry</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Real-time monitoring of vector embedding queues, ChromaDB query latency, and document
            pipeline throughput.
          </p>
        </div>
      </div>
    </div>
  );
};
