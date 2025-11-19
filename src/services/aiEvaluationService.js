import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';

let generativeModel;

const getModel = () => {
  if (!generativeModel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY in env/.env');
    }
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    const genAI = new GoogleGenerativeAI(apiKey);
    generativeModel = genAI.getGenerativeModel({ model: modelName });
  }
  return generativeModel;
};

/**
 * Evaluate a canvas answer using AI vision
 * @param {string} questionId - The question ID
 * @param {string} canvasState - The canvas state (serialized)
 * @returns {Promise<{title: string, explanation: string, nextSteps: string[]}>}
 */
export const evaluateCanvasAnswer = async (questionId, canvasState) => {
  // TODO: Implement canvas state evaluation
  // For now, return a placeholder
  return {
    title: 'Evaluation',
    explanation: 'Canvas state evaluation is not yet implemented.',
    nextSteps: [],
  };
};

/**
 * Evaluate a canvas image using AI vision
 * @param {string} question - The question text
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimeType - The MIME type of the image
 * @returns {Promise<{title: string, explanation: string, nextSteps: string[], isCorrect?: boolean, isBlank?: boolean}>}
 */
export const evaluateCanvasImage = async (question, imageBuffer, mimeType = 'image/png') => {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  const model = getModel();
  const base64Data = imageBuffer.toString('base64');

  const prompt = `You are an expert math and science tutor evaluating a student's handwritten answer.

Question: ${question}

Please evaluate the student's answer shown in the image. Analyze:
1. Is the answer correct or incorrect?
2. What is the explanation for your evaluation?
3. What are the next steps the student should take (if incorrect) or what they did well (if correct)?
4. Is the canvas blank or does it contain content?

Respond in JSON format with this structure:
{
  "title": "Evaluation Result",
  "explanation": "Detailed explanation of the evaluation",
  "nextSteps": ["step1", "step2", ...],
  "isCorrect": true/false,
  "isBlank": true/false
}

Be encouraging and constructive. If the answer is partially correct, acknowledge what's right and guide them on what needs improvement.`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const responseText = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim();

    if (!responseText) {
      throw new Error('No response from AI model');
    }

    // Try to parse JSON from the response
    let evaluationData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       responseText.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      evaluationData = JSON.parse(jsonString);
    } catch (parseError) {
      logger.warn('Failed to parse JSON from AI response, using raw text', parseError);
      // If JSON parsing fails, use the raw text as explanation
      evaluationData = {
        title: 'Evaluation',
        explanation: responseText,
        nextSteps: [],
        isCorrect: false,
        isBlank: false,
      };
    }

    // Ensure required fields
    return {
      title: evaluationData.title || 'Evaluation Result',
      explanation: evaluationData.explanation || responseText || 'Evaluation completed',
      nextSteps: Array.isArray(evaluationData.nextSteps) ? evaluationData.nextSteps : [],
      isCorrect: evaluationData.isCorrect ?? false,
      isBlank: evaluationData.isBlank ?? false,
    };
  } catch (error) {
    logger.error('AI image evaluation failed', error);
    throw new Error(`AI evaluation failed: ${error.message || error.toString()}`);
  }
};

/**
 * Generate a hint from an image
 * @param {string} question - The question text
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimeType - The MIME type of the image
 * @returns {Promise<{title: string, explanation: string, nextSteps: string[]}>}
 */
export const generateHintFromImage = async (question, imageBuffer, mimeType = 'image/png') => {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  const model = getModel();
  const base64Data = imageBuffer.toString('base64');

  const prompt = `You are an expert math and science tutor providing hints to help a student solve a problem.

Question: ${question}

The student has started working on this problem (shown in the image). Provide a helpful hint that:
1. Guides them in the right direction without giving away the answer
2. Points out what they might be missing or what approach to consider
3. Is encouraging and constructive

Respond in JSON format with this structure:
{
  "title": "Hint",
  "explanation": "Helpful hint text",
  "nextSteps": ["step1", "step2", ...]
}`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    });

    const responseText = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim();

    if (!responseText) {
      throw new Error('No response from AI model');
    }

    // Try to parse JSON from the response
    let hintData;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       responseText.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      hintData = JSON.parse(jsonString);
    } catch (parseError) {
      logger.warn('Failed to parse JSON from AI hint response, using raw text', parseError);
      hintData = {
        title: 'Hint',
        explanation: responseText,
        nextSteps: [],
      };
    }

    return {
      title: hintData.title || 'Hint',
      explanation: hintData.explanation || responseText || 'No hint available',
      nextSteps: Array.isArray(hintData.nextSteps) ? hintData.nextSteps : [],
    };
  } catch (error) {
    logger.error('AI hint generation failed', error);
    throw new Error(`Hint generation failed: ${error.message || error.toString()}`);
  }
};

