import express from 'express';
import * as historyController from '../controllers/historyController.js';

const router = express.Router();

router.post('/', historyController.saveHistory);
router.put('/:id', historyController.updateHistory);
router.get('/', historyController.getHistory);
router.get('/:id', historyController.getHistoryDetail);

export default router;
