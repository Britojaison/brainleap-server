import { Router } from 'express';

import { submitPractice } from '../controllers/practiceController.js';

const router = Router();

router.post('/', submitPractice);

export default router;
