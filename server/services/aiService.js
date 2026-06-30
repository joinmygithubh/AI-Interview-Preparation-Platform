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

// --- Mock question bank (used when MOCK_AI=true), tailored by role ---
const MOCK_TECH = {
  frontend: [
    'Explain the browser rendering pipeline and what causes layout thrashing.',
    'What is the difference between controlled and uncontrolled components in React?',
    'How would you optimize a React list rendering thousands of items?',
    'Compare CSS-in-JS with utility-first CSS like Tailwind — trade-offs?',
    'How do you make a web app accessible for keyboard and screen-reader users?',
    'Explain how the JavaScript event loop handles microtasks vs macrotasks.',
    'How would you manage global state in a large React app, and when would you avoid a store?',
    "What strategies reduce a web app's initial bundle size?",
  ],
  backend: [
    'Design a REST API for a resource with pagination, filtering, and sorting.',
    'Explain database indexing and when an index can hurt performance.',
    'How do you prevent and handle race conditions in a concurrent backend?',
    'Compare optimistic vs pessimistic locking with an example.',
    "How would you scale a service that's hitting database connection limits?",
    'Explain how JWT authentication works and its security trade-offs.',
    'When would you introduce a message queue, and what problems does it solve?',
    'How do you design idempotent APIs for retries and webhooks?',
  ],
  fullstack: [
    'Walk through what happens from a browser click to a database write and back.',
    'How do you handle authentication end to end between a SPA and an API?',
    'How would you implement optimistic UI updates with server reconciliation?',
    'Explain the caching layers from the browser down to the database.',
    'How do you keep an API contract in sync between frontend and backend?',
    'How would you implement file uploads from a React app to cloud storage?',
    'Describe your approach to error handling across the whole stack.',
    'How do you avoid N+1 query problems when an API backs a rich UI?',
  ],
  data: [
    'Design a pipeline to ingest and clean large CSV files daily.',
    'Explain supervised vs unsupervised learning with examples.',
    'How do you handle missing data and outliers before training?',
    'What is overfitting and how do you detect and prevent it?',
    'Outline a SQL approach to find the top N customers by monthly spend.',
    'How do you evaluate a classification model beyond accuracy?',
    'Explain feature scaling and when it matters.',
    'How do you productionize and monitor an ML model?',
  ],
  devops: [
    'Describe a CI/CD pipeline you would build for a Node service.',
    'How do containers differ from virtual machines, and when use each?',
    'How would you achieve zero-downtime deployments?',
    'Explain infrastructure as code and its benefits.',
    'How do you design monitoring and alerting for a production service?',
    'How would you debug a service with intermittent high latency?',
    'Explain blue-green vs canary deployments.',
    'How do you manage secrets securely across environments?',
  ],
  mobile: [
    'How do you manage state and navigation in a mobile app?',
    "Explain how you'd optimize a mobile app's startup time.",
    'How do you handle offline support and data sync?',
    'What are the trade-offs of native vs cross-platform development?',
    'How do you reduce battery and memory usage in a mobile app?',
    'How would you implement push notifications end to end?',
    'How do you handle different screen sizes and densities?',
    'How do you secure sensitive data stored on a device?',
  ],
  general: [
    'Walk me through how you would design a URL shortener.',
    'Explain the difference between processes and threads.',
    'How do you approach debugging a production incident?',
    'What are the SOLID principles and why do they matter?',
    'How would you design a rate limiter?',
    "Explain Big-O and analyze a simple algorithm's complexity.",
    'How do you ensure code quality across a team?',
    'How would you cache the results of an expensive computation?',
  ],
};

const MOCK_BEHAVIORAL = [
  'Tell me about a time you handled a conflict with a teammate.',
  "Describe a project you're most proud of and your specific contribution.",
  'Tell me about a time you missed a deadline and what you learned.',
  'Describe a time you had to learn a new technology quickly.',
  'Tell me about receiving difficult feedback and how you responded.',
  'Describe a time you disagreed with a technical decision.',
  'Tell me about a time you mentored someone.',
  'Describe a failure and how you recovered from it.',
];

const MOCK_SITUATIONAL = [
  'If a production outage happened during your on-call shift, what would you do first?',
  'How would you handle a teammate consistently missing commitments?',
  'If requirements changed late in a sprint, how would you respond?',
  'How would you prioritize features with limited time before a launch?',
  'If you found a security vulnerability in legacy code, what steps would you take?',
  'How would you onboard yourself to an undocumented codebase?',
  'If two stakeholders want conflicting features, how do you decide?',
  'How would you handle discovering a major bug right before release?',
];

const pickDomain = (role = '') => {
  const r = role.toLowerCase();
  if (/front|react|vue|angular|\bui\b|\bux\b/.test(r)) return 'frontend';
  if (/full.?stack/.test(r)) return 'fullstack';
  if (/back|api|server|node|java|golang|\bgo\b|python|database|\bdb\b/.test(r)) return 'backend';
  if (/data|\bml\b|machine learning|\bai\b|analyt|scien/.test(r)) return 'data';
  if (/devops|\bsre\b|infra|cloud|platform/.test(r)) return 'devops';
  if (/mobile|ios|android|flutter|react native/.test(r)) return 'mobile';
  return 'general';
};

const timeFor = (d) => (d === 'easy' ? 90 : d === 'hard' ? 150 : 120);

/** Build a varied, role-appropriate set of mock questions (40/30/30 mix). */
const buildMockQuestions = (jobRole, difficulty, count) => {
  const tech = MOCK_TECH[pickDomain(jobRole)] || MOCK_TECH.general;
  const nTech = Math.round(count * 0.4);
  const nBehav = Math.round(count * 0.3);
  const nSit = Math.max(0, count - nTech - nBehav);

  const out = [];
  const take = (pool, n, category) => {
    for (let i = 0; i < n; i += 1) {
      const base = pool[i % pool.length];
      const text =
        i < pool.length ? base : `${base} (follow-up ${Math.floor(i / pool.length) + 1})`;
      out.push({
        questionText: text,
        category,
        difficulty,
        expectedKeyPoints: ['Clear structure', 'Concrete example', 'Trade-offs'],
        timeRecommended: timeFor(difficulty),
      });
    }
  };
  take(tech, nTech, 'technical');
  take(MOCK_BEHAVIORAL, nBehav, 'behavioral');
  take(MOCK_SITUATIONAL, nSit, 'situational');
  return out;
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
    return buildMockQuestions(jobRole, difficulty, count);
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
