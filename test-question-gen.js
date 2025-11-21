import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const testQuestionGeneration = async () => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not found in .env');
        }

        console.log('🔑 Using API key ending in:', apiKey.slice(-4));

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        console.log('🤖 Using model:', modelName);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Generate a single multiple-choice question for a student.

Context:
- Class Level: Class 10
- Subject: Mathematics
- Curriculum: Cambridge IGCSE
- Topic: Algebra
- Subtopic: Expanding brackets

Requirements:
1. The question should be challenging but appropriate for the class level.
2. Provide 4 options (A, B, C, D).
3. Mark the correct option.
4. Provide a detailed explanation for the correct answer.
5. Return ONLY valid JSON, no markdown, no code blocks, no additional text.

JSON Format (return exactly this structure):
{
  "questionText": "The actual question text",
  "options": [
    { "id": "a", "text": "Option A text", "isCorrect": false },
    { "id": "b", "text": "Option B text", "isCorrect": true },
    { "id": "c", "text": "Option C text", "isCorrect": false },
    { "id": "d", "text": "Option D text", "isCorrect": false }
  ],
  "explanation": "Detailed explanation here",
  "difficulty": "Medium",
  "topic": "Algebra",
  "subtopic": "Expanding brackets"
}`;

        console.log('📤 Sending request to Gemini...');

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        console.log('✅ Got response from Gemini');
        console.log('📊 Result structure:', Object.keys(result));
        console.log('📊 Response structure:', Object.keys(result.response));

        const responseText = result.response.text();
        console.log('📝 Raw response length:', responseText.length);
        console.log('📝 Raw response (first 500 chars):', responseText.substring(0, 500));

        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        console.log('🧹 Cleaned response (first 500 chars):', cleaned.substring(0, 500));

        const questionData = JSON.parse(cleaned);
        console.log('✅ Successfully parsed JSON');
        console.log('📝 Question:', questionData.questionText);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
};

testQuestionGeneration();
