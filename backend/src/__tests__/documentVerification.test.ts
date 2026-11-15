import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentVerificationService } from '../services/documentVerification.service';
import { db } from '../db/store';

describe('DocumentVerificationService & AI Evidence Verification', () => {
  beforeEach(() => {
    (db as any).seed();
  });

  it('validates authentic PDF magic bytes (%PDF)', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%...\n');
    const isValid = DocumentVerificationService.validateMagicBytes(
      validPdfBuffer,
      'application/pdf'
    );
    expect(isValid).toBe(true);

    const fakePdfBuffer = Buffer.from('FAKE-NOT-A-PDF');
    const isFakeValid = DocumentVerificationService.validateMagicBytes(
      fakePdfBuffer,
      'application/pdf'
    );
    expect(isFakeValid).toBe(false);
  });

  it('computes SHA-256 hash and detects duplicate uploads', async () => {
    const buffer = Buffer.from('%PDF-1.4\nDell Enterprise\nTotal: $500.00\nDate: 2026-11-15\n');
    const hash = DocumentVerificationService.computeHash(buffer);
    expect(hash).toHaveLength(64);

    // Run verification with the buffer
    const res1 = await DocumentVerificationService.performOcrAndVerification(
      buffer,
      'invoice.pdf',
      'application/pdf',
      hash,
      { amount: 500, vendor: 'Dell Enterprise' }
    );
    expect(res1.status).toBe('VERIFIED');
    expect(res1.checks.hashUnique).toBe(true);

    // Simulate adding this document to store
    db.documents.push({
      id: 'doc-existing',
      requestId: 'REQ-101',
      uploaderId: 'user-employee',
      fileName: 'invoice.pdf',
      storagePath: 'uploads/invoice.pdf',
      fileSize: buffer.length,
      mimeType: 'application/pdf',
      fileHash: hash,
      documentType: 'INVOICE',
      status: 'VERIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Re-verify identical buffer -> should flag as duplicate requiring review
    const res2 = await DocumentVerificationService.performOcrAndVerification(
      buffer,
      'duplicate_invoice.pdf',
      'application/pdf',
      hash,
      { amount: 500, vendor: 'Dell Enterprise' }
    );
    expect(res2.checks.hashUnique).toBe(false);
    expect(res2.status).toBe('REVIEW_REQUIRED');
    expect(res2.outcome).toBe('FAILED_CHECKS');
  });

  it('handles human compliance reviewer adjudication with mandatory notes', () => {
    const officer = db.users.find((u) => u.role === 'FINANCE')!;
    const doc = db.documents.find((d) => d.status === 'REVIEW_REQUIRED')!;

    // Adjudicate document as verified with notes
    const adjudicated = DocumentVerificationService.manualReview(
      doc.id,
      'VERIFY',
      'Verified with merchant over telephone confirmation.',
      officer
    );

    expect(adjudicated.status).toBe('VERIFIED');
    expect(adjudicated.reviewerId).toBe(officer.id);
    expect(adjudicated.reviewerNotes).toBe('Verified with merchant over telephone confirmation.');
    expect(adjudicated.reviewedAt).toBeDefined();
  });

  it('rejects human adjudication if reviewer notes are missing', () => {
    const officer = db.users.find((u) => u.role === 'FINANCE')!;
    const doc = db.documents.find((d) => d.status === 'REVIEW_REQUIRED')!;

    expect(() =>
      DocumentVerificationService.manualReview(doc.id, 'VERIFY', '', officer)
    ).toThrow('Reviewer notes are mandatory');
  });

  it('detects digital artwork and flags for human review without fabricating fraud', async () => {
    const animeBuffer = Buffer.from('\xFF\xD8\xFF\xE0JFIF...Adobe Photoshop...illustration...rain');
    const hash = DocumentVerificationService.computeHash(animeBuffer);

    const result = await DocumentVerificationService.performOcrAndVerification(
      animeBuffer,
      'illustration-anime-character-rain.jpg',
      'image/jpeg',
      hash,
      { amount: 150, vendor: 'Commercial Solutions' }
    );

    expect(result.status).toBe('VERIFICATION_FAILED');
    expect(result.checks.isOfficialDocument).toBe(false);
    expect(result.checks.aiGeneratedOrArtwork).toBe(true);
    expect(result.explanations.some((e) => e.check.includes('Media Classification'))).toBe(true);
  });

  it('detects wallpaper graphics and assigns low authenticity score', async () => {
    const artBuffer = Buffer.from('\xFF\xD8\xFF\xE0JFIF...wallpaper...cat-chill-digital-art-4k');
    const hash = DocumentVerificationService.computeHash(artBuffer);

    const result = await DocumentVerificationService.performOcrAndVerification(
      artBuffer,
      'cat-chill-digital-art-4k-wallpaper-uhdpaper.com-287_5_p.jpg',
      'image/jpeg',
      hash,
      { amount: 50 }
    );

    expect(result.status).toBe('VERIFICATION_FAILED');
    expect(result.checks.isOfficialDocument).toBe(false);
    expect(result.confidence).toBeLessThanOrEqual(0.3);
  });

  it('extracts real text and verifies matching official invoice', async () => {
    const invoiceBuffer = Buffer.from(
      '%PDF-1.4\nDell Enterprise\nInvoice #INV-2026-99\nTotal: $450.00\nDate: 2026-11-10\n'
    );
    const hash = DocumentVerificationService.computeHash(invoiceBuffer);

    const result = await DocumentVerificationService.performOcrAndVerification(
      invoiceBuffer,
      'Dell_Enterprise_Invoice.pdf',
      'application/pdf',
      hash,
      { amount: 450, vendor: 'Dell Enterprise' }
    );

    expect(result.status).toBe('VERIFIED');
    expect(result.outcome).toBe('VERIFIED');
    expect(result.checks.isOfficialDocument).toBe(true);
    expect(result.checks.amountConsistency).toBe(true);
    expect(result.extractedData.vendor).toBe('Dell Enterprise');
    expect(result.extractedData.amount).toBe(450);
    expect(result.extractedData.invoiceNumber).toBe('INV-2026-99');
  });

  it('identifies amount mismatches and provides transparent explanation', async () => {
    const mismatchBuffer = Buffer.from(
      '%PDF-1.4\nOffice Supplies Co\nInvoice #INV-551\nTotal: $300.00\n'
    );
    const hash = DocumentVerificationService.computeHash(mismatchBuffer);

    const result = await DocumentVerificationService.performOcrAndVerification(
      mismatchBuffer,
      'Office_Invoice.pdf',
      'application/pdf',
      hash,
      { amount: 500, vendor: 'Office Supplies Co' } // Requested 500 but invoice says 300
    );

    expect(result.checks.amountConsistency).toBe(false);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.outcome).toBe('NEEDS_REVIEW');
    expect(result.warnings.some((w) => w.includes('Amount mismatch'))).toBe(true);
    const explanation = result.explanations.find((e) => e.check === 'Amount Consistency');
    expect(explanation).toBeDefined();
    expect(explanation?.status).toBe('FLAGGED');
  });
});
