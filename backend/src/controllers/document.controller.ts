import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { DocumentVerificationService } from '../services/documentVerification.service';
import { AppError } from '../middleware/errorHandler';

export class DocumentController {
  static upload = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('File payload is missing', 400);
      }
      const { requestId, documentType } = req.body;
      if (!requestId) {
        throw new AppError('requestId is required', 400);
      }
      const currentUser = req.user!;
      const document = await DocumentVerificationService.processDocumentUpload(
        requestId,
        req.file,
        documentType,
        currentUser
      );
      res.status(201).json({ success: true, data: document });
    } catch (err) {
      next(err);
    }
  };

  static preScreen = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('File payload is missing', 400);
      }
      let requestData = {};
      if (req.body.requestData) {
        try {
          requestData = typeof req.body.requestData === 'string'
            ? JSON.parse(req.body.requestData)
            : req.body.requestData;
        } catch {}
      }

      const result = await DocumentVerificationService.preScreenDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        requestData
      );

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  static getByRequest = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const documents = DocumentVerificationService.getDocumentsForRequest(requestId);
      res.json({ success: true, data: documents });
    } catch (err) {
      next(err);
    }
  };

  static getReviewQueue = (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const queue = DocumentVerificationService.getReviewQueue();
      res.json({ success: true, data: queue });
    } catch (err) {
      next(err);
    }
  };

  static review = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body as { action: 'VERIFY' | 'REJECT'; notes: string };
      const currentUser = req.user!;
      const updated = DocumentVerificationService.manualReview(id, action, notes, currentUser);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  static download = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestedFileName = (req.query.fileName as string) || '';

      // 1. Locate document metadata in store or embedded in requests
      let doc = db.documents.find((d) => d.id === id);
      if (!doc) {
        for (const r of db.requests) {
          if (r.documents) {
            const found = r.documents.find((d) => d.id === id);
            if (found) {
              doc = found;
              break;
            }
          }
        }
      }

      if (!doc && requestedFileName) {
        doc = db.documents.find((d) => d.fileName === requestedFileName);
      }

      const baseDir = path.resolve(__dirname, '..', '..');
      const searchDirs = [
        path.join(baseDir, 'uploads'),
        path.resolve(process.cwd(), 'uploads'),
        path.resolve(process.cwd(), 'backend', 'uploads'),
        path.resolve(baseDir, 'test-documents', 'rejected-samples'),
      ];

      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 2. Candidate paths resolution
      const candidatePaths: string[] = [];

      if (doc?.storagePath) {
        candidatePaths.push(
          path.resolve(baseDir, doc.storagePath),
          path.resolve(process.cwd(), doc.storagePath),
          path.resolve(process.cwd(), 'backend', doc.storagePath),
          ...searchDirs.map((dir) => path.join(dir, path.basename(doc.storagePath))),
          ...searchDirs.map((dir) => path.join(dir, doc.fileName))
        );
      }

      if (requestedFileName) {
        searchDirs.forEach((dir) => {
          candidatePaths.push(path.join(dir, requestedFileName));
          candidatePaths.push(path.join(dir, requestedFileName.replace(/\s+/g, '_')));
        });
      }

      let filePath = candidatePaths.find((p) => fs.existsSync(p));

      // 3. Disk search fallback: fuzzy match on uploads directory
      if (!filePath) {
        const queryTokens = ([
          doc?.fileName,
          requestedFileName,
          id.replace(/^doc-/, '').split('-')[0],
        ].filter(Boolean) as string[])
          .map((s) => s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());

        for (const uploadDir of searchDirs) {
          if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const token of queryTokens) {
              if (token.length < 3) continue;
              const matched = files.find((f) => {
                const cleanF = f.toLowerCase();
                return cleanF.includes(token) || (token.length > 8 && cleanF.includes(token.substring(0, 15)));
              });
              if (matched) {
                filePath = path.join(uploadDir, matched);
                break;
              }
            }
            if (filePath) break;
          }
        }
      }

      if (filePath && fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mime =
          ext === '.pdf'
            ? 'application/pdf'
            : ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : ext === '.svg'
            ? 'image/svg+xml'
            : 'image/jpeg';

        const outputName = doc?.fileName || path.basename(filePath);
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${outputName}"`);
        return fs.createReadStream(filePath).pipe(res);
      }

      if (!doc) {
        throw new AppError('Document record not found', 404);
      }

      // 4. Fallback graphical representation for pre-seeded demonstration records
        const vendor = doc.ocrExtracted?.vendor || 'Commercial Enterprise Services';
        const amount = doc.ocrExtracted?.amount !== undefined ? `$${Number(doc.ocrExtracted.amount).toFixed(2)}` : 'N/A';
        const date = doc.ocrExtracted?.date || new Date(doc.createdAt).toISOString().split('T')[0];
        const statusColor = doc.status === 'VERIFIED' ? '#22c55e' : doc.status === 'REVIEW_REQUIRED' ? '#f59e0b' : '#f43f5e';

        const svg = `
<svg width="700" height="460" viewBox="0 0 700 460" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0f1d"/>
  <rect x="25" y="25" width="650" height="410" rx="16" fill="#131b2e" stroke="#334155" stroke-width="2"/>
  
  <rect x="25" y="25" width="650" height="70" rx="16" fill="#1e293b"/>
  <rect x="25" y="75" width="650" height="20" fill="#1e293b"/>
  <circle cx="60" cy="60" r="14" fill="#0284c7"/>
  <text x="60" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">✓</text>
  <text x="90" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">FlowForge Documentary Proof Verification</text>
  
  <g transform="translate(50, 125)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#64748b" text-transform="uppercase" letter-spacing="1">ORIGINAL FILENAME</text>
    <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">${doc.fileName}</text>
    
    <text x="350" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#64748b" text-transform="uppercase" letter-spacing="1">STATUS</text>
    <rect x="350" y="8" width="160" height="26" rx="6" fill="${statusColor}22" stroke="${statusColor}" stroke-width="1.5"/>
    <text x="430" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="${statusColor}" text-anchor="middle">${doc.status.replace(/_/g, ' ')}</text>
  </g>

  <g transform="translate(50, 200)">
    <rect x="0" y="0" width="600" height="120" rx="10" fill="#0b1120" stroke="#1e293b" stroke-width="1.5"/>
    
    <text x="25" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">VENDOR</text>
    <text x="25" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#e2e8f0">${vendor}</text>
    
    <text x="225" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">AMOUNT</text>
    <text x="225" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">${amount}</text>
    
    <text x="425" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">INVOICE DATE</text>
    <text x="425" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#e2e8f0">${date}</text>

    <line x1="25" y1="72" x2="575" y2="72" stroke="#1e293b" stroke-width="1"/>
    
    <text x="25" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">MIME TYPE: <tspan fill="#94a3b8">${doc.mimeType}</tspan></text>
    <text x="225" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">FILE SIZE: <tspan fill="#94a3b8">${(doc.fileSize / 1024).toFixed(1)} KB</tspan></text>
    <text x="425" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">CONFIDENCE: <tspan fill="#38bdf8">${((doc.ocrConfidence || 0.95) * 100).toFixed(0)}%</tspan></text>
  </g>

  <g transform="translate(50, 355)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="bold" fill="#64748b" text-transform="uppercase">SHA-256 CRYPTOGRAPHIC INTEGRITY HASH</text>
    <text x="0" y="20" font-family="monospace" font-size="11" fill="#38bdf8">${doc.fileHash}</text>
    <text x="0" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#475569">Demonstration Electronic Proof Record • FlowForge Enterprise System</text>
  </g>
</svg>
`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}.svg"`);
        res.send(svg);
    } catch (err) {
      next(err);
    }
  };
}
