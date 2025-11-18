import { evaluateCanvasAnswer, evaluateCanvasImage as evaluateImageService } from '../services/aiEvaluationService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import { logger } from '../config/logger.js';

export const requestHint = async (req, res) => {
  try {
    const { question, imageBase64, mimeType } = req.body;

    if (!question || question.trim() === '') {
      return errorResponse(res, 'Question is required for hint.', 400);
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return errorResponse(res, 'Canvas image is required for hint.', 400);
    }

    logger.info(`Generating hint for question: ${question.substring(0, 50)}...`);

    // Decode base64 image
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const imageBuffer = Buffer.from(base64Data, 'base64');
    logger.info(`Hint request - Image buffer size: ${imageBuffer.length} bytes`);

    // Import the hint service function
    const { generateHintFromImage } = await import('../services/aiEvaluationService.js');
    const hint = await generateHintFromImage(question, imageBuffer, mimeType || 'image/png');

    successResponse(res, {
      title: hint.title,
      explanation: hint.explanation,
      nextSteps: hint.nextSteps || [],
    });
  } catch (error) {
    logger.error('AI hint generation failed', error);
    errorResponse(res, error.message || 'Hint generation failed. Please try again.');
  }
};

export const evaluateCanvas = async (req, res) => {
  try {
    const { questionId, canvasState } = req.body;

    if (!questionId || questionId.trim() === '') {
      return errorResponse(res, 'Question is required for evaluation.', 400);
    }

    if (!canvasState) {
      return errorResponse(res, 'Canvas state is required for evaluation.', 400);
    }

    logger.info(`Evaluating canvas for question: ${questionId.substring(0, 50)}...`);

    const evaluation = await evaluateCanvasAnswer(questionId, canvasState);

    successResponse(res, {
      title: evaluation.title,
      explanation: evaluation.explanation,
      nextSteps: evaluation.nextSteps,
    });
  } catch (error) {
    logger.error('AI evaluation failed', error);
    errorResponse(res, error.message || 'AI evaluation failed. Please try again.');
  }
};

export const evaluateCanvasImage = async (req, res) => {
  try {
    const { question, imageBase64, mimeType } = req.body;

    if (!question || question.trim() === '') {
      return errorResponse(res, 'Question is required for evaluation.', 400);
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return errorResponse(res, 'Canvas image is required for evaluation.', 400);
    }

    logger.info(`Evaluating canvas image for question: ${question.substring(0, 50)}...`);
    logger.info(`Image base64 length: ${imageBase64.length}`);
    logger.info(`MIME type: ${mimeType || 'image/png'}`);

    // Decode base64 image
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    logger.info(`Decoded base64 data length: ${base64Data.length}`);

    const imageBuffer = Buffer.from(base64Data, 'base64');
    logger.info(`Image buffer size: ${imageBuffer.length} bytes`);

    // Check if image buffer is too small (likely empty)
    if (imageBuffer.length < 1000) {
      logger.warn('Image buffer is very small, likely empty canvas');
      return errorResponse(res, 'No content detected on the whiteboard. Please write your solution before submitting for evaluation.', 400);
    }

    // Log first few bytes to verify it's a valid PNG
    const header = imageBuffer.slice(0, 8).toString('hex');
    logger.info(`Image header (first 8 bytes): ${header}`);
    const isPNG = header.startsWith('89504e47');
    logger.info(`Is valid PNG: ${isPNG}`);

    const evaluation = await evaluateImageService(question, imageBuffer, mimeType || 'image/png');

    successResponse(res, {
      title: evaluation.title,
      explanation: evaluation.explanation,
      nextSteps: evaluation.nextSteps,
      isCorrect: evaluation.isCorrect,
      isBlank: evaluation.isBlank,
    });
  } catch (error) {
    logger.error('AI image evaluation failed', error);
    errorResponse(res, error.message || 'AI evaluation failed. Please try again.');
  }
};
