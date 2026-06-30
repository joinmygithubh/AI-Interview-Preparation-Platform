import OpenAI from 'openai';

/**
 * Shared OpenAI client. Reads the API key from the environment.
 * Throws at startup if OPENAI_API_KEY is missing, which is the desired
 * fail-fast behavior for a service that depends on it.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;
