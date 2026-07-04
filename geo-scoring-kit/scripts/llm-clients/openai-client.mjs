import OpenAI from "openai";
import { logLlmCall } from "./call-log.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function dryRunResponse(systemPrompt, userPrompt, model) {
  return {
    text: JSON.stringify(
      {
        dry_run: true,
        model,
        system_preview: systemPrompt.slice(0, 80),
        user_preview: userPrompt.slice(0, 80),
      },
      null,
      2,
    ),
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model,
  };
}

async function callOpenAICompatible(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || "gpt-4o";
  if (opts.dryRun) return dryRunResponse(systemPrompt, userPrompt, model);

  const client = new OpenAI({
    apiKey: requireEnv(opts.envKey || "OPENAI_API_KEY"),
    baseURL: opts.baseURL,
  });
  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens || 16000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    text: response.choices[0]?.message?.content || "",
    usage: response.usage,
    model,
  };
}

export async function callOpenAI(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || "gpt-4o";
  const run = () =>
    callOpenAICompatible(systemPrompt, userPrompt, {
      ...opts,
      model,
      envKey: "OPENAI_API_KEY",
    });
  return opts.dryRun ? run() : logLlmCall({ provider: "openai", model }, run);
}

export async function callDeepSeek(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || "deepseek-chat";
  const run = () =>
    callOpenAICompatible(systemPrompt, userPrompt, {
      ...opts,
      model,
      envKey: "DEEPSEEK_API_KEY",
      baseURL: opts.baseURL || "https://api.deepseek.com",
    });
  return opts.dryRun ? run() : logLlmCall({ provider: "deepseek", model }, run);
}
