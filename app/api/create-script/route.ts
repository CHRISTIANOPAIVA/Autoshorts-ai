import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { scrapeContent } from "@/lib/scraper";

export const maxDuration = 60;

const ScriptSchema = z.object({
  main_subject: z.string().describe("The single main subject of the article (e.g. 'capybara', 'Eiffel Tower', 'Tesla Model 3'). One to three words maximum."),
  script_text: z.string().describe("O guião narrado completo em Português."),
  image_prompts: z.array(z.string())
    .length(7)
    .describe("Exactly 7 image prompts in English. Each MUST start with the main_subject name."),
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) return new Response(JSON.stringify({ error: "URL obrigatório" }), { status: 400 });

    const pageContent = await scrapeContent(url);
    
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: ScriptSchema,
      messages: [
        {
          role: "system",
          content: `You are an expert visual prompt engineer for AI image generation (Flux model).

STEP 1 — Extract main_subject:
Identify the single most important subject of the article in 1–3 words (e.g. "capybara", "Eiffel Tower", "Tesla Model 3", "black holes"). This becomes main_subject.

STEP 2 — Write the narration:
Write an engaging 60-second narration in Portuguese (Brazil) about the article content.

STEP 3 — Generate exactly 7 image_prompts in English:
MANDATORY RULE: Every single prompt MUST begin with the exact main_subject string.
No exceptions. If main_subject is "capybara", every prompt starts with "capybara".

PROMPT STRUCTURE (strictly follow this):
"[main_subject] [specific action/state], [specific environment], [lighting], [photographic style]"

VARIETY — use these 7 scene types, one per prompt:
1. Close-up portrait / face detail
2. Full body in natural habitat
3. Action scene (moving, eating, swimming, etc.)
4. Group/social scene
5. Environmental wide shot with subject visible
6. Dramatic/emotional moment
7. Unique or surprising angle

EXAMPLE OUTPUT for main_subject = "capybara":
1. "capybara close-up portrait with wet fur and calm eyes, shallow depth of field, soft morning light, National Geographic photography"
2. "capybara standing on a riverbank surrounded by tall green reeds, lush Amazon backdrop, midday sunlight, wildlife photography"
3. "capybara swimming across a dark river, water splashing around its body, golden hour, dynamic action shot"
4. "group of capybaras resting together on a grassy field, warm late afternoon light, wide angle, documentary style"
5. "capybara grazing in a flooded meadow, misty morning atmosphere, long lens compression, photorealistic"
6. "capybara mother nursing her young by a calm lake at dusk, emotional intimate scene, soft bokeh"
7. "capybara sitting peacefully with birds perched on its back, surprised expression, bright daylight, funny wildlife photo"

CRITICAL: If you omit main_subject from the start of any prompt, the image generation will fail.`
        },
        { role: "user", content: `Article content:\n\n${pageContent}\n\nExtract the main_subject, write the Portuguese narration, then generate 7 image_prompts that each start with the main_subject.` }
      ],
    });

    return new Response(JSON.stringify(result.object), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}