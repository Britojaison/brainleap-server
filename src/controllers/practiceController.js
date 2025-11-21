import { logger } from '../config/logger.js';
import { submitPracticeAttempt, generatePracticeQuestion } from '../services/practiceService.js';

export const submitPractice = async (req, res, next) => {
  try {
    const { userId, question, canvas } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ message: 'Question is required.' });
    }

    const result = await submitPracticeAttempt({
      userId: userId ?? 'anonymous',
      question,
      canvas: canvas ?? {},
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Practice submission failed', error);
    return next(error);
  }
};

export const generateQuestion = async (req, res, next) => {
  try {
    const {
      classLevel,
      subject,
      curriculum,
      topic,
      subtopics,
      subtopic,
    } = req.body;

    if (!topic || !subject) {
      return res.status(400).json({ message: 'Topic and Subject are required.' });
    }

    const result = await generatePracticeQuestion({
      classLevel,
      subject,
      curriculum,
      topic,
      subtopics,
      subtopic,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Question generation failed', error);
    return next(error);
  }
};
