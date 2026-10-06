import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Alpie's reasoning model emits its chain-of-thought before a "</think>" tag,
// then the final answer. Anything before that tag is thinking; the answer is
// what follows. If the tag never appears, return the raw text.
function stripReasoning(text) {
  if (!text) return '';
  const idx = text.lastIndexOf('</think>');
  if (idx === -1) return text.trim();
  return text.slice(idx + '</think>'.length).trim();
}

const SYSTEM_PROMPT_CHAT = `You are Alpie, 169pi's open-source AI reasoning model — a 32B, 4-bit reasoning model built in India. Benchmarks worth citing when relevant: GSM8K 92.75%, MMLU 81.28%, SWE-Bench Verified 57.8%, 65K context, ~16GB VRAM. You are answering inside a Preptember landing page that helps first-time contributors open their very first pull request to 169Pi/.github — the org profile repo — where entries land under the "Make this README yours" section on profile/README.md. Keep replies short, friendly, and beginner-safe. Explain git and GitHub terms in plain English. The bar for entries is high: they should showcase the contributor, not just fill space. When someone asks what to make, steer them toward custom SVG art or a hero image, an explanatory diagram (how 4-bit quantization preserves reasoning, context window comparisons), a benchmark visualization rendered as a chart, a runnable micro-demo, structured multi-line ASCII that actually depicts something, or writing where the visual layout carries weight. Discourage generic haikus, plain one-liners, and copy-paste code — the CONTRIBUTING file explicitly says these will not make it in. The PR title format is "@your-github-handle: <what you are calling it>". Reviews are monthly: merges happen on the last day of each month. Some people running Preptember for their community (a meetup, campus club, or Discord) may ask you to help prepare an organizer's guide — when they do, produce a concrete, well-structured guide: a suggested session agenda with rough timings, a prep/setup checklist, plain-English talking points for explaining forks and pull requests to newcomers, and tips for helping a whole group open their first PR to 169Pi/.github; keep it practical and skimmable. Do not invent 169pi policies you are not sure about — if unsure, point them to the Discord.`;

const SYSTEM_PROMPT_DRAFT = `You are helping a first-time open-source contributor draft a single Markdown block for the "## 🎨 Make this README yours" section of profile/README.md in the 169Pi/.github repo. The bar is high — the block must clearly showcase the contributor, not read as filler. The block must:
- Start with a level-3 heading: "### @<their-github-handle> — <what they are calling it>"
- Then the body in the medium they chose (SVG art, explanatory diagram, benchmark viz, runnable micro-demo, structured ASCII, or a formatted written piece).
- If the medium is SVG, output a full self-contained <svg> element inline (viewBox set, no external assets, light/dark aware where possible, ideally under ~40 lines).
- If the medium is a diagram, prefer a Mermaid fenced block (\`\`\`mermaid ... \`\`\`) that teaches something concrete about 169pi (e.g. how 4-bit quantization preserves reasoning, GSM8K/MMLU/SWE-Bench comparisons, context-window sizing). ASCII or inline SVG diagrams are also fine.
- If the medium is a benchmark viz, chart real Alpie-Core numbers where possible (GSM8K 92.75%, MMLU 81.28%, SWE-Bench Verified 57.8%).
- If the medium is a runnable micro-demo, write short, self-contained code inside a fenced block; it should compute, simulate, or visualise a real property of the model and print something worth reading.
- If the medium is structured ASCII, make it multi-line and clearly depict something (the model, a curve, a metaphor) — never a one-liner.
- If the medium is written, use Markdown formatting (headings, blockquotes, tables, spacing) so the layout carries weight.
- End with two lines exactly:
  *What it represents:* <one line tying the entry to a 169pi model, capability, or benchmark>.
  *Find me:* <optional handle or site, or omit the value>
- Stay self-contained: no external images, no scripts, no tracking pixels.
- Keep it tight — aim for under ~40 lines total.
Return ONLY the Markdown block, no preamble, no explanation.`;

function nextMergeDate() {
  const now = new Date();
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return last.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export async function POST(req) {
  const base = process.env.ALPIE_API_BASE;
  const key = process.env.ALPIE_API_KEY;
  const model = process.env.ALPIE_MODEL || 'alpie-core';

  if (!base || !key) {
    return NextResponse.json(
      { error: 'Alpie API is not configured (ALPIE_API_BASE / ALPIE_API_KEY missing).' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const mode = body.mode === 'draft' ? 'draft' : 'chat';
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const cleaned = messages
    .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const payload = {
    model,
    messages: [
      { role: 'system', content: mode === 'draft' ? SYSTEM_PROMPT_DRAFT : `${SYSTEM_PROMPT_CHAT} The next merge is ${nextMergeDate()}.` },
      ...cleaned,
    ],
    temperature: mode === 'draft' ? 0.8 : 0.5,
    max_tokens: mode === 'draft' ? 2500 : 2000,
    stream: false,
  };

  try {
    const upstream = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Alpie upstream error (${upstream.status}).`, detail: text.slice(0, 500) },
        { status: 502 }
      );
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Alpie returned non-JSON.', detail: text.slice(0, 500) }, { status: 502 });
    }
    const raw = json?.choices?.[0]?.message?.content || '';
    const content = stripReasoning(raw);
    return NextResponse.json({ content, model: json.model || model });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to reach Alpie.', detail: String(e).slice(0, 500) }, { status: 502 });
  }
}
