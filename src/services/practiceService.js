import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '../config/database.js';
import { logger } from '../config/logger.js';

export const submitPracticeAttempt = async ({ userId, question, canvas }) => {
  const timestamp = new Date().toISOString();

  if (process.env.MOCK_AUTH === 'true') {
    return {
      id: `mock-${timestamp}`,
      question,
      canvas,
      created_at: timestamp,
    };
  }

  const client = getClient();
  const payload = {
    user_id: userId,
    question,
    canvas,
    created_at: timestamp,
  };

  const { data, error } = await client
    .from('practice_attempts')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data;
};

const sanitizeGeminiResponse = (rawResponse) => {
  if (!rawResponse) {
    return '';
  }

  const withoutCodeFences = rawResponse.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const jsonMatch = withoutCodeFences.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return withoutCodeFences.trim();
};

export const generatePracticeQuestion = async ({
  classLevel,
  subject,
  curriculum,
  topic,
  subtopics,
  subtopic,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `Generate a single question for a student.

  Context:
  - Class Level: ${classLevel}
  - Subject: ${subject}
  - Curriculum: ${curriculum}
  - Topic: ${topic}
  - Subtopic: ${subtopic || subtopics?.[0] || 'General'}

  Requirements:
  1. The question should be challenging but appropriate for the class level.
  2. Randomly select a question type from: Multiple Choice, Short Answer, Problem Solving, True/False.
  3. If the type is Multiple Choice, provide 4 options (A, B, C, D) and mark the correct one.
  4. Provide a detailed explanation for the correct answer.
  5. Return ONLY valid JSON, no markdown, no code blocks, no additional text.

  JSON Format (return exactly this structure):
  {
    "questionText": "The actual question text",
    "type": "multiple-choice" | "short-answer" | "problem-solving" | "true-false",
    "options": [
      { "id": "a", "text": "Option A text", "isCorrect": false },
      { "id": "b", "text": "Option B text", "isCorrect": true },
      { "id": "c", "text": "Option C text", "isCorrect": false },
      { "id": "d", "text": "Option D text", "isCorrect": false }
    ],
    "explanation": "Detailed explanation here",
    "difficulty": "Medium",
    "topic": "${topic}",
    "subtopic": "${subtopic || subtopics?.[0] || 'General'}"
  }`;


  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  console.log('📊 Gemini API result:', JSON.stringify(result, null, 2).substring(0, 500));

  const responseText = result.response.text();
  console.log('📝 Raw response text:', responseText);

  const cleanedResponse = sanitizeGeminiResponse(responseText);
  console.log('🧹 Cleaned response text:', cleanedResponse);

  if (!cleanedResponse || cleanedResponse.length === 0) {
    throw new Error('Gemini returned an empty response');
  }

  let questionData;

  try {
    questionData = JSON.parse(cleanedResponse);
  } catch (error) {
    logger.error('Failed to parse Gemini response', {
      error: error.message,
      snippet: cleanedResponse.substring(0, 500),
    });
    throw new Error('Gemini returned invalid JSON');
  }

  // Ensure optional fields exist
  const normalized = {
    id: `gen-${Date.now()}`,
    questionText: questionData.questionText ?? questionData.question ?? '',
    type: questionData.type ?? null,
    options: Array.isArray(questionData.options) ? questionData.options : [],
    explanation: questionData.explanation ?? '',
    difficulty: questionData.difficulty ?? 'Medium',
    topic: questionData.topic ?? topic,
    subtopic: questionData.subtopic ?? (subtopic || subtopics?.[0] || 'General'),
    generatedAt: new Date().toISOString(),
  };

  return normalized;
};
