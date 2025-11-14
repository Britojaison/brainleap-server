import { Router } from 'express';

import { extractQuestion } from '../controllers/visionController.js';

const router = Router();

router.post('/extract', extractQuestion);

export default router;
