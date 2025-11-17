import { Router } from 'express';

import { evaluateCanvas, evaluateCanvasImage, requestHint } from '../controllers/aiController.js';

const router = Router();

router.post('/hints', requestHint);
router.post('/evaluate', evaluateCanvas);
router.post('/evaluate-image', evaluateCanvasImage);

export default router;
