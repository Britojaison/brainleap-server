import { GoogleGenerativeAI } from '@google/generative-ai';

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

export const extractTextFromImage = async (imageBase64, mimeType) => {
  const model = getModel();
  // Logic to extract text would go here, but for now we just return the model or implement basic OCR if needed.
  // Assuming this function was meant to return the model or do something else.
  // Based on usage in extractQuestionFromImage, we need getModel to be available.
  return model;
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
                'You are an OCR assistant that specializes in handwritten and typeset math/science questions. ' +
                'Extract the exact question text from this image, preserving notation and line breaks. ' +
                'Do not add commentary—return only the question text.',
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
        maxOutputTokens: 1024,
      },
    });

    const text = result.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim();

    return text ?? '';
  } catch (error) {
    const message = error.message || error.toString();
    throw new Error(`Gemini Vision error: ${message} `);
  }
};
