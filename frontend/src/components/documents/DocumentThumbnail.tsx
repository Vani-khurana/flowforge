import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RequestDocument } from '../../types';
import { FileText, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DocumentThumbnailProps {
  document: RequestDocument;
  onClick?: () => void;
  className?: string;
  heightClass?: string;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  document: doc,
  onClick,
  className = '',
  heightClass = 'h-32',
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    if (!doc || !doc.id) {
      setIsLoading(false);
      return;
    }

    const query = doc.fileName ? `?fileName=${encodeURIComponent(doc.fileName)}` : '';

    api
      .get(`/documents/${doc.id}/download${query}`, { responseType: 'blob' })
      .then((res) => {
        if (active) {
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.warn('[DocumentThumbnail] Failed to load thumbnail blob:', err);
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [doc?.id, doc?.fileName]);

  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf');
  const isImage =
    doc.mimeType?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName || '');

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative group rounded-xl bg-forge-950 border border-forge-700/80 hover:border-brand-500 overflow-hidden shrink-0 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${heightClass} ${className}`}
      title={`Click to inspect proof document: ${doc.fileName}`}
    >
      {/* Background Live Render */}
      {isLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2 bg-forge-950/80">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-forge-400">Loading preview...</span>
        </div>
      ) : hasError || !blobUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-forge-900/60">
          <FileText className="w-7 h-7 text-brand-400 mb-1" />
          <span className="text-xs font-bold text-white truncate max-w-[140px] px-2 block">
            {doc.fileName}
          </span>
          <span className="text-[10px] text-forge-400 mt-0.5">
            {(doc.fileSize / 1024).toFixed(1)} KB
          </span>
        </div>
      ) : isImage ? (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black/40">
          <img
            src={blobUrl}
            alt={doc.fileName}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : isPdf ? (
        <div className="w-full h-full relative overflow-hidden bg-forge-900/90 flex flex-col items-center justify-center p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center mb-1 font-bold text-[10px]">
            PDF
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[130px] block">
            {doc.fileName}
          </span>
          <span className="text-[10px] text-forge-400 mt-0.5">
            {(doc.fileSize / 1024).toFixed(1)} KB • Document
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-forge-900/60">
          <FileText className="w-6 h-6 text-brand-400 mb-1" />
          <span className="text-xs font-bold text-white truncate max-w-[130px] block">
            {doc.fileName}
          </span>
        </div>
      )}

      {/* Hover Glassmorphic Overlay */}
      <div className="absolute inset-0 bg-forge-950/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-center">
        <Eye className="w-5 h-5 text-brand-400 mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-bold text-white">Click to Inspect</span>
        <span className="text-[9px] text-forge-300 truncate max-w-[120px]">{doc.fileName}</span>
      </div>

      {/* Status Corner Pill */}
      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
        <span
          className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider border flex items-center gap-1 ${
            doc.status === 'VERIFIED'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
              : doc.status === 'REVIEW_REQUIRED'
              ? 'bg-amber-950/90 text-amber-300 border-amber-600/60'
              : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
          }`}
        >
          {doc.status === 'VERIFIED' ? (
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
          )}
          {doc.status === 'VERIFIED' ? 'Verified' : 'Review'}
        </span>
      </div>
    </div>
  );
};

