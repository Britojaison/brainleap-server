import { Router } from 'express';

import { evaluateCanvas, requestHint } from '../controllers/aiController.js';

const router = Router();

router.post('/hints', requestHint);
router.post('/evaluate', evaluateCanvas);

export default router;
