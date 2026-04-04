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

  // Fetch each image server-side and convert to base64 to avoid CORS + expiry issues
  const imageUrls = await Promise.all(
    results.map(async (result, i) => {
      const url =
        result.status === "fulfilled"
          ? result.value.data[0].url!
          : `https://picsum.photos/seed/fallback_${i}/1024/1792`;

      if (result.status === "rejected") {
        console.error(`[generate-images] Image ${i + 1} failed:`, (result as PromiseRejectedResult).reason);
      }

      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mime = res.headers.get("content-type") || "image/png";
        return `data:${mime};base64,${base64}`;
      } catch (e) {
        console.error(`[generate-images] Failed to fetch image ${i + 1}:`, e);
        return `https://picsum.photos/seed/fallback_${i}/1024/1792`;
      }
    })
  );

  return NextResponse.json({ imageUrls });
}
