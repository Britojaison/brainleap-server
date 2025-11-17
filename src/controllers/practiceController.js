import { logger } from '../config/logger.js';
import { submitPracticeAttempt } from '../services/practiceService.js';

const truncate = (text, limit = 80) => {
  if (typeof text !== 'string') return text;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const getStrokeCount = (canvasPayload) => {
  if (!canvasPayload || typeof canvasPayload !== 'object') return 0;
  if (Array.isArray(canvasPayload.strokes)) {
    return canvasPayload.strokes.length;
  }
  return 0;
};

export const submitPractice = async (req, res, next) => {
  const { userId, question, canvas } = req.body;
  const safeUser = userId ?? 'anonymous';

  try {
    if (!question || typeof question !== 'string') {
      logger.warn(`[Practice] Invalid submission from user=${safeUser} (missing question)`);
      return res.status(400).json({ message: 'Question is required.' });
    }

    const strokeCount = getStrokeCount(canvas);
    logger.info(
      `[Practice] Submission received | user=${safeUser} question="${truncate(question)}" strokes=${strokeCount}`,
    );

    const result = await submitPracticeAttempt({
      userId: safeUser,
      question,
      canvas: canvas ?? {},
    });

    logger.info(
      `[Practice] Submission stored successfully | user=${safeUser} attemptId=${result?.id ?? 'mock'}`,
    );
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(
      `[Practice] Submission failed | user=${safeUser} question="${truncate(question)}" error=${
        error.message
      }`,
    );
    return next(error);
  }
};
