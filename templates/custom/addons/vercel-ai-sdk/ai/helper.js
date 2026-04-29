// Vercel AI SDK helper
// See: https://sdk.vercel.ai/docs
const { generateText } = require("ai");

/**
 * Example AI helper — replace with your model provider.
 * Install a provider: npm install @ai-sdk/openai
 *
 * Usage:
 *   const { askAI } = require("./ai/helper");
 *   const response = await askAI("Hello!");
 */
async function askAI(prompt, model) {
  const { text } = await generateText({
    model,
    prompt,
  });
  return text;
}

module.exports = { askAI };
