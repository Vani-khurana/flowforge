import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

router.use(authenticate);

router.post('/pre-screen', upload.single('file'), DocumentController.preScreen);
router.post('/upload', upload.single('file'), DocumentController.upload);
router.get('/request/:requestId', DocumentController.getByRequest);
router.get('/review-queue', DocumentController.getReviewQueue);
router.post('/:id/review', DocumentController.review);
router.get('/:id/download', DocumentController.download);

export default router;
