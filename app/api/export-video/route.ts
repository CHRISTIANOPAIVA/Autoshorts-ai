import { NextRequest } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";

export const maxDuration = 300;

let cachedBundleUrl: string | null = null;

export async function POST(req: NextRequest) {
  const { videoProps, durationInFrames } = await req.json();

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const outputPath = path.join(os.tmpdir(), `autoshorts-${Date.now()}.mp4`);

      try {
        if (!cachedBundleUrl) {
          send({ type: "progress", stage: "Compilando projeto...", percent: 5 });
          cachedBundleUrl = await bundle({
            entryPoint: path.join(process.cwd(), "app", "remotion", "index.ts"),
            webpackOverride: (config) => config,
          });
        }

        send({ type: "progress", stage: "Preparando composição...", percent: 25 });

        const composition = await selectComposition({
          serveUrl: cachedBundleUrl,
          id: "AutoShortsMain",
          inputProps: videoProps,
        });

        send({ type: "progress", stage: "Renderizando vídeo...", percent: 30 });

        let lastSentPercent = 30;

        await renderMedia({
          composition: { ...composition, durationInFrames },
          serveUrl: cachedBundleUrl,
          codec: "h264",
          outputLocation: outputPath,
          inputProps: videoProps,
          onProgress: ({ progress }) => {
            const percent = 30 + Math.round(progress * 65);
            // Only send when percent changes by at least 1 to avoid flooding
            if (percent > lastSentPercent) {
              lastSentPercent = percent;
              send({ type: "progress", stage: "Renderizando vídeo...", percent });
            }
          },
        });

        send({ type: "progress", stage: "Finalizando...", percent: 97 });

        const buffer = fs.readFileSync(outputPath);
        const videoBase64 = buffer.toString("base64");

        send({ type: "done", videoBase64 });
      } catch (err) {
        cachedBundleUrl = null;
        console.error("[export-video]", err);
        send({ type: "error", message: "Falha ao exportar vídeo." });
      } finally {
        try { fs.unlinkSync(outputPath); } catch {}
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
