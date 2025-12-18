"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { MyVideo, MyVideoProps } from "./remotion/myvideo";
import { 
  Loader2, 
  AlertCircle, 
  Download, 
  RotateCcw, 
  Video, 
  Wand2
} from "lucide-react";

type Status = "idle" | "scripting" | "voicing" | "ready" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [videoProps, setVideoProps] = useState<MyVideoProps | null>(null);
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setVideoProps(null);
    setErrorMessage("");
  };

  const handleDownload = () => {
    alert("Para baixar o vídeo real (MP4), você precisaria configurar um renderizador na nuvem (AWS Lambda/Cloud Run). Por enquanto, isso é um Preview Web!");
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      // 1. ROTEIRO
      const scriptRes = await fetch("/api/create-script", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      if (!scriptRes.ok) throw new Error("Erro ao ler URL.");
      const scriptData = await scriptRes.json();

      setStatus("voicing");

      // 2. ÁUDIO
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({ text: scriptData.script_text }), 
        headers: { "Content-Type": "application/json" },
      });

      if (!audioRes.ok) throw new Error("Erro ao criar áudio.");
      const audioData = await audioRes.json();

      // 3. IMAGENS OTIMIZADAS (AQUI ESTÁ A CORREÇÃO DE VELOCIDADE)
      // Removido o Preload. A URL é gerada e enviada direto pro player.
      const dynamicImages = (scriptData.visual_keywords || []).map((prompt: string) => {
        // CORREÇÃO: Removi "8k", "uhd". Reduzi width para 720 (HD Leve).
        const enhancedPrompt = `${prompt}, cinematic, vertical`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=1280&nologo=true&model=flux`;
      });

      const lastCaptionEnd = audioData.captions?.[audioData.captions.length - 1]?.end ?? 30;
      const calculatedDuration = Math.ceil(lastCaptionEnd * 30) + 60;

      setVideoProps({
        audioBase64: audioData.audio_base64,
        captions: audioData.captions,
        imageUrls: dynamicImages,
      });
      setDurationInFrames(calculatedDuration);
      setStatus("ready");

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Erro inesperado.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      {/* HEADER */}
      <div className="mb-10 text-center space-y-3">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          AutoShorts AI
        </h1>
        <p className="text-gray-400">Transforme links em vídeos virais.</p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ESQUERDA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              🔗 Link do Artigo
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status !== "idle" && status !== "error"}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />

            {status === "ready" ? (
               <button onClick={handleReset} className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                 <RotateCcw className="w-5 h-5" /> Criar Novo
               </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={status !== "idle" && status !== "error"}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {status !== "idle" && status !== "error" ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {status === "idle" ? "Gerar Vídeo" : "Processando..."}
              </button>
            )}

            {(status === "scripting" || status === "voicing") && (
              <div className="mt-6 text-sm text-gray-400 animate-pulse text-center">
                 {status === "scripting" ? "Lendo site e criando roteiro..." : "Gerando áudio e imagens..."}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-900 rounded-xl text-red-200 text-sm flex gap-2">
                <AlertCircle className="w-5 h-5" /> {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* DIREITA (PLAYER) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#111] p-8 rounded-3xl border border-gray-800 min-h-[700px]">
          {videoProps ? (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in-50">
              <div className="relative shadow-2xl rounded-[3rem] overflow-hidden border-[8px] border-gray-900 bg-black">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
                 <Player
                  component={MyVideo as any}
                  inputProps={videoProps}
                  durationInFrames={durationInFrames}
                  fps={30}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  style={{ width: "340px", height: "604px" }}
                  controls
                  autoPlay
                  loop
                />
              </div>
              <button onClick={handleDownload} className="bg-green-600 px-6 py-3 rounded-xl font-bold flex gap-2 hover:bg-green-500">
                <Download /> Baixar Vídeo
              </button>
            </div>
          ) : (
            <div className="text-center opacity-40">
              <Video className="w-12 h-12 mx-auto mb-4" />
              <p>Preview do Vídeo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}