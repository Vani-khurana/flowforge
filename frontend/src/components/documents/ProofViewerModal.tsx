import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { RequestDocument } from '../../types';
import { api } from '../../services/api';
import {
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Building,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';

interface ProofViewerModalProps {
  document: RequestDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProofViewerModal: React.FC<ProofViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedHash, setCopiedHash] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);
    setIsImageLoading(true);
    setZoom(1);
    setRotation(0);

    if (!doc || !isOpen) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      return;
    }

    let active = true;
    const query = doc.fileName ? `?fileName=${encodeURIComponent(doc.fileName)}` : '';
    api
      .get(`/documents/${doc.id}/download${query}`, { responseType: 'blob' })
      .then((res) => {
        if (active) {
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
          setIsImageLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.warn('Failed to load document preview:', err);
          setImageError(true);
          setIsImageLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [doc?.id, isOpen, retryKey]);

  if (!doc) return null;

  const fileUrl = blobUrl || '';
  const isPdf = doc.mimeType === 'application/pdf';
  const isImage = doc.mimeType.startsWith('image/') || doc.fileName.match(/\.(png|jpe?g|webp|gif|svg)$/i);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(doc.fileHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = window.document.createElement('a');
    a.href = fileUrl;
    a.download = doc.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const handleOpenTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetTransform();
        onClose();
      }}
      title="Uploaded Documentary Proof & Evidence"
      subtitle={`Document ID: ${doc.id} • Attached to Request #${doc.requestId}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-forge-950/60 border border-forge-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{doc.fileName}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    doc.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : doc.status === 'REVIEW_REQUIRED'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {doc.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-forge-400 mt-0.5">
                {(doc.fileSize / 1024).toFixed(1)} KB • {doc.mimeType} • Attached by {doc.uploaderName || doc.uploaderId}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyHash}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forge-900 hover:bg-forge-800 text-forge-300 hover:text-white border border-forge-700/80 text-xs font-semibold hover:scale-105 active:scale-95 shadow-sm transition-all duration-150 cursor-pointer"
              title="Copy cryptographic SHA-256 fingerprint to clipboard"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHash ? 'Copied' : 'SHA-256'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!fileUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forge-900 hover:bg-forge-800 text-forge-300 hover:text-white border border-forge-700/80 text-xs font-semibold hover:scale-105 active:scale-95 shadow-sm transition-all duration-150 cursor-pointer group disabled:opacity-50"
              title={`Download original file "${doc.fileName}"`}
            >
              <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTab}
              disabled={!fileUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/40 hover:border-brand-500 text-xs font-semibold hover:scale-105 active:scale-95 shadow-sm transition-all duration-150 cursor-pointer group disabled:opacity-50"
              title="Open raw file in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span>Open Tab</span>
            </button>
          </div>
        </div>

        {/* Human Review Adjudication Banner (if already reviewed) */}
        {doc.reviewerNotes && (
          <div className="p-4 rounded-xl bg-forge-900/80 border border-brand-500/30 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-sm text-brand-300">
                Compliance Reviewer Adjudication: {doc.status === 'VERIFIED' ? 'Cleared & Verified' : 'Rejected'}
              </span>
              <p className="text-forge-200 leading-relaxed italic">
                "{doc.reviewerNotes}"
              </p>
              <p className="text-[10px] text-forge-400">
                Adjudicated by <strong>{doc.reviewerName || doc.reviewerId}</strong> • {new Date(doc.reviewedAt || doc.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Status Advisory Banner */}
        {doc.status === 'VERIFICATION_FAILED' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm text-rose-300">
                Verification Check Flagged
              </span>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                {doc.warnings && doc.warnings[0]
                  ? doc.warnings[0]
                  : 'Document format, magic byte signature, or duplicate check was flagged by automated validation.'}
              </p>
            </div>
          </div>
        )}

        {doc.status === 'REVIEW_REQUIRED' && !doc.reviewerNotes && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm text-amber-300">
                Human Review Requested
              </span>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {doc.warnings && doc.warnings[0]
                  ? doc.warnings[0]
                  : 'Document text could not be unambiguously extracted. Requires manual visual confirmation.'}
              </p>
            </div>
          </div>
        )}

        {/* Visual Proof Display Area */}
        <div className="rounded-2xl bg-forge-950 border border-forge-800 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[360px] max-h-[500px] relative p-4">
          {/* Status badge on preview */}
          <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border">
            {doc.status === 'VERIFIED' ? (
              <span className="bg-emerald-950/90 border-emerald-600/80 text-emerald-300 flex items-center gap-1.5 px-2 py-1 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                VERIFIED DOCUMENT
              </span>
            ) : doc.status === 'REVIEW_REQUIRED' ? (
              <span className="bg-amber-950/90 border-amber-600/80 text-amber-300 flex items-center gap-1.5 px-2 py-1 rounded">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                NEEDS HUMAN REVIEW
              </span>
            ) : (
              <span className="bg-rose-950/90 border-rose-600/80 text-rose-300 flex items-center gap-1.5 px-2 py-1 rounded">
                <XCircle className="w-4 h-4 text-rose-400" />
                CHECKS FLAGGED
              </span>
            )}
          </div>

          {/* Zoom / Rotation Toolbar for images */}
          {isImage && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-forge-900/90 backdrop-blur-md border border-forge-700/80 rounded-xl p-1 shadow-lg">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded-lg text-forge-300 hover:text-white hover:bg-brand-500/20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Zoom Out (-25%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-forge-300 px-1 font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded-lg text-forge-300 hover:text-white hover:bg-brand-500/20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Zoom In (+25%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg text-forge-300 hover:text-white hover:bg-brand-500/20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Rotate clockwise 90 degrees"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetTransform}
                title="Reset zoom and rotation to default"
                className="px-2 py-1 text-[10px] font-bold text-forge-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {/* Document Content Rendering */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
            {isPdf && fileUrl ? (
              <iframe
                src={fileUrl}
                title={doc.fileName}
                className="w-full h-[450px] rounded-xl border border-forge-800 bg-white"
              />
            ) : isImage && fileUrl && !imageError ? (
              <div className="relative flex items-center justify-center w-full h-full min-h-[360px]">
                {isImageLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-forge-950/80 backdrop-blur-sm rounded-xl">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-forge-400 font-medium">Loading high-resolution proof image...</span>
                  </div>
                )}
                <img
                  src={fileUrl}
                  alt={doc.fileName}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    setImageError(true);
                  }}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className={`max-h-[440px] max-w-full object-contain rounded-lg shadow-xl transition-opacity duration-200 ${
                    isImageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-12 h-12 text-brand-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Document Preview Render</p>
                <p className="text-xs text-forge-400 max-w-md">
                  This document is stored as <code className="text-brand-400">{doc.fileName}</code>.
                  You can inspect the extracted proof data below or retry the visual preview.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageError(false);
                      setIsImageLoading(true);
                      setRetryKey((k) => k + 1);
                    }}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs inline-flex items-center gap-2 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry Loading Document</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-forge-800 hover:bg-forge-700 text-white font-bold text-xs inline-flex items-center gap-2 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OCR Data & Verification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OCR Extracted Data */}
          <div className="p-4 rounded-xl bg-forge-950/60 border border-forge-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-forge-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                OCR Extracted Values
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  doc.status === 'VERIFICATION_FAILED' || (doc.ocrConfidence || 0) < 0.6
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                }`}
              >
                Extraction: {doc.ocrExtracted?.extractionMethod || (doc.ocrConfidence ? `${Math.round(doc.ocrConfidence * 100)}%` : 'Available')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-forge-900/60 border border-forge-800">
                <span className="text-[10px] text-forge-400 uppercase font-semibold flex items-center gap-1">
                  <Building className="w-3 h-3" /> Vendor
                </span>
                <span className="font-bold text-white block mt-0.5 truncate">
                  {doc.ocrExtracted?.vendor || 'Not identified in text'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-forge-900/60 border border-forge-800">
                <span className="text-[10px] text-forge-400 uppercase font-semibold flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Nominal Amount
                </span>
                <span className="font-black text-sm block mt-0.5 text-emerald-400">
                  {doc.ocrExtracted?.amount !== null && doc.ocrExtracted?.amount !== undefined
                    ? `$${Number(doc.ocrExtracted.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : 'Not located in text'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-forge-900/60 border border-forge-800">
                <span className="text-[10px] text-forge-400 uppercase font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date
                </span>
                <span className="font-bold text-white block mt-0.5">
                  {doc.ocrExtracted?.date || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-forge-900/60 border border-forge-800">
                <span className="text-[10px] text-forge-400 uppercase font-semibold">
                  Invoice / Reference #
                </span>
                <span className="font-mono text-forge-200 block mt-0.5 truncate">
                  {doc.ocrExtracted?.invoiceNumber || doc.ocrExtracted?.referenceNumber || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Forensic Checks & Explanations */}
          <div className="p-4 rounded-xl bg-forge-950/60 border border-forge-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forge-300 block">
              Automated Forensic Evidence Checks
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-forge-900/40 border border-forge-800">
                <span className="text-forge-300">File Signature (Magic Bytes):</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    doc.verificationChecks?.magicBytesValid !== false ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {doc.verificationChecks?.magicBytesValid !== false ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Header
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Mismatch / Corrupt
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-forge-900/40 border border-forge-800">
                <span className="text-forge-300">Duplicate Check (SHA-256):</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    doc.verificationChecks?.hashUnique !== false ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {doc.verificationChecks?.hashUnique !== false ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unique Payload
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Duplicate Upload
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-forge-900/40 border border-forge-800">
                <span className="text-forge-300">Amount Consistency:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    doc.verificationChecks?.amountConsistency
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {doc.verificationChecks?.amountConsistency ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matches Request
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Manual Review
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Warnings & Explanations List */}
        {doc.warnings && doc.warnings.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Evidence Inconsistency & Explanations
            </span>
            <ul className="list-disc list-inside space-y-1 text-forge-300">
              {doc.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
