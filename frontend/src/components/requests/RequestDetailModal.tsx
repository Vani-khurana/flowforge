import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { RequestItem, RequestDocument } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { ProofViewerModal } from '../documents/ProofViewerModal';
import { DocumentThumbnail } from '../documents/DocumentThumbnail';
import {
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Building,
  Ban,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface RequestDetailModalProps {
  request: RequestItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [viewingProof, setViewingProof] = useState<RequestDocument | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  if (!request) return null;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setIsCancelling(true);
    try {
      const res = await api.patch(`/requests/${request.id}/cancel`);
      if (res.data.success) {
        toast.info(`Request ${request.id} has been cancelled`);
        onClose();
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResubmit = async () => {
    setIsResubmitting(true);
    try {
      const res = await api.patch(`/requests/${request.id}/resubmit`, {
        description: `${request.description || ''} (Revised by employee)`.trim(),
      });
      if (res.data.success) {
        toast.success(`Request ${request.id} resubmitted for approval!`);
        onClose();
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resubmit request');
    } finally {
      setIsResubmitting(false);
    }
  };

  const documents = request.documents || [];
  const latestReturnedApproval = [...request.approvals]
    .reverse()
    .find((a) => a.action === 'RETURNED_FOR_CORRECTION');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={request.title}
      subtitle={`Tracking ID: ${request.id} • Submitted on ${new Date(request.createdAt).toLocaleDateString()}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-forge-950/70 border border-forge-800">
          <div className="flex items-center gap-3">
            <Badge status={request.status} />
            <Badge type={request.type} />
          </div>

          <div className="flex items-center gap-4 text-xs text-forge-400">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-forge-300" />
              <strong className="text-forge-200">{request.requesterName}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-forge-300" />
              <span>{request.departmentName}</span>
            </span>
          </div>
        </div>

        {/* Returned for Correction Alert Banner */}
        {request.status === 'RETURNED_FOR_CORRECTION' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Action Required: Request Returned for Correction</span>
            </div>
            {latestReturnedApproval?.comment && (
              <p className="bg-forge-950/60 p-2.5 rounded-lg border border-amber-500/20 text-slate-300 italic">
                "{latestReturnedApproval.comment}" — {latestReturnedApproval.approverName} ({latestReturnedApproval.approverRole})
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-amber-300/80">
                You can review the notes and re-submit this request back to the approver.
              </span>
              <button
                type="button"
                onClick={handleResubmit}
                disabled={isResubmitting}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResubmitting ? 'Resubmitting...' : 'Resubmit Request'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Visual Workflow Pipeline Progress */}
        <div className="p-4 rounded-xl bg-forge-950/40 border border-forge-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-forge-400 mb-4 flex items-center justify-between">
            <span>Workflow Progression Timeline</span>
            <span className="text-[11px] text-brand-500 font-medium">
              {request.status === 'COMPLETED'
                ? 'All Steps Completed'
                : request.status === 'REJECTED'
                ? 'Workflow Terminated'
                : request.status === 'RETURNED_FOR_CORRECTION'
                ? 'Returned for Correction'
                : `Current: ${request.currentStepName}`}
            </span>
          </h4>

          <div className="flex items-center justify-between relative px-2">
            {/* Step 1: Submission */}
            <div className="flex flex-col items-center text-center z-10">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center font-bold text-xs mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-forge-200">Submitted</span>
              <span className="text-[10px] text-forge-400">{request.requesterRole}</span>
            </div>

            <div className="flex-1 h-0.5 bg-brand-500/40 mx-2 -mt-5" />

            {/* Step 2: Manager Review */}
            <div className="flex flex-col items-center text-center z-10">
              {request.approvals.some((a) => a.approverRole === 'MANAGER' && a.action === 'APPROVED') ? (
                <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center font-bold text-xs mb-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : request.status === 'RETURNED_FOR_CORRECTION' ? (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs mb-1.5">
                  <RotateCcw className="w-4 h-4" />
                </div>
              ) : request.status === 'REJECTED' ? (
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-bold text-xs mb-1.5">
                  <XCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs mb-1.5 animate-pulse">
                  <Clock className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-semibold text-forge-200">Manager</span>
              <span className="text-[10px] text-forge-400">Step 1</span>
            </div>

            <div className="flex-1 h-0.5 bg-forge-800 mx-2 -mt-5" />

            {/* Step 3: Final Sign-off */}
            <div className="flex flex-col items-center text-center z-10">
              {request.status === 'COMPLETED' ? (
                <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center font-bold text-xs mb-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-forge-800 text-forge-400 border border-forge-700 flex items-center justify-center font-bold text-xs mb-1.5">
                  {request.totalSteps || 2}
                </div>
              )}
              <span className="text-xs font-semibold text-forge-200">Final Clearance</span>
              <span className="text-[10px] text-forge-400">Final Stage</span>
            </div>
          </div>
        </div>

        {/* Dynamic Form Payload Cards */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-forge-400 mb-3">
            Submitted Request Data
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(request.data || {}).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl bg-forge-950/70 border border-forge-800">
                <span className="text-[11px] font-semibold uppercase text-forge-400 block mb-1">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-sm font-bold text-white">
                  {typeof val === 'number' && key.toLowerCase().includes('amount')
                    ? `$${val.toLocaleString()}`
                    : String(val)}
                </span>
              </div>
            ))}
          </div>
          {request.description && (
            <p className="mt-3 text-xs text-forge-300 italic bg-forge-950/50 p-3 rounded-lg border border-forge-800">
              "{request.description}"
            </p>
          )}
        </div>

        {/* Evidence Documents & AI Verification Results */}
        {documents.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-forge-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              Attached Proof Evidence & Verification Reports ({documents.length})
            </h4>

            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-forge-950/80 border border-forge-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <DocumentThumbnail
                        document={doc}
                        onClick={() => setViewingProof(doc)}
                        className="w-14 h-12 rounded-xl shrink-0"
                        heightClass="h-12"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block max-w-sm truncate">{doc.fileName}</span>
                        <span className="text-[10px] text-forge-400 block">
                          {(doc.fileSize / 1024).toFixed(1)} KB • {doc.documentType} • SHA: {doc.fileHash.substring(0, 8)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          doc.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : doc.status === 'REVIEW_REQUIRED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {doc.status.replace('_', ' ')}
                      </span>

                      <button
                        type="button"
                        onClick={() => setViewingProof(doc)}
                        title="Open interactive proof preview"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white text-xs font-bold shadow-md shadow-brand-600/20 hover:shadow-brand-500/40 transition-all duration-150 cursor-pointer group/btn"
                      >
                        <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span>View Proof</span>
                      </button>
                    </div>
                  </div>

                  {/* OCR Extracted Data Preview */}
                  {doc.ocrExtracted && (
                    <div className="p-3 rounded-lg bg-forge-900/60 border border-forge-800/80 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-forge-300">
                      <div>
                        <span className="text-[10px] text-forge-400 block">Vendor</span>
                        <strong>{doc.ocrExtracted.vendor || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-forge-400 block">Amount</span>
                        <strong>${doc.ocrExtracted.amount?.toFixed(2) || '0.00'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-forge-400 block">Date</span>
                        <strong>{doc.ocrExtracted.date || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-forge-400 block">Confidence</span>
                        <strong>{((doc.ocrConfidence || 0) * 100).toFixed(0)}%</strong>
                      </div>
                    </div>
                  )}

                  {/* Warnings if any */}
                  {doc.warnings && doc.warnings.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                      <span className="font-semibold flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3" />
                        Verification Alerts:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-0.5">
                        {doc.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reviewer Note */}
                  {doc.reviewerNotes && (
                    <p className="text-[11px] text-slate-300 italic bg-forge-900/40 p-2 rounded border border-forge-800">
                      Reviewer Note: "{doc.reviewerNotes}" — {doc.reviewerName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval History Trail */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-forge-400 mb-3">
            Approval & Decision Trail
          </h4>

          {request.approvals.length === 0 ? (
            <div className="p-4 rounded-xl bg-forge-950/40 border border-forge-800 text-center text-xs text-forge-400">
              No approval actions recorded yet. Currently waiting for {request.currentStepRole} review.
            </div>
          ) : (
            <div className="space-y-2.5">
              {request.approvals.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl bg-forge-950/80 border border-forge-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {app.action === 'APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    ) : app.action === 'RETURNED_FOR_CORRECTION' ? (
                      <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{app.approverName}</span>
                        <Badge role={app.approverRole} />
                        <span className="text-[11px] text-forge-400">({app.stepName})</span>
                      </div>
                      {app.comment && (
                        <p className="text-xs text-forge-300 mt-1 bg-forge-900/60 p-2 rounded border border-forge-800/80">
                          {app.comment}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-forge-400 shrink-0">
                    {new Date(app.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-forge-800">
          <div>
            {request.status === 'PENDING_APPROVAL' && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-forge-800 hover:bg-forge-700 text-white text-xs font-bold transition"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Proof Lightbox Viewer Modal */}
      <ProofViewerModal
        document={viewingProof}
        isOpen={!!viewingProof}
        onClose={() => setViewingProof(null)}
      />
    </Modal>
  );
};
export default RequestDetailModal;
