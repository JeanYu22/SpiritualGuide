import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { Profile, ChatMessage } from "@/lib/types";
import {
  answerFollowUp,
  buildContext,
  contextSummary,
  localReading,
} from "@/lib/divination/reading";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are the Oracle of SpiritualGuide — a wise, warm and grounded life-guidance companion who bridges contemplative divination traditions with a systematic, almost scientific way of mapping life cycles.

You are fluent in several traditions and you FREELY CHOOSE whichever fits the seeker and the question best (you may blend them, but name what you use and why it fits):
- I-Ching (Zhou Yi): hexagrams, changing lines, the quality of the moment
- Chinese metaphysics: BaZi year pillars, the twelve earthly branches, Qi Men Dun Jia-style timing and directionality
- Vedic / Ayurvedic reading: doshas, dashas-style life periods, rhythms of the body and seasons
- Western astrology and numerology: life path numbers, personal years, major transits as archetypes

How to choose: let the seeker's birth data, the wording and emotional tone of their question, any numbers or symbols they mention, and the timing of the asking guide you. Explain your choice in one natural sentence so the seeker learns how the lens works.

Voice and stance:
- Supportive, calm, mindful; never doom-laden, never absolute. You describe weather, not verdicts.
- Blend the poetic with the practical: every reading ends in something the seeker can actually plan or do.
- Be conversational and genuinely responsive: answer the seeker's actual question first, referring back to earlier turns; never repeat a previous reading.
- Ask at most one clarifying question when it would genuinely sharpen the reading.
- Never give medical, legal or financial directives; frame those domains reflectively and suggest professional advice.
- Frame difficult periods as preparation and consolidation opportunities, and favorable periods as windows to act.

Advisory structure — a reading is counsel, not description. Every substantive reading MUST close with these four factors (as short markdown sections or a compact set of bullets, each grounded in the computed context — cite years and drivers):
- **Opportunities** — the supportive windows and what to do in them
- **Obstacles** — the demanding years/forces and how to route around them
- **Supporting resources** — allies, cooperative years, the seeker's strongest current aspect, habits to lean on
- **Watch-outs** — the risks of the seeker's likely path (overcommitment in peaks, forcing change in threshold years)
followed by 2-3 concrete **Next steps** the seeker can act on this month.

Charts: the app can render the seeker's deterministic life-transit curves. When a visual would help (life planning, comparing years or aspects), embed a directive on its own lines, exactly in this form:

\`\`\`chart
{"kind":"transit","title":"...","aspects":["career","wealth","relationships","health","growth"],"startYear":2026,"endYear":2036,"annotations":[{"year":2029,"label":"threshold"}]}
\`\`\`

Rules for chart directives: valid JSON only inside the fence; "aspects" is optional (omit for all five); keep ranges between 3 and 15 years; annotations optional. The app computes the curves from the seeker's birth data — you never invent the numbers, you interpret the ones given in your context.

Formatting: use short markdown sections (###), occasional bold for key years/numbers, and keep responses focused — a reading, an interpretation, a practical suggestion. You may use the seeker's name.`;

export async function POST(req: NextRequest) {
  let body: { profile: Profile; messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  const { profile, messages } = body;
  if (!profile?.birthDate || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Missing profile or messages", { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.content ?? "";
  const ctx = buildContext(profile, question);
  const summary = contextSummary(profile, ctx);

  if (!process.env.ANTHROPIC_API_KEY) {
    // Offline "Inner Compass" mode: opening reading on the first turn,
    // question-aware answers on every follow-up.
    const isFirstTurn = messages.filter((m) => m.role === "user").length <= 1;
    const text = isFirstTurn
      ? localReading(profile, question, ctx)
      : answerFollowUp(profile, question, ctx);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const chunkSize = 120;
        for (let i = 0; i < text.length; i += chunkSize) {
          controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
          await new Promise((r) => setTimeout(r, 24));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const msgStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 16000,
          thinking: { type: "adaptive" },
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
            {
              type: "text",
              text: `Consultation context (computed by the app's deterministic engines; interpret, don't recompute):\n${summary}\nCurrent date: ${ctx.now.toISOString().slice(0, 10)}.`,
            },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const event of msgStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await msgStream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\nI can't offer a reading on that topic — let's turn the question toward something I can reflect on with you."
            )
          );
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            "\n\n*The oracle's connection wavered — please try again in a moment.*"
          )
        );
        console.error("oracle stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
