import { GoogleGenerativeAI } from '@google/generative-ai';

let generativeModel;

const buildModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in env/.env');
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

const getModel = () => {
  if (!generativeModel) {
    generativeModel = buildModel();
  }
  return generativeModel;
};

export const extractQuestionFromImage = async (buffer, mimeType = 'image/jpeg') => {
  if (!buffer || !buffer.length) {
    throw new Error('Empty image buffer provided');
  }

  const base64Data = buffer.toString('base64');
  const model = getModel();

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'You are an OCR assistant that specializes in handwritten and typeset mathematical content. ' +
                'Extract ALL text from this image, preserving mathematical notation, equations, and line breaks. ' +
                'This may include questions, solutions, steps, or any mathematical expressions. ' +
                'Preserve the exact structure and formatting. Use LaTeX notation for mathematical symbols. ' +
                'Do not add commentary—return only the extracted text exactly as it appears.',
            },
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
        temperature: 0,
        maxOutputTokens: 4096, // Increased to handle longer solutions
      },
    });

    const text = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim();

    return text ?? '';
  } catch (error) {
    const message = error.message || error.toString();
    throw new Error(`Gemini Vision error: ${message}`);
  }
};
