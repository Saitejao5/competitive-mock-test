// ─────────────────────────────────────────────────────────
// LLM ROUTER ENGINE — OpenRouter with Exponential Backoff & Circuit Breaker
// Handles timeout, fallback, retry per spec
// ─────────────────────────────────────────────────────────

const TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS) || 10000;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 2;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

// Circuit breaker state
let failureCount = 0;
let circuitOpen = false;
let circuitOpenedAt = null;

// ─────────────────────────────────────────────────────────
// MAIN ROUTER — uses OpenRouter with fallback models
// ─────────────────────────────────────────────────────────
export async function routeLLM({ systemPrompt, userPrompt, onLog }) {
  const log = onLog || console.log;

  // Validate API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error('OpenRouter API key not configured in .env');
  }

  const models = [
    process.env.OPENROUTER_PRIMARY_MODEL,
    process.env.OPENROUTER_FALLBACK_MODEL
  ].filter(Boolean);

  if (models.length === 0) {
    throw new Error('No OpenRouter models configured in .env');
  }

  // Check circuit breaker
  if (circuitOpen) {
    if (Date.now() - circuitOpenedAt > CIRCUIT_BREAKER_TIMEOUT) {
      log(`[ROUTER] Circuit breaker reset after ${CIRCUIT_BREAKER_TIMEOUT}ms`, 'info');
      circuitOpen = false;
      failureCount = 0;
    } else {
      throw new Error(`[ROUTER] Circuit breaker OPEN (${failureCount}/${CIRCUIT_BREAKER_THRESHOLD} failures). Retry in ${Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - circuitOpenedAt)) / 1000)}s`);
    }
  }

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      log(`[ROUTER → OpenRouter] Model: ${model} | Attempt: ${attempt}/${MAX_RETRIES}`, 'llm');

      try {
        const result = await withTimeout(
          callOpenRouter({ model, systemPrompt, userPrompt }),
          TIMEOUT_MS,
          `OpenRouter/${model}`
        );
        
        // Success: reset failure count
        failureCount = Math.max(0, failureCount - 1);
        log(`[ROUTER ✓] OpenRouter/${model} succeeded | Failures: ${failureCount}`, 'success');
        return { ...result, provider: 'OpenRouter', model };
      } catch (err) {
        log(`[ROUTER ✗] Attempt ${attempt} failed: ${err.message}`, 'error');
        failureCount++;

        if (isRateLimitError(err)) {
          log(`[ROUTER] Rate limit detected — switching model`, 'warn');
          break; // Try next model
        }

        if (isTimeoutError(err)) {
          log(`[ROUTER] Timeout detected — ${attempt < MAX_RETRIES ? 'retrying' : 'failing'}`, 'warn');
        }

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          log(`[ROUTER] Retrying in ${delay}ms...`, 'info');
          await sleep(delay);
        }

        // Open circuit breaker if too many failures
        if (failureCount >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpen) {
          circuitOpen = true;
          circuitOpenedAt = Date.now();
          log(`[ROUTER] ⚠️ Circuit breaker OPENED (${failureCount} failures)`, 'error');
        }
      }
    }

    log(`[ROUTER] Model ${model} exhausted — trying next model`, 'warn');
  }

  throw new Error('All OpenRouter models failed. Circuit breaker may be open.');
}

// ─────────────────────────────────────────────────────────
// OPENROUTER PROVIDER
// ─────────────────────────────────────────────────────────
async function callOpenRouter({ model, systemPrompt, userPrompt }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`\x1b[35m[LLM → OpenRouter]\x1b[0m Sending request | Model: ${model}`);
  const startTime = Date.now();

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Exam Engine'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 4096,
      temperature: 0.7
    })
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || response.statusText;
    console.error(`\x1b[31m[OpenRouter Error]\x1b[0m ${response.status}: ${msg}`);
    const error = new Error(`OpenRouter ${response.status}: ${msg}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = {
    input_tokens: data.usage?.prompt_tokens || 0,
    output_tokens: data.usage?.completion_tokens || 0
  };

  console.log(`\x1b[32m[OpenRouter ✓]\x1b[0m ${elapsed}s | In: ${usage.input_tokens} | Out: ${usage.output_tokens} tokens`);

  return { text, usage, elapsed: parseFloat(elapsed) };
}

// ─────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms for ${label}`)), ms)
    )
  ]);
}

function isRateLimitError(err) {
  return err.statusCode === 429 || err.message.includes('rate_limit') || err.message.includes('429');
}

function isTimeoutError(err) {
  return err.message.includes('Timeout') || err.message.includes('timeout') || err.code === 'ETIMEDOUT';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export circuit breaker reset for testing
export function resetCircuitBreaker() {
  circuitOpen = false;
  failureCount = 0;
}
