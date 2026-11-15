import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { RequestDocument } from '../types';
import { ProofViewerModal } from '../components/documents/ProofViewerModal';
import {
  FileCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
  Building,
  DollarSign,
  Calendar,
  ShieldAlert,
  Eye,
  Hash,
  Cpu,
  User,
} from 'lucide-react';

export const DocumentReview: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'REVIEW_REQUIRED' | 'VERIFICATION_FAILED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<RequestDocument | null>(null);
  const [viewingProof, setViewingProof] = useState<RequestDocument | null>(null);
  const [reviewAction, setReviewAction] = useState<'VERIFY' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery<RequestDocument[]>({
    queryKey: ['documentReviewQueue'],
    queryFn: async () => {
      const res = await api.get('/documents/review-queue');
      return res.data.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: 'VERIFY' | 'REJECT'; notes: string }) => {
      const res = await api.post(`/documents/${id}/review`, { action, notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentReviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setSelectedDoc(null);
      setReviewAction(null);
      setReviewNotes('');
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to submit review');
    },
  });

  const handleOpenReview = (doc: RequestDocument, action: 'VERIFY' | 'REJECT') => {
    setSelectedDoc(doc);
    setReviewAction(action);
    setReviewNotes('');
    setActionError(null);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !reviewAction) return;
    if (!reviewNotes.trim()) {
      setActionError('Compliance reviewer notes are mandatory for the audit log.');
      return;
    }
    reviewMutation.mutate({
      id: selectedDoc.id,
      action: reviewAction,
      notes: reviewNotes.trim(),
    });
  };

  const filteredDocs = queue.filter((doc) => {
    if (filter !== 'ALL' && doc.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        doc.fileName.toLowerCase().includes(q) ||
        (doc.uploaderName && doc.uploaderName.toLowerCase().includes(q)) ||
        doc.requestId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const reviewRequiredCount = queue.filter((d) => d.status === 'REVIEW_REQUIRED').length;
  const verificationFailedCount = queue.filter((d) => d.status === 'VERIFICATION_FAILED').length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white">
              AI Evidence Engine & Document Review
            </h1>
          </div>
          <p className="text-xs text-forge-400">
            Intelligent OCR evidence verification queue. Inspect extracted fields, investigate discrepancies, and adjudicate documentary proof.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-forge-700 bg-forge-900 text-forge-200 hover:text-white hover:bg-forge-800 transition shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-forge-900/60 border border-forge-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-forge-400 uppercase font-semibold">Total Flagged in Queue</p>
            <p className="text-xl font-bold text-white mt-0.5">{queue.length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-forge-800/80 text-brand-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-amber-400 uppercase font-semibold">Needs Human Review</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{reviewRequiredCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-rose-400 uppercase font-semibold">Failed Validation Checks</p>
            <p className="text-xl font-bold text-rose-300 mt-0.5">{verificationFailedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-xl bg-forge-900/60 border border-forge-800 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'REVIEW_REQUIRED', 'VERIFICATION_FAILED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-forge-950 text-forge-400 hover:text-white hover:bg-forge-800'
              }`}
            >
              {st === 'ALL'
                ? `All Pending (${queue.length})`
                : st === 'REVIEW_REQUIRED'
                ? `Needs Review (${reviewRequiredCount})`
                : `Failed Checks (${verificationFailedCount})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-forge-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by filename, uploader, request..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-forge-700 bg-forge-950 text-white placeholder-forge-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-forge-900/40 border border-forge-800">
          <FileCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            Verification Queue Clear
          </h3>
          <p className="text-xs text-forge-400 max-w-sm mx-auto">
            All submitted documentary proofs have been automatically verified or adjudicated by compliance reviewers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocs.map((doc) => {
            const extracted = doc.ocrExtracted || {};
            const checks = doc.verificationChecks || {};
            const explanations = (checks.explanations as any[]) || [];

            return (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-forge-900/70 border border-forge-800 shadow-sm space-y-4 hover:border-forge-700 transition group"
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setViewingProof(doc)}
                      title="Click to inspect proof document in lightbox"
                      className={`p-3 rounded-xl flex-shrink-0 hover:scale-105 active:scale-95 transition cursor-pointer ${
                        doc.status === 'VERIFICATION_FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-sm text-white group-hover:text-brand-300 transition-colors">
                          {doc.fileName}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            doc.status === 'VERIFICATION_FAILED'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {doc.status.replace('_', ' ')}
                        </span>
                        {extracted.extractionMethod && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-forge-800 text-forge-300 border border-forge-700">
                            Engine: {extracted.extractionMethod}
                          </span>
                        )}
                        <span className="text-xs text-forge-400">
                          ({(doc.fileSize / 1024).toFixed(1)} KB • {doc.documentType})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-forge-400">
                        <span>Request: <strong className="text-forge-200">#{doc.requestId}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Uploaded by: <strong className="text-forge-200">{doc.uploaderName || doc.uploaderId}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <code className="font-mono text-[10px] text-forge-400">{doc.fileHash.substring(0, 12)}...</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewingProof(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-brand-300 bg-brand-500/15 border border-brand-500/30 hover:bg-brand-500 hover:text-white transition shadow-sm cursor-pointer"
                      title="Inspect original uploaded document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Proof</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(doc, 'VERIFY')}
                      title="Adjudicate and clear this evidence document"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Adjudicate Clear</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(doc, 'REJECT')}
                      title="Reject evidence document with mandatory reason"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition shadow-sm cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Evidence</span>
                    </button>
                  </div>
                </div>

                {/* Evidence Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-forge-800">
                  {/* Extracted Fields */}
                  <div className="p-3.5 rounded-xl bg-forge-950/70 border border-forge-800 text-xs space-y-2">
                    <span className="font-semibold text-forge-200 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-brand-400" />
                        Available OCR Extracted Fields
                      </span>
                      {doc.ocrConfidence !== null && doc.ocrConfidence !== undefined && (
                        <span className="text-[10px] text-forge-400">
                          Confidence: {Math.round(doc.ocrConfidence * 100)}%
                        </span>
                      )}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-forge-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-forge-400" />
                        <span>
                          Vendor: <strong>{extracted.vendor || 'Not identified'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-forge-400" />
                        <span>
                          Amount:{' '}
                          <strong className={extracted.amount ? 'text-emerald-400' : 'text-forge-400'}>
                            {extracted.amount !== null && extracted.amount !== undefined
                              ? `$${Number(extracted.amount).toFixed(2)}`
                              : 'Not located'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-forge-400" />
                        <span>Date: <strong>{extracted.date || 'N/A'}</strong></span>
                      </div>
                      <div>
                        <span>Invoice/Ref: <strong>{extracted.invoiceNumber || extracted.taxId || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Explanations & Checks */}
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Evidence Consistency & Verification Explanations
                    </span>
                    {explanations.length > 0 ? (
                      <ul className="space-y-1 text-forge-300">
                        {explanations.map((exp: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span
                              className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                exp.status === 'PASS'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {exp.status}
                            </span>
                            <span className="text-[11px] leading-relaxed">
                              <strong>{exp.check}:</strong> {exp.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : doc.warnings && doc.warnings.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-forge-300">
                        {doc.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-forge-400 italic">No explicit forensic warnings attached.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedDoc && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-forge-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-forge-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {reviewAction === 'VERIFY' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                {reviewAction === 'VERIFY' ? 'Adjudicate Document Verified' : 'Reject Proof Document'}
              </h3>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setReviewAction(null);
                }}
                className="text-forge-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-forge-300">
              Target Document: <strong className="text-white">{selectedDoc.fileName}</strong> (Request #{selectedDoc.requestId})
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-forge-300 mb-1">
                  Compliance Reviewer Notes <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'VERIFY'
                      ? 'e.g. Verified with merchant phone confirmation. Receipts line items match purchase nominal.'
                      : 'e.g. File is illegible and does not contain valid corporate tax identifier.'
                  }
                  className="w-full p-3 text-xs rounded-xl border border-forge-700 bg-forge-950 text-white placeholder-forge-500 focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-forge-400 block mt-1">
                  Mandatory for compliance audit log and requester notification.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-forge-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoc(null);
                    setReviewAction(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-forge-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-lg transition ${
                    reviewAction === 'VERIFY'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {reviewMutation.isPending ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Lightbox Modal */}
      <ProofViewerModal
        document={viewingProof}
        isOpen={Boolean(viewingProof)}
        onClose={() => setViewingProof(null)}
      />
    </div>
  );
};
