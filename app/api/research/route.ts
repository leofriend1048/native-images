import Anthropic from "@anthropic-ai/sdk";
import { getWorkspaceApiKeys } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export const maxDuration = 120;

const RESEARCH_SYSTEM_PROMPT = `You are a direct-response copywriter and consumer researcher. Your job is to find REAL Voice of Customer (VOC) data for a given product and target persona.

Search for:
1. PAIN LANGUAGE — the exact words real customers use to describe their frustration, suffering, or dissatisfaction with current solutions. Look in Amazon reviews (1-3 star), Reddit complaints, Facebook group posts, TikTok comments, beauty/health forums.
2. TRIGGER MOMENTS — the specific real-life situations where the pain is worst. Not generic ("in the morning") but hyper-specific ("2am bathroom mirror after a bad skin day", "right before a date when you notice the redness", "in the car checking your face in the rearview mirror").
3. EMOTIONAL HOOKS — what emotions drive the purchase? Shame, frustration, desperation, hope, vanity, fear of judgment? Find the real emotional language.
4. COMPETITOR FAILURES — what do people hate about the alternatives they've tried? What specific products do they name and what went wrong?
5. VISUAL SCENARIOS — based on the VOC data, what scenes would look like a real person's Facebook post about this problem? Think: the kind of photo someone takes to show a friend what they're dealing with.

OUTPUT FORMAT — return structured research in these sections:
<pain_language>
Exact quotes and phrases from real customers (cite the source type: Amazon review, Reddit, etc.)
</pain_language>

<trigger_moments>
Specific real-life moments where the problem is most acute
</trigger_moments>

<emotional_hooks>
The dominant emotions and the language people use to express them
</emotional_hooks>

<competitor_failures>
What alternatives people tried and why they failed
</competitor_failures>

<visual_concepts>
5-8 specific visual scenarios grounded in the VOC data above — each should read like "a photo someone would post on Facebook showing..."
</visual_concepts>

Be thorough. Search multiple queries. The goal is to arm a creative team with REAL language from REAL people — not marketing-speak or assumptions.`;

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keys = await getWorkspaceApiKeys(ctx.workspaceId);
  const { product, persona, angle } = await req.json();

  if (!product?.trim()) {
    return new Response(JSON.stringify({ error: "Product is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey: keys.anthropicApiKey });

  const userPrompt = [
    `Product: ${product}`,
    persona ? `Target persona: ${persona}` : null,
    angle ? `Angle/USP: ${angle}` : null,
    "",
    "Search for real VOC data — Amazon reviews, Reddit posts, Facebook groups, forums, TikTok comments. Find the exact language real people use about this product category and the problems it solves. Focus on pain points, frustrations with alternatives, and the specific moments when the problem is worst.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
      ],
    });

    // Extract the final text content from the response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const research = textBlocks.map((b) => b.text).join("\n\n");

    // Extract citations from text blocks
    const citations: Array<{ url: string; title: string; cited_text: string }> = [];
    for (const block of textBlocks) {
      if (block.citations) {
        for (const cite of block.citations) {
          if (cite.type === "web_search_result_location") {
            citations.push({
              url: cite.url,
              title: cite.title ?? "",
              cited_text: cite.cited_text ?? "",
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        research,
        citations: citations.slice(0, 20), // Top 20 citations
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Research error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
