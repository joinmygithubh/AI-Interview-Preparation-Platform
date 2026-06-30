import openai from '../config/openai.js';

const MODEL = 'gpt-4o-mini';

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
 */
const complete = async ({ system, user, temperature = 0.7 }) => {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return response.choices?.[0]?.message?.content ?? '';
};

/**
 * (a) Parse raw resume text into structured data.
 * @param {string} text
 * @returns {Promise<{skills:string[], experience:object[], education:object[], summary:string}>}
 */
export const parseResume = async (text) => {
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
