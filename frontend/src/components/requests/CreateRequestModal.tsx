import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  DollarSign,
  FileText,
  Send,
  Sparkles,
  Upload,
  X,
  CheckCircle2,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'LEAVE' | 'PURCHASE' | 'EXPENSE'>('LEAVE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    status?: string;
    outcome?: string;
    aiGeneratedPercentage: number;
    authenticityScore: number;
    classification: string;
    isOfficialDocument: boolean;
    aiGeneratedOrArtwork: boolean;
    recommendation: 'RECOMMEND_RECONSIDER' | 'ACCEPTABLE' | 'VERIFIED';
    suggestionMessage: string;
    extractedData?: any;
    warnings?: string[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setAiInsights(null);
    setIsScanning(true);

    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'requestData',
        JSON.stringify({
          amount: type === 'PURCHASE' ? purchaseAmount : type === 'EXPENSE' ? expenseAmount : undefined,
          item: purchaseItem,
          category: expenseCategory,
        })
      );

      const res = await api.post('/documents/pre-screen', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setAiInsights(res.data.data);
      }
    } catch (err: any) {
      console.warn('AI Pre-screening error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Dynamic Type-Specific State
  // Leave
  const [leaveType, setLeaveType] = useState('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Purchase
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [purchaseReason, setPurchaseReason] = useState('');

  // Expense
  const [expenseCategory, setExpenseCategory] = useState('Travel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  const toast = useToast();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLeaveReason('');
    setPurchaseItem('');
    setPurchaseAmount('');
    setExpenseAmount('');
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setAiInsights(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    let payloadData: Record<string, any> = {};

    if (type === 'LEAVE') {
      if (!startDate || !endDate) {
        toast.error('Please select both start and end dates');
        return;
      }
      payloadData = {
        leaveType,
        startDate,
        endDate,
        reason: leaveReason || title,
      };
    } else if (type === 'PURCHASE') {
      if (!purchaseItem || !purchaseAmount) {
        toast.error('Please specify the item and amount');
        return;
      }
      payloadData = {
        item: purchaseItem,
        amount: parseFloat(purchaseAmount),
        requiredDate: requiredDate || new Date().toISOString().split('T')[0],
        reason: purchaseReason || title,
      };
    } else if (type === 'EXPENSE') {
      if (!expenseAmount) {
        toast.error('Please specify the expense amount');
        return;
      }
      payloadData = {
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        date: expenseDate || new Date().toISOString().split('T')[0],
        description: expenseDesc || title,
      };
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/requests', {
        type,
        title,
        description: description || undefined,
        data: payloadData,
      });

      if (res.data.success) {
        const createdReq = res.data.data;

        // If evidence file is attached, upload it
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('requestId', createdReq.id);
          formData.append(
            'documentType',
            type === 'PURCHASE' ? 'QUOTE' : type === 'EXPENSE' ? 'RECEIPT' : 'OTHER'
          );

          try {
            await api.post('/documents/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(`Request ${createdReq.id} created and evidence document verified!`);
          } catch (uploadErr: any) {
            toast.error(
              `Request created, but document upload flagged: ${uploadErr.response?.data?.message || 'Upload issue'
              }`
            );
          }
        } else {
          toast.success(`Request ${createdReq.id} created and routed for approval!`);
        }

        resetForm();
        setSelectedFile(null);
        onClose();
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Workflow Request"
      subtitle="Select the request type and provide details to initiate the approval sequence."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selection Tabs */}
        <div>
          <label className="block text-xs font-semibold text-forge-300 uppercase tracking-wider mb-2">
            Request Type
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setType('LEAVE');
                if (!title) setTitle('Annual Leave Request');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition ${type === 'LEAVE'
                  ? 'bg-brand-500/15 border-brand-500 text-brand-400'
                  : 'bg-forge-950/60 border-forge-800 text-forge-300 hover:border-forge-700'
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Leave</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('PURCHASE');
                if (!title) setTitle('Hardware/Software Purchase');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition ${type === 'PURCHASE'
                  ? 'bg-brand-500/15 border-brand-500 text-brand-400'
                  : 'bg-forge-950/60 border-forge-800 text-forge-300 hover:border-forge-700'
                }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Purchase</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                if (!title) setTitle('Operational Expense Claim');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition ${type === 'EXPENSE'
                  ? 'bg-brand-500/15 border-brand-500 text-brand-400'
                  : 'bg-forge-950/60 border-forge-800 text-forge-300 hover:border-forge-700'
                }`}
            >
              <FileText className="w-4 h-4" />
              <span>Expense</span>
            </button>
          </div>
        </div>

        {/* General Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Request Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5 Days Annual Vacation, Workstation Purchase"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-sm text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide background context for your approvers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-sm text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition"
            />
          </div>
        </div>

        {/* Dynamic Fields Section */}
        <div className="p-4 rounded-xl bg-forge-950/70 border border-forge-800/90 space-y-3.5">
          <div className="flex items-center justify-between border-b border-forge-800/80 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{type} Details</span>
            </span>
            <span className="text-[11px] text-forge-400">Routed via Active Workflow</span>
          </div>

          {type === 'LEAVE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick / Medical</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-forge-400 mb-1">Reason for Leave</label>
                <input
                  type="text"
                  placeholder="e.g. Family vacation, medical appointment"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {type === 'PURCHASE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Item / Software Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ergonomic Desk, IDE License"
                    value={purchaseItem}
                    onChange={(e) => setPurchaseItem(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Estimated Cost ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1250.00"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Required By Date</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Business Justification</label>
                  <input
                    type="text"
                    placeholder="Why this procurement is necessary"
                    value={purchaseReason}
                    onChange={(e) => setPurchaseReason(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'EXPENSE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Travel & Lodging">Travel & Lodging</option>
                    <option value="Meals & Entertainment">Meals & Entertainment</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Software Subscription">Software Subscription</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="350.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-forge-400 mb-1">Date Incurred</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-forge-400 mb-1">Expense Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Travel tickets to client on-site meeting"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-forge-900 border border-forge-700/80 rounded-lg px-2.5 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Proof & Evidence Attachment Section */}
        <div>
          <label className="block text-xs font-semibold text-forge-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-brand-400" />
              Proof & Supporting Evidence (Receipt / Quote / Folio)
            </span>
            {type !== 'LEAVE' && (
              <span className="text-[10px] text-amber-400 font-normal">
                AI Verification Gating Active
              </span>
            )}
          </label>

          {selectedFile ? (
            <div className="space-y-2.5">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-forge-900 border border-brand-500/40 text-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  {filePreviewUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-forge-700 flex-shrink-0 bg-black/40 group">
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-400" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="font-semibold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-forge-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="re-upload-file"
                    className="cursor-pointer text-[11px] font-medium text-brand-400 hover:text-brand-300 hover:underline px-2 py-1 rounded bg-forge-800/60"
                  >
                    Change File
                  </label>
                  <input
                    id="re-upload-file"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                      setFilePreviewUrl(null);
                      setAiInsights(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-forge-800 text-forge-400 hover:text-rose-400 transition"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scanning State */}
              {isScanning && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs animate-pulse">
                  <RotateCw className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-brand-300">
                      AI Forensic Engine Analyzing Document...
                    </p>
                    <p className="text-[10px] text-forge-400">
                      Screening for AI generation markers, digital artwork classification, OCR fiscal consistency, and authenticity scoring...
                    </p>
                  </div>
                </div>
              )}

              {/* AI Pre-Screening Insights Card */}
              {aiInsights && !isScanning && (
                <div
                  className={`p-3.5 rounded-xl border transition-all ${aiInsights.recommendation === 'RECOMMEND_RECONSIDER'
                      ? 'bg-rose-950/25 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : aiInsights.recommendation === 'ACCEPTABLE'
                        ? 'bg-amber-950/25 border-amber-500/40 shadow-lg shadow-amber-950/20'
                        : 'bg-emerald-950/25 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    }`}
                >
                  {/* Top Bar with Status and Engine */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-forge-800/80">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span className="text-xs font-bold text-forge-100">
                        Evidence Pre-Screening Results
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          aiInsights.authenticityScore >= 70
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : aiInsights.authenticityScore >= 40
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        Authenticity: {aiInsights.authenticityScore}%
                      </span>
                      {aiInsights.aiGeneratedPercentage > 20 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          AI / Tamper Risk: {aiInsights.aiGeneratedPercentage}%
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          aiInsights.recommendation === 'RECOMMEND_RECONSIDER'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : aiInsights.recommendation === 'ACCEPTABLE'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {aiInsights.status ? aiInsights.status.replace('_', ' ') : 'PRE-SCREENED'}
                      </span>
                    </div>
                  </div>

                  {/* Authenticity Confidence Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-forge-400">Document Authenticity Score</span>
                      <span
                        className={`font-mono font-bold ${
                          aiInsights.authenticityScore >= 70
                            ? 'text-emerald-400'
                            : aiInsights.authenticityScore >= 40
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {aiInsights.authenticityScore}%{' '}
                        {aiInsights.authenticityScore < 40 ? '(CRITICALLY LOW / NOT AUTHENTIC)' : ''}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-forge-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          aiInsights.authenticityScore >= 70
                            ? 'bg-emerald-500'
                            : aiInsights.authenticityScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(6, Math.min(100, aiInsights.authenticityScore))}%` }}
                      />
                    </div>
                  </div>

                  {/* Suggestion & Findings Banner */}
                  {aiInsights.recommendation === 'RECOMMEND_RECONSIDER' ? (
                    <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-rose-300">
                          Evidence Advisory
                        </p>
                        <p className="text-[11px] text-forge-300 mt-0.5 leading-relaxed">
                          {aiInsights.suggestionMessage}
                        </p>
                      </div>
                    </div>
                  ) : aiInsights.recommendation === 'ACCEPTABLE' ? (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-amber-300">
                          Human Review Recommended
                        </p>
                        <p className="text-[11px] text-forge-300 mt-0.5 leading-relaxed">
                          {aiInsights.suggestionMessage}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-emerald-300">
                          Automated OCR Evidence Match
                        </p>
                        <p className="text-[11px] text-forge-300 mt-0.5">
                          {aiInsights.suggestionMessage}
                        </p>
                        {aiInsights.extractedData?.vendor && (
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-emerald-400/90">
                            <span>Vendor: <strong>{aiInsights.extractedData.vendor}</strong></span>
                            {aiInsights.extractedData?.amount > 0 && (
                              <span>Total: <strong>${aiInsights.extractedData.amount}</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-forge-700/80 hover:border-brand-500/60 bg-forge-900/40 hover:bg-forge-900/80 cursor-pointer transition">
              <Upload className="w-6 h-6 text-forge-400 mb-1" />
              <span className="text-xs font-medium text-forge-200">
                Click to attach evidence file (PDF, PNG, JPEG)
              </span>
              <span className="text-[10px] text-forge-400 mt-0.5">
                Automated OCR reads text, verifies amount consistency, and checks cryptographic integrity
              </span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-forge-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-forge-400 hover:text-white hover:bg-forge-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
