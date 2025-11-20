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
    logger.info(`✅ Gemini AI initialized with API key`);
  }
  if (!model) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    model = genAI.getGenerativeModel({ 
      model: modelName,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    });
    logger.info(`✅ Gemini model initialized: ${modelName}`);
  }
};

export const generateHintFromImage = async (question, imageBuffer, mimeType = 'image/png', canvasText = null) => {
  try {
    initializeGemini();

    const base64Data = imageBuffer.toString('base64');
    
    logger.info(`=== HINT REQUEST ===`);
    logger.info(`Question: ${question.substring(0, 100)}`);
    logger.info(`Image size: ${imageBuffer.length} bytes`);
    logger.info(`Base64 length: ${base64Data.length}`);
    logger.info(`Canvas text: ${canvasText ? 'YES' : 'NO'}`);
    if (canvasText) {
      logger.info(`Canvas text content (first 200 chars): ${canvasText.substring(0, 200)}`);
    }
    logger.info(`==================`);

    let prompt = `You are a supportive math tutor. A student is working on this problem and needs guidance.

⚠️ READ THE PROBLEM CAREFULLY - Understand what is being asked before analyzing the solution!

PROBLEM/QUESTION: ${question}

WHAT IS THE STUDENT ASKED TO DO?
- Read the problem above carefully
- Understand the specific task (solve, prove, simplify, find, etc.)
- Check if the student completed THAT SPECIFIC TASK
`;

    if (canvasText && canvasText.trim().length > 0) {
      prompt += `
STUDENT'S WRITTEN SOLUTION (extracted text from canvas):
${canvasText}

ANALYSIS STEPS:
1. READ THE PROBLEM: What is the student asked to do? (solve? prove? simplify? find?)
2. READ THE SOLUTION: Look at BOTH the whiteboard image AND the extracted text above
3. CHECK COMPLETION: Did the student complete the SPECIFIC task asked in the problem?
   - If the problem asks to "prove" → Did they provide a proof?
   - If the problem asks to "solve" → Did they find the solution?
   - If the problem asks to "simplify" → Did they simplify it?
   - If the problem asks to "find" → Did they find the answer?
4. VERIFY CORRECTNESS: Is their work correct for the SPECIFIC task?
5. RESPOND:
   - If COMPLETE & CORRECT for the task → Say "Perfect!" or "Solution complete!"
   - If INCOMPLETE or WRONG TASK → Provide guidance
`;
    } else {
      prompt += `
Look at their whiteboard work in the image.

ANALYSIS STEPS:
1. READ THE PROBLEM: What is the student asked to do?
2. READ THE SOLUTION: What did they write on the whiteboard?
3. CHECK COMPLETION: Did they complete the SPECIFIC task asked?
4. VERIFY CORRECTNESS: Is their work correct?
5. RESPOND:
   - If COMPLETE & CORRECT → Say "Perfect!" or "Solution complete!"
   - If INCOMPLETE → Provide guidance
`;
    }

    prompt += `
YOUR RESPONSE FORMAT (be concise):

TITLE: [Based on completion status]
- If COMPLETE & CORRECT: "Perfect solution!" or "Excellent work!"
- If INCOMPLETE: "Almost there!" or "Good progress!"
- If JUST STARTED: "Good start!"
- If BLANK: "Let's begin!"

HINT: [2-3 sentences]
- If COMPLETE: Praise their work and confirm it's correct
- If INCOMPLETE: What they did right + what's missing
- If BLANK: How to start

NEXT_STEP: [One action]
- If COMPLETE: "Solution complete! Well done."
- If INCOMPLETE: Specific next step
- If BLANK: First step to take

⚠️ CRITICAL: READ THE PROBLEM FIRST! Understand what task is being asked (solve, prove, simplify, find, etc.) before evaluating the solution!

EXAMPLES OF COMPLETE SOLUTIONS (say "Perfect!" for these):

Problem: "Solve 2x + 5 = 13" (Task: SOLVE for x)
Student: "2x + 5 = 13, 2x = 8, x = 4" ✓ COMPLETE - Found x
TITLE: Perfect solution!
HINT: Excellent work! You correctly isolated the variable by subtracting 5 from both sides, then divided by 2 to get the final answer x = 4. Your solution is complete and correct.
NEXT_STEP: Solution complete! You can move on to the next problem.

Problem: "Prove that x² - 4 = (x+2)(x-2) is a quadratic equation" (Task: PROVE it's quadratic)
Student: "x² - 4 = (x+2)(x-2), Expanding: x² + 2x - 2x - 4 = x² - 4, This is quadratic because highest power is 2" ✓ COMPLETE - Proved it's quadratic
TITLE: Perfect proof!
HINT: Excellent! You correctly expanded the expression and identified that it's quadratic because the highest power of x is 2. Your proof is complete and correct.
NEXT_STEP: Solution complete! Well done.

Problem: "Show that 2x² + 3x - 5 is a quadratic equation" (Task: SHOW/PROVE it's quadratic)
Student: "2x² + 3x - 5, Highest degree = 2, Form: ax² + bx + c where a=2, b=3, c=-5, Therefore it's quadratic" ✓ COMPLETE - Showed it's quadratic
TITLE: Perfect!
HINT: Correct! You identified the standard quadratic form ax² + bx + c and confirmed the highest degree is 2. Your explanation is complete.
NEXT_STEP: Solution complete!

Problem: "Find area of circle, radius = 5" (Task: FIND area)
Student: "A = πr², A = π(5)², A = 25π ≈ 78.54" ✓ COMPLETE - Found area
TITLE: Perfect solution!
HINT: Outstanding! You used the correct formula A = πr², substituted r = 5, calculated 5² = 25, and found the final answer 25π ≈ 78.54. Your work shows all the necessary steps clearly.
NEXT_STEP: Solution complete! Well done.

Problem: "Simplify: 3x + 2x" (Task: SIMPLIFY)
Student: "3x + 2x = 5x" ✓ COMPLETE - Simplified
TITLE: Perfect!
HINT: Correct! You successfully combined like terms by adding the coefficients (3 + 2 = 5) while keeping the variable x. This is exactly how to simplify like terms.
NEXT_STEP: Solution complete!

EXAMPLES OF INCOMPLETE SOLUTIONS (give hints for these):

Problem: "Solve 2x + 5 = 13" (Task: SOLVE)
Student: "2x = 8" ✗ INCOMPLETE - Didn't solve for x yet
TITLE: Excellent progress!
HINT: You correctly moved 5 to the right side. Now you need to isolate x by getting rid of the coefficient 2. Dividing both sides by the same number keeps the equation balanced.
NEXT_STEP: Divide both sides by 2 to find x = 4

Problem: "Prove that x² + 3x + 2 is quadratic" (Task: PROVE)
Student: "x² + 3x + 2" ✗ INCOMPLETE - Just wrote the expression, didn't prove anything
TITLE: Let's prove it!
HINT: You've written the expression, but you need to prove it's quadratic. Show that it has the form ax² + bx + c and identify that the highest power is 2.
NEXT_STEP: Explain why this is quadratic by identifying a=1, b=3, c=2 and noting the degree is 2

Problem: "Find area of circle, radius = 5" (Task: FIND)
Student: "A = πr" ✗ INCOMPLETE - Wrong formula
TITLE: You're on the right track!
HINT: You've got the right formula started. Remember the area formula uses r squared, not just r. The exponent is important because area is two-dimensional.
NEXT_STEP: Write A = πr² and substitute r = 5

Problem: "Simplify: 3x + 2x" (Task: SIMPLIFY)
Student: Blank whiteboard ✗ NOT STARTED
TITLE: Let's get started!
HINT: These are like terms because they both have the variable x. When you have like terms, you can combine them by adding their coefficients (the numbers in front).
NEXT_STEP: Add the coefficients: 3 + 2 = 5, so the answer is 5x

DECISION RULES (FOLLOW IN ORDER):
1. READ THE PROBLEM CAREFULLY - What is the student asked to do? (solve? prove? find? simplify? show?)
2. READ THE SOLUTION - What did the student write?
3. MATCH TASK TO SOLUTION:
   - If asked to "prove/show" → Did they provide explanation/proof? ✓ Complete
   - If asked to "solve" → Did they find the variable value? ✓ Complete
   - If asked to "find" → Did they calculate the answer? ✓ Complete
   - If asked to "simplify" → Did they simplify the expression? ✓ Complete
4. CHECK CORRECTNESS - Is their work correct for the SPECIFIC task?
5. RESPOND:
   - If task is COMPLETE & CORRECT → Say "Perfect!" or "Solution complete!"
   - If task is INCOMPLETE or WRONG → Give specific hint for the actual task
   - If blank → Guide them to start the actual task
6. Keep responses brief and actionable

⚠️ COMMON MISTAKE TO AVOID: Don't assume the task is "solve for x" - READ what the problem actually asks!`;

    logger.info(`Sending hint request to Gemini Vision API`);

    // Retry logic with smarter error handling
    let result;
    let lastError;
    const maxRetries = 3; // Optimized: 3 retries is enough with paid API
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Gemini hint API attempt ${attempt}/${maxRetries}`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 45 seconds')), 45000);
        });
        
        // Race between API call and timeout
        const apiPromise = model.generateContent({
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
            temperature: 0.7,
            maxOutputTokens: 1024, // Optimized: shorter prompts need fewer tokens
            topP: 0.95,
            topK: 40,
          },
        });
        
        result = await Promise.race([apiPromise, timeoutPromise]);
        
        logger.info(`✅ Gemini hint API call succeeded on attempt ${attempt}`);
        break; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();
        logger.warn(`❌ Gemini hint API attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
        
        // Check if it's a rate limit error
        const isRateLimit = errorMsg.toLowerCase().includes('rate limit') || 
                           errorMsg.toLowerCase().includes('quota') ||
                           errorMsg.toLowerCase().includes('429');
        
        // Check if it's a timeout
        const isTimeout = errorMsg.toLowerCase().includes('timeout') ||
                         errorMsg.toLowerCase().includes('timed out');
        
        if (attempt < maxRetries) {
          // Adjust wait time based on error type
          let baseWait;
          if (isRateLimit) {
            baseWait = 2000 * Math.pow(2, attempt - 1); // Longer wait for rate limits
          } else if (isTimeout) {
            baseWait = 500 * attempt; // Shorter wait for timeouts
          } else {
            baseWait = 1000 * Math.pow(2, attempt - 1); // Standard exponential backoff
          }
          
          const jitter = Math.random() * 500;
          const waitTime = Math.min(baseWait + jitter, 10000);
          logger.info(`⏳ Waiting ${Math.round(waitTime)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          logger.error(`🚫 All ${maxRetries} attempts failed for hint generation`);
        }
      }
    }
    
    if (!result) {
      const errorMsg = lastError?.message || 'Unknown error';
      logger.error(`Final error: ${errorMsg}`);
      throw new Error(`Unable to generate hint after ${maxRetries} attempts. Please try again.`);
    }

    // Extract response text - Gemini SDK provides text() method on response
    let response = null;
    
    try {
      logger.info(`📊 Checking result structure...`);
      logger.info(`  - result exists: ${!!result}`);
      logger.info(`  - result.response exists: ${!!result?.response}`);
      logger.info(`  - result.response.text type: ${typeof result?.response?.text}`);
      logger.info(`  - result.response keys: ${result?.response ? Object.keys(result.response).join(', ') : 'none'}`);
      
      // The Gemini SDK response.text() is a method that returns the text directly
      if (result && result.response && typeof result.response.text === 'function') {
        response = result.response.text();
        logger.info(`✅ Extracted ${response?.length || 0} chars via response.text() method`);
        logger.info(`  - First 100 chars: ${response?.substring(0, 100)}`);
      } else if (result?.response?.candidates?.[0]?.content?.parts) {
        // Fallback to manual extraction
        response = result.response.candidates[0].content.parts
          .map((part) => part.text || '')
          .join('')
          .trim();
        logger.info(`✅ Extracted ${response?.length || 0} chars via candidates structure`);
      } else {
        logger.error(`❌ Unknown response structure`);
        logger.error(`Result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
        logger.error(`Response keys: ${result?.response ? Object.keys(result.response).join(', ') : 'null'}`);
        if (result?.response?.candidates) {
          logger.error(`Candidates: ${JSON.stringify(result.response.candidates, null, 2).substring(0, 500)}`);
        }
      }
      
      // Check if response was blocked by safety filters
      if (result?.response?.promptFeedback?.blockReason) {
        logger.error(`❌ Response blocked by safety filter: ${result.response.promptFeedback.blockReason}`);
        throw new Error(`Content was blocked by safety filters. Please try rephrasing your question.`);
      }
      
      // Check finish reason
      const finishReason = result?.response?.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        logger.warn(`⚠️ Response was truncated due to MAX_TOKENS. Thoughts: ${result.response.usageMetadata?.thoughtsTokenCount || 0}`);
        // Try to get partial response from parts
        if (result?.response?.candidates?.[0]?.content?.parts) {
          const partialResponse = result.response.candidates[0].content.parts
            .map((part) => part.text || '')
            .join('')
            .trim();
          if (partialResponse) {
            response = partialResponse;
            logger.info(`✅ Recovered partial response: ${partialResponse.length} chars`);
          }
        }
      }
      
    } catch (extractError) {
      logger.error(`❌ Error extracting response: ${extractError.message}`);
      logger.error(`Error stack: ${extractError.stack}`);
    }

    logger.info(`Final hint response: ${response ? response.substring(0, 200) + '...' : 'NULL'}`);

    if (!response || response.length === 0) {
      logger.error(`❌ Empty response detected after extraction`);
      const finishReason = result?.response?.candidates?.[0]?.finishReason;
      logger.error(`Finish reason: ${finishReason}`);
      logger.error(`Full result object: ${JSON.stringify(result, null, 2).substring(0, 1000)}`);
      
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('Response was cut off due to token limit. This has been logged and will be fixed. Please try again.');
      }
      throw new Error('Received empty response from AI service. Please try again.');
    }

    // Parse the hint response
    const { title, explanation, nextSteps } = parseHintResponse(response);

    return {
      title,
      explanation,
      nextSteps,
    };
  } catch (error) {
    const message = error.message || error.toString();
    logger.error(`❌ Gemini hint generation error: ${message}`);
    throw new Error(message.includes('Unable to generate hint') ? message : `Hint generation failed: ${message}`);
  }
};

const parseHintResponse = (response) => {
  let title = 'Hint';
  let hint = '';
  let nextStep = '';

  logger.info(`Parsing hint response: ${response}`);

  // Extract TITLE
  const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    logger.info(`Extracted TITLE: ${title}`);
  }

  // Extract HINT
  const hintMatch = response.match(/HINT:\s*(.+?)(?:NEXT_STEP:|$)/is);
  if (hintMatch) {
    hint = hintMatch[1].trim();
    logger.info(`Extracted HINT: ${hint.substring(0, 100)}...`);
  }

  // Extract NEXT_STEP
  const nextStepMatch = response.match(/NEXT_STEP:\s*(.+?)$/is);
  if (nextStepMatch) {
    nextStep = nextStepMatch[1].trim();
    logger.info(`Extracted NEXT_STEP: ${nextStep}`);
  }

  // Fallback if parsing failed
  if (!hint) {
    logger.warn('Failed to parse hint response, using full response');
    hint = response;
  }

  return {
    title,
    explanation: hint,
    nextSteps: nextStep ? [nextStep] : [],
  };
};

export const evaluateCanvasImage = async (question, imageBuffer, mimeType = 'image/png', canvasText = null) => {
  try {
    initializeGemini();

    const base64Data = imageBuffer.toString('base64');

    // Build prompt with canvas text if available
    let prompt = `Check this student's math work.

⚠️ READ THE PROBLEM CAREFULLY - Understand what task is being asked!

PROBLEM/QUESTION: ${question}

WHAT IS THE STUDENT ASKED TO DO?
- Read the problem carefully
- Identify the specific task (solve, prove, simplify, find, show, etc.)
`;

    if (canvasText && canvasText.trim().length > 0) {
      prompt += `
STUDENT'S WRITTEN SOLUTION (extracted text from canvas):
${canvasText}

EVALUATION STEPS:
1. READ THE PROBLEM: What specific task is asked? (solve? prove? find? simplify?)
2. READ THE SOLUTION: Look at BOTH the whiteboard image AND the extracted text above
3. CHECK IF TASK IS COMPLETE: Did they complete the SPECIFIC task asked?
4. VERIFY CORRECTNESS: Is their work correct for that task?
`;
    } else {
      prompt += `
Look at the whiteboard image.

EVALUATION STEPS:
1. READ THE PROBLEM: What specific task is asked?
2. READ THE SOLUTION: What did they write?
3. CHECK IF TASK IS COMPLETE: Did they complete the task?
4. VERIFY CORRECTNESS: Is it correct?
`;
    }

    prompt += `
FORMAT:
RESULT: [CORRECT or INCORRECT or BLANK]
FEEDBACK: [One sentence - be specific and encouraging]

IMPORTANT: Look for the FINAL ANSWER. If the student shows complete work with the correct final answer, mark as CORRECT.

EXAMPLES (Note the task type in each problem):

"Solve 2x+5=13" (Task: SOLVE) → Student: "2x+5=13, 2x=8, x=4" → RESULT: CORRECT | FEEDBACK: Perfect! You solved it correctly with clear steps.
"Solve 2x+5=13" (Task: SOLVE) → Student: "x=4" → RESULT: CORRECT | FEEDBACK: Correct answer! Consider showing your work for full credit.
"Solve 2x+5=13" (Task: SOLVE) → Student: "2x=8" → RESULT: INCORRECT | FEEDBACK: Good progress, but you need to finish by dividing both sides by 2.

"Prove x²-4 is quadratic" (Task: PROVE) → Student: "x²-4, highest power is 2, so it's quadratic" → RESULT: CORRECT | FEEDBACK: Correct! You identified the degree and proved it's quadratic.
"Prove x²-4 is quadratic" (Task: PROVE) → Student: "x²-4" → RESULT: INCORRECT | FEEDBACK: You wrote the expression but didn't prove it's quadratic. Explain why the degree makes it quadratic.

"Find area of circle r=3" (Task: FIND) → Student: "A=πr², A=π(3)², A=9π≈28.27" → RESULT: CORRECT | FEEDBACK: Excellent! Complete solution with correct formula and calculation.
"Find area of circle r=3" (Task: FIND) → Student: "28.27" → RESULT: CORRECT | FEEDBACK: Correct final answer!

"Simplify 3x+2x" (Task: SIMPLIFY) → Student: "3x+2x=5x" → RESULT: CORRECT | FEEDBACK: Perfect! You correctly combined like terms.
"Simplify 3x+2x" (Task: SIMPLIFY) → Student: "5x²" → RESULT: INCORRECT | FEEDBACK: Add coefficients without changing exponents: 3x+2x=5x.

"Calculate 7×8" (Task: CALCULATE) → Student: "56" → RESULT: CORRECT | FEEDBACK: Correct! 7×8 = 56.
"Calculate 7×8" (Task: CALCULATE) → Student: "54" → RESULT: INCORRECT | FEEDBACK: Check your multiplication - 7×8 is not 54.

Blank whiteboard → RESULT: BLANK | FEEDBACK: Write your solution so I can check it.

RULES: 
- CORRECT = has the right final answer (with or without steps shown)
- INCORRECT = wrong answer OR incomplete work without final answer
- BLANK = no work shown
- Be encouraging and specific in feedback
- One sentence only`;

    logger.info(`=== EVALUATION REQUEST ===`);
    logger.info(`Question: ${question.substring(0, 100)}`);
    logger.info(`Image size: ${imageBuffer.length} bytes, MIME: ${mimeType}`);
    logger.info(`Canvas text: ${canvasText ? 'YES' : 'NO'}`);
    if (canvasText) {
      logger.info(`Canvas text content (first 200 chars): ${canvasText.substring(0, 200)}`);
    }
    logger.info(`========================`);
    
    logger.info(`Sending image to Gemini Vision API`);

    // Retry logic with smarter error handling
    let result;
    let lastError;
    const maxRetries = 3; // Optimized: 3 retries is enough with paid API
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Gemini evaluation attempt ${attempt}/${maxRetries}`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 45 seconds')), 45000);
        });
        
        // Race between API call and timeout
        const apiPromise = model.generateContent({
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
            temperature: 0.3, // Slightly higher for more natural feedback
            maxOutputTokens: 1536, // Increased for larger canvas analysis + thinking tokens
            topP: 0.95,
            topK: 40,
          },
        });
        
        result = await Promise.race([apiPromise, timeoutPromise]);
        
        logger.info(`✅ Gemini evaluation succeeded on attempt ${attempt}`);
        break; // Success
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();
        logger.warn(`❌ Gemini evaluation attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
        
        // Check error type for smarter retry
        const isRateLimit = errorMsg.toLowerCase().includes('rate limit') || 
                           errorMsg.toLowerCase().includes('quota') ||
                           errorMsg.toLowerCase().includes('429');
        const isTimeout = errorMsg.toLowerCase().includes('timeout') ||
                         errorMsg.toLowerCase().includes('timed out');
        
        if (attempt < maxRetries) {
          let baseWait;
          if (isRateLimit) {
            baseWait = 2000 * Math.pow(2, attempt - 1);
          } else if (isTimeout) {
            baseWait = 500 * attempt;
          } else {
            baseWait = 1000 * Math.pow(2, attempt - 1);
          }
          
          const jitter = Math.random() * 500;
          const waitTime = Math.min(baseWait + jitter, 10000);
          logger.info(`⏳ Waiting ${Math.round(waitTime)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          logger.error(`🚫 All ${maxRetries} attempts failed for evaluation`);
        }
      }
    }
    
    if (!result) {
      const errorMsg = lastError?.message || 'Unknown error';
      logger.error(`Final error: ${errorMsg}`);
      throw new Error(`Unable to evaluate after ${maxRetries} attempts. Please try again.`);
    }

    logger.info(`Gemini API call completed`);

    // Extract response text - Gemini SDK provides text() method on response
    let response = null;
    
    try {
      logger.info(`📊 Checking evaluation result structure...`);
      logger.info(`  - result exists: ${!!result}`);
      logger.info(`  - result.response exists: ${!!result?.response}`);
      logger.info(`  - result.response.text type: ${typeof result?.response?.text}`);
      logger.info(`  - result.response keys: ${result?.response ? Object.keys(result.response).join(', ') : 'none'}`);
      
      // The Gemini SDK response.text() is a method that returns the text directly
      if (result && result.response && typeof result.response.text === 'function') {
        response = result.response.text();
        logger.info(`✅ Extracted ${response?.length || 0} chars via response.text() method`);
        logger.info(`  - First 100 chars: ${response?.substring(0, 100)}`);
      } else if (result?.response?.candidates?.[0]?.content?.parts) {
        // Fallback to manual extraction
        response = result.response.candidates[0].content.parts
          .map((part) => part.text || '')
          .join('')
          .trim();
        logger.info(`✅ Extracted ${response?.length || 0} chars via candidates structure`);
      } else {
        logger.error(`❌ Unknown evaluation response structure`);
        logger.error(`Result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
        logger.error(`Response keys: ${result?.response ? Object.keys(result.response).join(', ') : 'null'}`);
        if (result?.response?.candidates) {
          logger.error(`Candidates: ${JSON.stringify(result.response.candidates, null, 2).substring(0, 500)}`);
        }
      }
      
      // Check if response was blocked by safety filters
      if (result?.response?.promptFeedback?.blockReason) {
        logger.error(`❌ Evaluation response blocked by safety filter: ${result.response.promptFeedback.blockReason}`);
        throw new Error(`Content was blocked by safety filters. Please try rephrasing your question.`);
      }
      
      // Check finish reason
      const finishReason = result?.response?.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        const thoughtsUsed = result.response.usageMetadata?.thoughtsTokenCount || 0;
        logger.warn(`⚠️ Evaluation hit MAX_TOKENS. Thinking tokens used: ${thoughtsUsed}`);
        
        // Try to get partial response from parts
        if (result?.response?.candidates?.[0]?.content?.parts) {
          const partialResponse = result.response.candidates[0].content.parts
            .map((part) => part.text || '')
            .join('')
            .trim();
          if (partialResponse && partialResponse.length > 20) {
            response = partialResponse;
            logger.info(`✅ Using partial response: ${partialResponse.length} chars`);
          } else {
            // If partial response is too short or empty, provide a fallback
            logger.warn(`⚠️ Partial response too short, using fallback`);
            response = 'RESULT: INCORRECT\nFEEDBACK: Your work is extensive. Please break it into smaller steps for better feedback.';
          }
        }
      }
      
    } catch (extractError) {
      logger.error(`❌ Error extracting evaluation response: ${extractError.message}`);
      logger.error(`Error stack: ${extractError.stack}`);
    }

    logger.info(`Gemini Vision raw response: ${response ? response.substring(0, 200) + '...' : 'NULL'}`);

    if (!response || response.length === 0) {
      logger.error(`❌ Empty evaluation response after extraction`);
      const finishReason = result?.response?.candidates?.[0]?.finishReason;
      logger.error(`Finish reason: ${finishReason}`);
      logger.error(`Full result object: ${JSON.stringify(result, null, 2).substring(0, 1000)}`);
      
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('Response was cut off due to token limit. This has been logged and will be fixed. Please try again.');
      }
      throw new Error('Received empty response from AI service. Please try again.');
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
