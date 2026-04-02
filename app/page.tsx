"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { MyVideo, MyVideoProps } from "./remotion/myvideo";
import { Loader2, RotateCcw, Video, Wand2, Download, CheckCircle2, XCircle } from "lucide-react";

type Status = "idle" | "scripting" | "voicing" | "generating_images" | "ready" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [videoProps, setVideoProps] = useState<MyVideoProps | null>(null);
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState("");
  type ExportStatus = "idle" | "exporting" | "done" | "error";
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportPercent, setExportPercent] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [exportError, setExportError] = useState("");

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setVideoProps(null);
    setErrorMessage("");
    setLoadingProgress("");
  };

  const generateImages = async (prompts: string[], mainSubject: string): Promise<string[]> => {
    setLoadingProgress("A gerar imagens com IA...");
    const res = await fetch("/api/generate-images", {
      method: "POST",
      body: JSON.stringify({ prompts, mainSubject }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Erro ao gerar imagens.");
    const data = await res.json();
    return data.imageUrls as string[];
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      setLoadingProgress("A analisar contexto visual...");
      const scriptRes = await fetch("/api/create-script", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      if (!scriptRes.ok) throw new Error("Erro ao ler URL.");
      const scriptData = await scriptRes.json();

      setStatus("voicing");
      setLoadingProgress("A gerar narração...");
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({ text: scriptData.script_text }), 
        headers: { "Content-Type": "application/json" },
      });

      if (!audioRes.ok) throw new Error("Erro ao criar áudio.");
      const audioData = await audioRes.json();

      setStatus("generating_images");
      console.log(`[Script] Main subject: "${scriptData.main_subject}"`);
      const readyImages = await generateImages(scriptData.image_prompts || [], scriptData.main_subject || "");

      const lastTimestamp = audioData.captions?.[audioData.captions.length - 1]?.end ?? 30;
      const totalFrames = Math.ceil((lastTimestamp + 1) * 30);

      setVideoProps({
        audioBase64: audioData.audio_base64,
        captions: audioData.captions,
        imageUrls: readyImages,
      });
      setDurationInFrames(totalFrames);
      setStatus("ready");

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Erro inesperado.");
      setStatus("error");
    }
  };

  const handleExport = async () => {
    if (!videoProps) return;
    setExportStatus("exporting");
    setExportPercent(0);
    setExportStage("Iniciando...");
    setExportError("");

    try {
      const res = await fetch("/api/export-video", {
        method: "POST",
        body: JSON.stringify({ videoProps, durationInFrames }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.body) throw new Error("Sem resposta do servidor.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event = JSON.parse(part.slice(6));

          if (event.type === "progress") {
            setExportStage(event.stage);
            setExportPercent(event.percent);
          } else if (event.type === "done") {
            setExportPercent(100);
            setExportStage("Concluído!");
            // Decode base64 → Blob → download
            const binary = atob(event.videoBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: "video/mp4" });
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = "autoshorts.mp4";
            a.click();
            URL.revokeObjectURL(objectUrl);
            setExportStatus("done");
            setTimeout(() => setExportStatus("idle"), 3000);
            return;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (error: any) {
      setExportError(error?.message || "Erro ao exportar. Tente novamente.");
      setExportStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-10 text-center space-y-3">
        <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent">
          AutoShorts Fast
        </h1>
        <p className="text-gray-400">Interpretação Inteligente • Carregamento Rápido</p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <label className="block text-sm font-semibold text-gray-300 mb-3">🔗 Link do Artigo</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status !== "idle" && status !== "error"}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
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
                {status === "idle" ? "Gerar Vídeo" : "A Processar..."}
              </button>
            )}

            {(status !== "idle" && status !== "ready" && status !== "error") && (
              <div className="mt-6 space-y-3 text-center">
                 <div className="text-sm text-green-400 font-bold animate-pulse">{loadingProgress}</div>
                 <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                   <div className="h-full bg-green-500 w-full animate-pulse"></div>
                 </div>
              </div>
            )}
            
            {errorMessage && <div className="mt-6 p-4 bg-red-900/20 text-red-200 text-sm rounded-xl">{errorMessage}</div>}
          </div>
        </div>

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
              {exportStatus === "idle" && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Exportar vídeo
                </button>
              )}

              {exportStatus === "exporting" && (
                <div className="w-72 space-y-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-white font-bold">
                    <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                    <span>{exportStage}</span>
                    <span className="text-green-400">{exportPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${exportPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {exportStatus === "done" && (
                <div className="flex items-center gap-2 px-6 py-3 bg-green-900/40 border border-green-600 rounded-xl text-green-400 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Vídeo exportado!
                </div>
              )}

              {exportStatus === "error" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {exportError || "Erro ao exportar. Tente novamente."}
                  </div>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center opacity-40">
              <Video className="w-12 h-12 mx-auto mb-4" />
              <p>O vídeo otimizado aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}