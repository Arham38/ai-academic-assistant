import React from 'react';
import { FileText, Clock, BookOpen, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export const DocumentOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. High-Level Manuscript Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Words
            </span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">8,420</div>
          <span className="text-[11px] text-slate-400 mt-1 block">18 academic pages</span>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reading Time
            </span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">34 min</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Based on 250 wpm</span>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Citations
            </span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">42</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            100% DOI indexed
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plagiarism Score
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">2.1%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Passes IEEE threshold (&lt;15%)
          </span>
        </Card>
      </div>

      {/* 2. Abstract & Key Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Abstract &amp; Synthesis Summary</CardTitle>
              <CardDescription>
                AI-extracted semantic overview and core theoretical contributions
              </CardDescription>
            </div>
            <Badge variant="clean">High Originality</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            This thesis investigates quantum entanglement protocols applied to asymmetric key
            distribution systems in high-latency satellite constellations. By mathematically
            deriving Bell state perturbations across atmospheric turbulence models, the author
            demonstrates unconditional security bounds against passive intercept eavesdropping.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Core Methodological Highlights
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              <li>Quantum Key Distribution (QKD) BB84 with decoy-state modulation.</li>
              <li>
                Atmospheric phase drift compensation algorithms verified via Monte Carlo simulation.
              </li>
              <li>Empirical validation on 10 Gbps photonic transceiver hardware testbeds.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 3. Corpus Matching Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Corpus Cross-Reference Matches</CardTitle>
          <CardDescription>
            Comparison against 85M+ open-access academic papers, arXiv preprints, and journals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    arXiv:2401.09823 (QKD Satellite Networks)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    0.8% matched references &bull; Appropriately cited in Section 3.2
                  </p>
                </div>
              </div>
              <a
                href="https://arxiv.org"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                aria-label="View external reference"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    IEEE Trans. Quantum Eng. Vol. 14
                  </p>
                  <p className="text-[11px] text-slate-400">
                    0.5% standard terminology &bull; Mathematical notation matches
                  </p>
                </div>
              </div>
              <a
                href="https://ieee.org"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                aria-label="View external reference"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
