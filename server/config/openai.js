import OpenAI from 'openai';

/**
 * Lazily-initialized OpenAI client.
 *
 * The client is created on first actual use (i.e. at request time), NOT at
 * import time. This avoids crashing the whole process during module loading if
 * the environment isn't ready yet, and surfaces a clear, actionable error.
 */
let client = null;

const getClient = () => {
  if (client) return client;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is missing. Set it in server/.env (and make sure the file ' +
        'is named exactly ".env", not ".env.txt").'
    );
  }

  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
};

// Proxy so existing call sites (e.g. `openai.chat.completions.create(...)`)
// keep working, while construction is deferred until the first property access.
const openai = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getClient();
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
);

export default openai;
