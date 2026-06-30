import openai from '../config/openai.js';

// Model is configurable so the same code works with OpenAI (gpt-4o-mini) or any
// OpenAI-compatible provider (e.g. Google Gemini: gemini-2.0-flash).
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// When MOCK_AI=true, return canned responses without calling any provider.
// Lets you build/demo the full flow with no API key, quota, or rate limits.
const MOCK = process.env.MOCK_AI === 'true';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Throw a clean 503 for quota/rate-limit errors so the API responds nicely. */
const rateLimitError = () => {
  const err = new Error(
    'The AI provider is rate-limiting or out of quota. Please wait a moment and try again, ' +
      'or switch provider/model (or set MOCK_AI=true for offline development).'
  );
  err.statusCode = 503;
  return err;
};

/**
 * Strip markdown code fences and parse JSON from a model response.
 * Throws a descriptive error if the content is not valid JSON.
 */
const parseJson = (content) => {
  if (!content) throw new Error('AI returned an empty response');

  let cleaned = content.trim();

  // Remove ```json ... ``` or ``` ... ``` fences if the model added them.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Last resort: extract the first {...} or [...] block.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse AI JSON response: ${err.message}`);
  }
};

/**
 * Call the chat completion endpoint and return the raw message content.
 * Retries transient 429 / 5xx errors with exponential backoff; surfaces a
 * clean 503 if the provider is still rate-limited after retries.
 */
const complete = async ({ system, user, temperature = 0.7 }) => {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return response.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      const status = err?.status;
      const retriable = status === 429 || (status >= 500 && status < 600);

      if (!retriable || attempt === maxRetries) {
        if (status === 429) throw rateLimitError();
        throw err;
      }

      // Respect Retry-After when present, else exponential backoff (1s, 2s, 4s).
      const retryAfter = Number(err?.headers?.['retry-after']);
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(8000, 1000 * 2 ** attempt);
      console.warn(`[AI] ${status} from provider; retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Unreachable, but keeps the function total.
  throw rateLimitError();
};

/**
 * (a) Parse raw resume text into structured data.
 * @param {string} text
 * @returns {Promise<{skills:string[], experience:object[], education:object[], summary:string}>}
 */
export const parseResume = async (text) => {
  if (MOCK) {
    return {
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      experience: [
        { title: 'Software Engineer', company: 'Acme Corp', duration: '2021–2024', description: 'Built full-stack web apps.' },
      ],
      education: [{ degree: 'B.S. Computer Science', institution: 'State University', year: '2021' }],
      summary: 'Full-stack engineer with experience across the MERN stack.',
    };
  }

  const system =
    'You are a resume parser. Return ONLY valid JSON, no markdown, no explanation.';
  const user =
    'Parse this resume and extract: { skills: [string], experience: [{title, company, duration, description}], education: [{degree, institution, year}], summary: string }\n\n' +
    `Resume:\n${text}`;

  const content = await complete({ system, user, temperature: 0.2 });
  return parseJson(content);
};

/**
 * (b) Generate interview questions tailored to the resume + role.
 * @returns {Promise<Array<{questionText, category, difficulty, expectedKeyPoints:string[], timeRecommended:number}>>}
 */
export const generateInterviewQuestions = async (
  resumeData,
  jobRole,
  difficulty,
  count = 10
) => {
  if (MOCK) {
    const cats = ['technical', 'behavioral', 'situational'];
    return Array.from({ length: count }, (_, i) => ({
      questionText: `Sample ${difficulty} ${jobRole} question #${i + 1}?`,
      category: cats[i % 3],
      difficulty,
      expectedKeyPoints: ['key point A', 'key point B'],
      timeRecommended: 120,
    }));
  }

  const skills = Array.isArray(resumeData?.skills)
    ? resumeData.skills.join(', ')
    : String(resumeData?.skills || '');

  const system =
    'You are a senior technical interviewer. Return ONLY a valid JSON array, no markdown.';
  const user =
    `Generate exactly ${count} questions for a ${difficulty} ${jobRole} interview ` +
    `based on these skills: ${skills}. ` +
    'Mix: 40% technical, 30% behavioral, 30% situational. ' +
    'Each item must be: { questionText, category, difficulty, expectedKeyPoints: [string], timeRecommended } ' +
    'where category is one of technical|behavioral|situational, difficulty is one of easy|medium|hard, ' +
    'and timeRecommended is seconds between 60 and 180.';

  const content = await complete({ system, user, temperature: 0.8 });
  return parseJson(content);
};

/**
 * (c) Score a single answer.
 * @returns {Promise<{score:number, feedback:string, strengths:string[], improvements:string[], exampleAnswer:string}>}
 */
export const scoreAnswer = async (question, userAnswer, skills) => {
  if (MOCK) {
    return {
      score: 78,
      feedback: 'Solid answer covering the main points; strengthen it with a concrete example.',
      strengths: ['Clear structure', 'Relevant terminology'],
      improvements: ['Add specifics', 'Mention trade-offs'],
      exampleAnswer: 'A strong answer walks through the approach step by step with a real example.',
    };
  }

  const skillsStr = Array.isArray(skills) ? skills.join(', ') : String(skills || '');

  const system = 'You are an interview evaluator. Return ONLY valid JSON.';
  const user =
    'Evaluate the candidate answer and return: ' +
    '{ score (0-100), feedback (string), strengths: [string], improvements: [string], exampleAnswer (string) }\n\n' +
    `Candidate skills: ${skillsStr}\n` +
    `Question: ${typeof question === 'string' ? question : question?.questionText}\n` +
    `Answer: ${userAnswer}`;

  const content = await complete({ system, user, temperature: 0.3 });
  return parseJson(content);
};

/**
 * (d) Generate an overall session summary from answered questions.
 * @returns {Promise<object>}
 */
export const generateSessionSummary = async (questionsArray, jobRole) => {
  if (MOCK) {
    const scores = (questionsArray || [])
      .map((q) => q.aiScore)
      .filter((s) => typeof s === 'number');
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 75;
    return {
      overallScore: avg,
      summary: `Overall a solid ${jobRole} interview with room to deepen technical detail.`,
      strengths: ['Communication', 'Structured answers'],
      weaknesses: ['Depth on edge cases'],
      recommendations: ['Practice system design', 'Review core fundamentals'],
      skillsAnalysis: { technical: 75, communication: 82, problemSolving: 70, behavioral: 80, domainKnowledge: 68 },
    };
  }

  const condensed = (questionsArray || []).map((q) => ({
    questionText: q.questionText,
    category: q.category,
    userAnswer: q.userAnswer,
    aiScore: q.aiScore,
  }));

  const system = 'You are an interview coach. Return ONLY valid JSON.';
  const user =
    `Based on this ${jobRole} interview, return: ` +
    '{ overallScore (avg of scores), summary (string), strengths: [string], weaknesses: [string], ' +
    'recommendations: [string], skillsAnalysis: { technical: 0-100, communication: 0-100, ' +
    'problemSolving: 0-100, behavioral: 0-100, domainKnowledge: 0-100 } }\n\n' +
    `Questions and answers (JSON):\n${JSON.stringify(condensed)}`;

  const content = await complete({ system, user, temperature: 0.4 });
  return parseJson(content);
};

export default {
  parseResume,
  generateInterviewQuestions,
  scoreAnswer,
  generateSessionSummary,
};
