import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

const openai = new OpenAI();

export const maxDuration = 60;

export async function POST(req: Request) {
  let tempFilePath = "";

  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Texto e obrigatorio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[generate-audio] Step 1: creating TTS audio");

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const arrayBuffer = await mp3Response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    console.log("[generate-audio] Step 2: writing temp file for Whisper");

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tempFilePath = path.join(os.tmpdir(), `audio-${uniqueId}.mp3`);

    await fs.promises.writeFile(tempFilePath, audioBuffer);

    console.log("[generate-audio] Step 3: requesting Whisper transcription");

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    console.log("[generate-audio] Done.");

    const audioBase64 = audioBuffer.toString("base64");
    const dataUrl = `data:audio/mp3;base64,${audioBase64}`;

    return new Response(
      JSON.stringify({
        audio_base64: dataUrl,
        captions: transcription.words,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[generate-audio] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log("[generate-audio] Temp file removed");
      } catch (cleanupError) {
        console.error("[generate-audio] Failed to remove temp file:", cleanupError);
      }
    }
  }
}

