import { Router } from 'express';

import { submitPractice, generateQuestion } from '../controllers/practiceController.js';

const router = Router();

router.post('/', submitPractice);
router.post('/generate-question', generateQuestion);

export default router;
