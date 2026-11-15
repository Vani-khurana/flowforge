import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { RequestDetailModal } from '../components/requests/RequestDetailModal';
import { ProofViewerModal } from '../components/documents/ProofViewerModal';
import { DocumentThumbnail } from '../components/documents/DocumentThumbnail';
import { RequestItem, RequestDocument } from '../types';
import { Check, X, Clock, AlertTriangle, CheckCircle2, User, Building, Eye, RotateCcw, FileText, ShieldCheck } from 'lucide-react';

export const Approvals: React.FC = () => {
  const { role, switchRole } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [viewingProof, setViewingProof] = useState<RequestDocument | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    request: RequestItem | null;
    action: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION';
  } | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RequestItem[]>({
    queryKey: ['pending-approvals', role],
    queryFn: async () => {
      const res = await api.get('/approvals/pending');
      return res.data.data;
    },
  });

  const pendingRequests = data || [];

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal?.request) return;

    if (decisionModal.action === 'REJECTED' && !comment.trim()) {
      toast.error('A rejection reason is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/approvals/${decisionModal.request.id}/action`, {
        action: decisionModal.action,
        comment: comment.trim() || undefined,
      });

      if (res.data.success) {
        toast.success(
          `Request ${decisionModal.request.id} has been ${decisionModal.action === 'APPROVED' ? 'approved' : 'rejected'
          } successfully!`
        );
        setDecisionModal(null);
        setComment('');
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Approvals Queue</h2>
            <Badge role={role} />
          </div>
          <p className="text-xs text-forge-400">
            Review and adjudicate pending requests assigned to your role ({role}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-forge-300">
            Pending Decisions:{' '}
            <strong className="text-brand-400 text-sm">{pendingRequests.length}</strong>
          </span>
        </div>
      </div>

      {/* Role Tip Banner for Employee */}
      {role === 'EMPLOYEE' && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-blue-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-blue-400" />
            <span>
              You are currently viewing as an <strong>Employee</strong>. Employees don't have pending approval tasks. Switch persona to test approving requests!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => switchRole('MANAGER')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
            >
              Switch to Manager
            </button>
            <button
              onClick={() => switchRole('FINANCE')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
            >
              Switch to Finance
            </button>
          </div>
        </div>
      )}

      {/* Queue List */}
      {isLoading ? (
        <div className="p-12 text-center text-forge-400 rounded-2xl bg-forge-900/50 border border-forge-800">
          <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
          <span>Loading approval queue...</span>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-forge-900/50 border border-forge-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">All Caught Up!</h3>
          <p className="text-xs text-forge-400 max-w-sm mx-auto">
            There are no requests currently pending action for role <strong>{role}</strong>. New submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-2xl bg-forge-900/70 border border-forge-800 hover:border-brand-500/50 hover:bg-forge-900/90 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-forge-300">{req.id}</span>
                    <Badge type={req.type} />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {req.currentStepName}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug group-hover:text-brand-300 transition-colors">{req.title}</h3>

                <div className="flex items-center gap-4 text-xs text-forge-400 mb-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-forge-300" />
                    <strong className="text-forge-200">{req.requesterName}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-forge-300" />
                    <span>{req.departmentName}</span>
                  </span>
                </div>

                {/* Data Snippet */}
                <div className="p-3 rounded-xl bg-forge-950/80 border border-forge-800/80 text-xs text-forge-300 mb-3 grid grid-cols-2 gap-2">
                  {Object.entries(req.data || {})
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[10px] uppercase font-semibold text-forge-400 block">
                          {k.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="font-bold text-white">
                          {typeof v === 'number' && k.toLowerCase().includes('amount')
                            ? `$${v.toLocaleString()}`
                            : String(v)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Attached Proof Evidence Strip */}
                {req.documents && req.documents.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-forge-950/90 border border-brand-500/20 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-forge-400">
                      <span className="flex items-center gap-1.5 text-brand-400 font-bold">
                        <FileText className="w-3.5 h-3.5" />
                        Attached Documentary Proof ({req.documents.length})
                      </span>
                      <span className="text-[10px] text-forge-400">
                        Click Preview to inspect evidence
                      </span>
                    </div>

                    <div className="space-y-2">
                      {req.documents.map((doc) => {
                        return (
                          <div key={doc.id} className="flex items-center justify-between gap-3 bg-forge-900/60 hover:bg-forge-900 hover:border-brand-500/40 p-2 rounded-lg border border-forge-800/80 transition-all duration-150">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <DocumentThumbnail
                                document={doc}
                                onClick={() => setViewingProof(doc)}
                                className="w-14 h-12 rounded-lg shrink-0"
                                heightClass="h-12"
                              />
                              <div className="overflow-hidden">
                                <span className="text-xs font-bold text-white block truncate max-w-[170px]">
                                  {doc.fileName}
                                </span>
                                <span className="text-[10px] text-forge-400 block truncate">
                                  {(doc.fileSize / 1024).toFixed(1)} KB • {doc.documentType}
                                  {doc.ocrExtracted?.amount !== undefined ? ` • $${Number(doc.ocrExtracted.amount).toFixed(2)}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${doc.status === 'VERIFIED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : doc.status === 'REVIEW_REQUIRED'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                  }`}
                              >
                                {doc.status.replace(/_/g, ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingProof(doc)}
                                title="Open interactive proof preview modal"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/15 hover:bg-brand-500 hover:text-white border border-brand-500/30 text-brand-300 text-xs font-bold hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer group/btn"
                              >
                                <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                <span>Preview</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-forge-800">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(req)}
                  title="View full request history, timeline stages, and attachments"
                  className="flex items-center gap-1.5 text-xs text-forge-400 hover:text-brand-300 hover:translate-x-0.5 transition-all font-medium cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Timeline & Proof</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionModal({ request: req, action: 'RETURNED_FOR_CORRECTION' })}
                    title="Send back to employee for correction with feedback"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 hover:scale-105 active:scale-95 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionModal({ request: req, action: 'REJECTED' })}
                    title="Reject and terminate this workflow request"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400 hover:scale-105 active:scale-95 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionModal({ request: req, action: 'APPROVED' })}
                    title="Approve and advance request to next workflow stage"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white text-xs font-bold shadow-md shadow-brand-600/30 hover:shadow-brand-500/40 transition-all duration-150 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Action Modal (Approve or Reject with Comment) */}
      <Modal
        isOpen={!!decisionModal}
        onClose={() => {
          setDecisionModal(null);
          setComment('');
        }}
        title={
          decisionModal?.action === 'APPROVED'
            ? 'Confirm Request Approval'
            : decisionModal?.action === 'RETURNED_FOR_CORRECTION'
              ? 'Return Request for Correction'
              : 'Reject Request'
        }
        subtitle={`Request ${decisionModal?.request?.id}: "${decisionModal?.request?.title}"`}
        maxWidth={decisionModal?.request?.documents && decisionModal.request.documents.length > 0 ? "max-w-2xl" : "max-w-lg"}
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${decisionModal?.action === 'APPROVED'
              ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
              : decisionModal?.action === 'RETURNED_FOR_CORRECTION'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
          >
            {decisionModal?.action === 'APPROVED' ? (
              <span>
                Approving this request will advance it to the next workflow stage or mark it fully completed if this is the final step.
              </span>
            ) : decisionModal?.action === 'RETURNED_FOR_CORRECTION' ? (
              <span>
                Returning this request sends it back to the requester for revisions. They can adjust fields, attach clearer proof documents, and resubmit.
              </span>
            ) : (
              <span>
                Rejecting this request will immediately terminate the workflow. Please state the clear reason below so the requester understands why.
              </span>
            )}
          </div>

          {/* Attached Proof Inspection with Visual Preview directly inside Decision Modal */}
          {decisionModal?.request?.documents && decisionModal.request.documents.length > 0 && (() => {
            const docs = decisionModal.request.documents;
            const activeDoc = docs[selectedDocIndex] || docs[0];

            return (
              <div className="p-3.5 rounded-xl bg-forge-950 border border-forge-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-forge-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                    Review Attached Documentary Proof ({docs.length})
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                    Archived in Database (ID: {activeDoc.id})
                  </span>
                </div>

                {/* Multiple document tabs if > 1 */}
                {docs.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {docs.map((d, idx) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDocIndex(idx)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${idx === selectedDocIndex
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-forge-900 text-forge-400 hover:text-white border border-forge-800'
                          }`}
                      >
                        Doc #{idx + 1}: {d.fileName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Document Visual Preview Card */}
                <div className="p-3 rounded-xl bg-forge-900/60 border border-forge-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Visual File Preview Thumbnail with live render */}
                    <DocumentThumbnail
                      document={activeDoc}
                      onClick={() => setViewingProof(activeDoc)}
                      className="w-full sm:w-48 h-36 rounded-lg"
                      heightClass="h-36"
                    />

                    {/* Extracted Metadata Grid */}
                    <div className="flex-1 w-full space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-forge-800">
                        <span className="font-semibold text-white truncate">{activeDoc.fileName}</span>
                        <button
                          type="button"
                          onClick={() => setViewingProof(activeDoc)}
                          className="px-2 py-0.5 text-[10px] font-bold text-brand-400 hover:text-white hover:bg-brand-500/20 border border-brand-500/30 rounded transition cursor-pointer shrink-0"
                        >
                          View Lightbox
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-forge-300">
                        <div>
                          <span className="text-[10px] text-forge-400 block uppercase">Vendor / Organization</span>
                          <span className="font-bold text-white truncate block">
                            {activeDoc.ocrExtracted?.vendor || 'Not identified in text'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-forge-400 block uppercase">Document Total</span>
                          <span className="font-black text-emerald-400 block">
                            {activeDoc.ocrExtracted?.amount !== undefined && activeDoc.ocrExtracted?.amount !== null
                              ? `$${Number(activeDoc.ocrExtracted.amount).toFixed(2)}`
                              : 'Not located in text'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 text-[10px] text-forge-400 flex items-center justify-between">
                        <span>Verification Status:</span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded ${activeDoc.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : activeDoc.status === 'REVIEW_REQUIRED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                        >
                          {activeDoc.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              {decisionModal?.action === 'REJECTED' ? (
                <span>
                  Rejection Reason <span className="text-rose-400">* (Required)</span>
                </span>
              ) : decisionModal?.action === 'RETURNED_FOR_CORRECTION' ? (
                <span>
                  Correction Instructions <span className="text-amber-400">* (Required)</span>
                </span>
              ) : (
                'Approval Note / Comments (Optional)'
              )}
            </label>
            <textarea
              required={decisionModal?.action === 'REJECTED' || decisionModal?.action === 'RETURNED_FOR_CORRECTION'}
              rows={3}
              placeholder={
                decisionModal?.action === 'REJECTED'
                  ? 'e.g. Budget limit exceeded for Q4, unauthorized vendor...'
                  : decisionModal?.action === 'RETURNED_FOR_CORRECTION'
                    ? 'e.g. Attached receipt is low-resolution and subtotal does not balance. Please upload a clear PDF...'
                    : 'e.g. Approved. Proceed with procurement.'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl p-3 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-forge-800">
            <button
              type="button"
              onClick={() => {
                setDecisionModal(null);
                setComment('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-forge-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition ${decisionModal?.action === 'APPROVED'
                ? 'bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/20'
                : decisionModal?.action === 'RETURNED_FOR_CORRECTION'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20'
                }`}
            >
              {decisionModal?.action === 'APPROVED' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Approving...' : 'Confirm Approval'}</span>
                </>
              ) : decisionModal?.action === 'RETURNED_FOR_CORRECTION' ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>{isSubmitting ? 'Returning...' : 'Confirm Return'}</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Detail Modal */}
      <RequestDetailModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      {/* Proof Evidence Lightbox / Viewer Modal */}
      <ProofViewerModal
        document={viewingProof}
        isOpen={!!viewingProof}
        onClose={() => setViewingProof(null)}
      />
    </div>
  );
};
