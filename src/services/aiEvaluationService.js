import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';

let genAI;
let model;

const initializeGemini = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured in environment variables.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  if (!model) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    model = genAI.getGenerativeModel({ model: modelName });
  }
};

export const evaluateCanvasImage = async (question, imageBuffer, mimeType = 'image/png') => {
  try {
    initializeGemini();

    const base64Data = imageBuffer.toString('base64');

    const prompt = `You are an expert mathematics tutor analyzing a student's handwritten work from a digital whiteboard.

QUESTION: ${question}

INSTRUCTIONS:
1. Look at the attached image carefully - it contains handwritten mathematical work (numbers, equations, calculations, diagrams)
2. The writing may be in pen/pencil strokes on a white background
3. Determine if the student's answer is CORRECT or INCORRECT
4. Provide brief feedback

RESPONSE FORMAT - You MUST respond in this exact format:

RESULT: [CORRECT or INCORRECT or BLANK]
FEEDBACK: [One sentence of feedback]

Examples:
- If correct: "RESULT: CORRECT\nFEEDBACK: Perfect! Your solution is accurate."
- If incorrect: "RESULT: INCORRECT\nFEEDBACK: The answer is not quite right. Check your calculations."
- If blank: "RESULT: BLANK\nFEEDBACK: I cannot see any mathematical work on the whiteboard."

IMPORTANT: 
- Start your response with "RESULT:" followed by exactly one of: CORRECT, INCORRECT, or BLANK
- Keep feedback to 1-2 sentences maximum
- Be specific but concise`;

    logger.info(`Sending image to Gemini Vision API - Size: ${imageBuffer.length} bytes, MIME: ${mimeType}`);

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    logger.info(`Gemini API call completed`);

    const response = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    logger.info(`Gemini Vision raw response: ${response?.substring(0, 200)}...`);

    if (!response) {
      throw new Error('No response from Gemini Vision evaluation service');
    }

    // Parse the response to extract structured information
    const { title, explanation, nextSteps, isCorrect, isBlank } = parseVisionEvaluationResponse(response);

    logger.info(`Parsed evaluation - Title: ${title}, isCorrect: ${isCorrect}, isBlank: ${isBlank}`);

    return {
      title,
      explanation,
      nextSteps,
      isCorrect,
      isBlank,
    };
  } catch (error) {
    const message = error.message || error.toString();
    logger.error(`Gemini Vision evaluation error: ${message}`);
    throw new Error(`Vision evaluation failed: ${message}`);
  }
};

const parseVisionEvaluationResponse = (response) => {
  // Parse the new format: RESULT: [CORRECT/INCORRECT/BLANK]
  let isCorrect = false;
  let isBlank = false;
  let feedback = '';

  logger.info(`Parsing Gemini response: ${response}`);

  // Extract RESULT
  const resultMatch = response.match(/RESULT:\s*(CORRECT|INCORRECT|BLANK)/i);
  if (resultMatch) {
    const result = resultMatch[1].toUpperCase();
    isCorrect = result === 'CORRECT';
    isBlank = result === 'BLANK';
    logger.info(`Extracted RESULT: ${result}, isCorrect: ${isCorrect}, isBlank: ${isBlank}`);
  } else {
    logger.warn('Could not find RESULT in response');
  }

  // Extract FEEDBACK
  const feedbackMatch = response.match(/FEEDBACK:\s*(.+?)$/is);
  if (feedbackMatch) {
    feedback = feedbackMatch[1].trim();
    logger.info(`Extracted FEEDBACK: ${feedback.substring(0, 100)}...`);
  } else {
    logger.warn('Could not find FEEDBACK in response');
  }

  // Fallback if parsing failed
  if (!resultMatch || !feedbackMatch) {
    logger.warn('Failed to parse Gemini response in expected format, using fallback');
    feedback = response;
    // Try to infer from keywords
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('correct') || lowerResponse.includes('perfect') || lowerResponse.includes('right')) {
      isCorrect = true;
    } else if (lowerResponse.includes('blank') || lowerResponse.includes('cannot see')) {
      isBlank = true;
    }
  }

  return {
    title: isCorrect ? 'Correct' : (isBlank ? 'Blank' : 'Incorrect'),
    explanation: feedback,
    nextSteps: [],
    isCorrect,
    isBlank,
  };
};

export const evaluateCanvasAnswer = async (question, canvasState) => {
  try {
    initializeGemini();

    // Convert canvas state to a description for Gemini
    const canvasDescription = describeCanvasState(canvasState);

    const prompt = `You are an expert mathematics tutor. A student has submitted work on a digital whiteboard for this question:

QUESTION: ${question}

CANVAS ANALYSIS: ${canvasDescription}

**IMPORTANT**: You cannot see the actual mathematical symbols or equations the student wrote. You only have the stroke pattern analysis above.

Based on the question and the canvas analysis, provide a BRIEF evaluation (2-3 sentences max) that:

1. Acknowledges what work the student appears to have done
2. Gives general feedback on the approach
3. Suggests what they should check or improve

Keep it very concise - students want quick feedback, not long explanations.

Example format:
"Based on your work, it looks like you've made a good start on this problem. Check that you've shown all the steps clearly. Consider double-checking your calculations for any arithmetic errors."

Do NOT try to guess specific answers or mathematical content - you can't see what they actually wrote!`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!response) {
      throw new Error('No response from Gemini evaluation service');
    }

    // Parse the natural language response into structured format
    const { title, explanation, nextSteps } = parseEvaluationResponse(response);

    return {
      title,
      explanation,
      nextSteps,
    };
  } catch (error) {
    const message = error.message || error.toString();
    logger.error(`Gemini evaluation error: ${message}`);
    throw new Error(`Evaluation failed: ${message}`);
  }
};

const parseEvaluationResponse = (response) => {
  // For the simplified format, the entire response is the explanation
  // Extract a brief title from the first sentence
  const firstSentence = response.split('.')[0].trim();
  const title = firstSentence.length > 50
    ? 'Feedback Received'
    : firstSentence;

  // Clean up the response and remove any extra formatting
  const explanation = response
    .replace(/^["']|["']$/g, '') // Remove quotes
    .trim();

  // For this simplified approach, we won't extract separate nextSteps
  // The feedback is concise enough to be in the explanation
  return {
    title: 'AI Feedback',
    explanation,
    nextSteps: [],
  };
};

const describeCanvasState = (canvasState) => {
  try {
    if (typeof canvasState === 'string') {
      canvasState = JSON.parse(canvasState);
    }

    if (!canvasState || typeof canvasState !== 'object') {
      return 'The whiteboard appears to be empty - no mathematical work or solution has been written.';
    }

    // Check if it's our drawing format with strokes
    if (canvasState.strokes && Array.isArray(canvasState.strokes)) {
      const strokes = canvasState.strokes.filter(stroke => stroke && typeof stroke === 'object');

      if (strokes.length === 0) {
        return 'The whiteboard is completely blank. The student has not written any solution or work.';
      }

      // Analyze the strokes
      const drawingStrokes = strokes.filter(stroke => !stroke.isEraser);
      const eraserStrokes = strokes.filter(stroke => stroke.isEraser);

      let description = '';

      if (drawingStrokes.length === 0) {
        return 'The whiteboard contains only eraser marks. Any previous work has been completely erased.';
      }

      // Count total points to estimate complexity
      const totalPoints = drawingStrokes.reduce((sum, stroke) => sum + (stroke.points?.length || 0), 0);

      if (totalPoints < 10) {
        description += 'The student has made minimal marks on the whiteboard, possibly just a few scribbles or test strokes.';
      } else if (totalPoints < 50) {
        description += 'The student has written a brief solution with some mathematical symbols or short calculations.';
      } else if (totalPoints < 200) {
        description += 'The student has written a moderate amount of work, likely including several steps or calculations.';
      } else {
        description += 'The student has written an extensive solution with detailed mathematical work, calculations, and possibly multiple approaches.';
      }

      if (eraserStrokes.length > 0) {
        description += ` The work shows ${eraserStrokes.length} erasure(s), indicating the student made corrections or revisions.`;
      }

      // Try to infer content type based on stroke patterns
      const avgPointsPerStroke = totalPoints / drawingStrokes.length;
      if (avgPointsPerStroke > 20) {
        description += ' The writing appears to be in longer strokes, possibly containing mathematical expressions, equations, or detailed explanations.';
      } else {
        description += ' The writing consists of shorter strokes, possibly containing numbers, symbols, or brief notations.';
      }

      description += '\n\nPlease analyze this handwritten mathematical work carefully. Look for mathematical symbols, equations, calculations, and the logical flow of the solution.';

      return description;
    }

    // Fallback for other formats
    return `The canvas contains drawing data in the following format: ${JSON.stringify(canvasState, null, 2)}. Please analyze this as handwritten mathematical work.`;
  } catch (error) {
    logger.error(`Error describing canvas state: ${error.message}`);
    return 'Unable to analyze the canvas content due to technical issues. Please evaluate based on the question alone.';
  }
};
