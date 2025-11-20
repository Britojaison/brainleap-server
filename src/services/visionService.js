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
    // STEP 1: Extract raw text from image
    console.log('\n=== STEP 1: EXTRACTING TEXT FROM IMAGE ===');
    const extractResult = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Extract ALL text from this image. Use LaTeX notation ($...$) for math. Just extract the text as you see it.',
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
        maxOutputTokens: 4096,
      },
    });

    let rawText = extractResult.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    console.log('📝 Raw extracted text:');
    console.log('---START---');
    console.log(rawText);
    console.log('---END---');

    if (!rawText) {
      return '';
    }

    // STEP 2: Ask Gemini to reformat it as a proper solution
    console.log('\n=== STEP 2: REFORMATTING AS SOLUTION ===');
    const formatResult = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Reformat this math solution text with proper line breaks. Each line should be on a NEW LINE.\n\n' +
                'INPUT TEXT:\n' +
                rawText +
                '\n\n' +
                'REFORMATTING RULES:\n' +
                '• Put EACH statement on its OWN line\n' +
                '• Put EACH equation on its OWN line\n' +
                '• Add blank lines between sections\n' +
                '• Keep LaTeX: $...$\n' +
                '• Output should look like a SOLUTION, not a paragraph\n\n' +
                'EXAMPLE INPUT:\n' +
                '"Given a=2 b=3 Therefore D=b^2-4ac=9-8=1 Hence real roots"\n\n' +
                'EXAMPLE OUTPUT (each line separate):\n' +
                'Given $a=2$, $b=3$\n\nTherefore $D = b^2 - 4ac$\n$= 9 - 8$\n$= 1$\n\nHence real roots\n\n' +
                '⚠️ IMPORTANT: Actually press ENTER after each line. Do NOT write "\\n" - actually create new lines!\n\n' +
                'Now reformat the INPUT TEXT above (remember: actual line breaks, not \\n):',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    let formattedText = formatResult.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    console.log('📝 Formatted text (raw):');
    console.log('---START---');
    console.log(formattedText);
    console.log('---END---');
    console.log('📝 Line breaks found:', (formattedText?.match(/\n/g) || []).length);
    
    // Check if Gemini returned literal \n instead of actual newlines
    if (formattedText && formattedText.includes('\\n') && !formattedText.includes('\n')) {
      console.log('⚠️ Detected literal \\n - converting to actual newlines');
      formattedText = formattedText.replace(/\\n/g, '\n');
    }
    
    console.log('📝 Final line breaks:', (formattedText?.match(/\n/g) || []).length);
    console.log('==============================\n');

    return formattedText ?? rawText ?? '';
  } catch (error) {
    const message = error.message || error.toString();
    throw new Error(`Gemini Vision error: ${message} `);
  }
};
