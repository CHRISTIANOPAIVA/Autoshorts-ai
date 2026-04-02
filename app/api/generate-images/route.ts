import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { prompts, mainSubject }: { prompts: string[]; mainSubject: string } = await req.json();

  const subject = (mainSubject || "").trim();

  const finalPrompts = prompts.map((raw) => {
    // Guarantee subject at the front even if GPT omitted it
    const guaranteed = raw.toLowerCase().startsWith(subject.toLowerCase())
      ? raw
      : `${subject} ${raw}`;
    return `${guaranteed}, photorealistic, cinematic lighting, 4k, sharp focus`;
  });

  console.log("[generate-images] Final prompts sent to DALL-E 3:");
  finalPrompts.forEach((p, i) => console.log(`  [${i + 1}] "${p}"`));

  // Generate all images in parallel
  const results = await Promise.allSettled(
    finalPrompts.map((prompt) =>
      openai.images.generate({
        model: "dall-e-3",
        prompt,
        size: "1024x1792",
        quality: "standard",
        n: 1,
      })
    )
  );

  const imageUrls = results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value.data[0].url!;
    }
    // Fallback to a neutral placeholder on individual failure
    console.error(`[generate-images] Image ${i + 1} failed:`, (result as PromiseRejectedResult).reason);
    return `https://picsum.photos/seed/fallback_${i}/1024/1792`;
  });

  return NextResponse.json({ imageUrls });
}
