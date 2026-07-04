// call-log.mjs — 统一的「外部大模型调用」开始/结束计时日志。
// 输出到 stderr，经 geo-dev-server 子进程管道进入 gateway 服务日志（[geo-score] 前缀），
// 便于在网关侧统一 grep 分析每次外部大模型调用的耗时。
// 格式与网关侧「openclaw 对话」日志（src/agents/agent-command.ts）保持一致：
//   [llm-call] START id=<id> kind=external provider=<p> model=<m>
//   [llm-call] END   id=<id> kind=external provider=<p> model=<m> duration=<ms>ms ok=<bool> [error=<msg>]

let seq = 0;

function nextId() {
  seq = (seq + 1) % 1_000_000;
  return `ext-${Date.now().toString(36)}-${seq.toString(36)}`;
}

function fmtError(err) {
  const msg = String(err?.message ?? err ?? "error")
    .replace(/\s+/g, " ")
    .trim();
  return msg.length > 160 ? `${msg.slice(0, 160)}…` : msg;
}

/**
 * 包裹一次真实的外部大模型调用，打印开始/结束计时日志。
 * @param {{provider: string, model?: string}} meta 调用目标信息（provider 用于区分 claude/openai/deepseek/qwen）
 * @param {() => Promise<T>} fn 实际发起网络请求的函数
 * @returns {Promise<T>}
 * @template T
 */
export async function logLlmCall({ provider, model }, fn) {
  const id = nextId();
  const startedAt = Date.now();
  const label = `id=${id} kind=external provider=${provider} model=${model ?? "?"}`;
  console.error(`[llm-call] START ${label}`);
  try {
    const result = await fn();
    console.error(`[llm-call] END ${label} duration=${Date.now() - startedAt}ms ok=true`);
    return result;
  } catch (err) {
    console.error(
      `[llm-call] END ${label} duration=${Date.now() - startedAt}ms ok=false error=${fmtError(err)}`,
    );
    throw err;
  }
}
