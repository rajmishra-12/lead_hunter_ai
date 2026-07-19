import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Call Google Gemini Developer API to analyze and qualify a lead posting.
 * Uses structured JSON outputs with responseSchema.
 */
export async function analyzeWithGemini(title, description = '') {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in the backend environment (.env).');
  }

  const promptText = `
You are a Lead Qualification Specialist. Analyze the following tech/software project post or job opportunity and extract structured intelligence.

Title: "${title}"
Description: "${description}"

Guidelines:
1. Poster Type: Identify who posted this (e.g. Startup Founder, Recruiter, Company, Freelancer, Student, Agency, Developer, etc.).
2. Intent: Categorize the primary intent (e.g., Buying Services, Hiring, Selling Services, Discussion, Question, Looking for Cofounder, etc.).
3. Potential Client: Set "Yes" ONLY if the poster is a prospective client hiring or looking to pay for custom software development/app building services (contract, freelance, or full-time client). Set "No" if they are offering their own services, looking for equity-only partnerships, or asking general learning questions.
4. Hiring Score: Give a score 0-100 indicating how high-value the buying intent is. Immediate freelance contract = 90-100, full-time job = 70-89, cofounder search = 30-50, general question = 0-20.
5. Budget: Extract numerical value of the project budget in USD. If they specify an hourly rate, estimate as (avg hourly rate * 80 hours). Return 0 if not mentioned, unpaid, or equity-only.
6. Urgency: 'High' (ASAP, urgent, this week), 'Medium' (soon, next month), 'Low' (no rush, general).
7. Required Skills: List technologies/frameworks mentioned (e.g. 'Flutter', 'React Native', 'Node.js', 'Firebase').
8. Summary: Generate a 1-2 sentence description of the lead.
9. Classification Reason: Explain your reasoning behind these classification values.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          posterType: {
            type: 'STRING',
            enum: ['Startup Founder', 'Company', 'Agency', 'Recruiter', 'Freelancer', 'Student', 'Open Source Maintainer', 'Developer', 'Client', 'Other'],
            description: 'Type of poster, e.g. Startup Founder, Company, Recruiter, Freelancer, Developer, Student.'
          },
          intent: {
            type: 'STRING',
            enum: ['Buying Services', 'Selling Services', 'Hiring', 'Looking for Cofounder', 'Discussion', 'Question', 'Tutorial', 'Showcase', 'Networking', 'Other'],
            description: 'The primary intent of the post, e.g. Buying Services, Selling Services, Hiring, Question.'
          },
          potentialClient: {
            type: 'STRING',
            enum: ['Yes', 'No'],
            description: 'Set Yes if they are looking to buy or hire development services. Otherwise No.'
          },
          hiringScore: {
            type: 'INTEGER',
            description: 'Lead score from 0 to 100.'
          },
          budget: {
            type: 'NUMBER',
            description: 'Numerical budget value in USD. Return 0 if flexible or not mentioned.'
          },
          urgency: {
            type: 'STRING',
            enum: ['Low', 'Medium', 'High'],
            description: 'Urgency of the hire.'
          },
          requiredSkills: {
            type: 'ARRAY',
            items: {
              type: 'STRING'
            },
            description: 'List of framework and programming languages required.'
          },
          summary: {
            type: 'STRING',
            description: 'Short 1-2 sentence summary of the opportunity.'
          },
          classificationReason: {
            type: 'STRING',
            description: 'Brief justification of classifications.'
          }
        },
        required: [
          'posterType',
          'intent',
          'potentialClient',
          'hiringScore',
          'budget',
          'urgency',
          'requiredSkills',
          'summary',
          'classificationReason'
        ]
      }
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts[0]
    ) {
      const textResponse = response.data.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(textResponse);
      logger.info(`Gemini analysis success for: "${title.substring(0, 40)}..."`);
      return parsedJson;
    } else {
      throw new Error('Malformed response from Gemini API');
    }
  } catch (err) {
    logger.error(`Gemini API call failed: ${err.message}`);
    throw err;
  }
}
