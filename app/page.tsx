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
  Wand2,
  Image as ImageIcon
} from "lucide-react";

type Status = "idle" | "scripting" | "voicing" | "generating_images" | "ready" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [videoProps, setVideoProps] = useState<MyVideoProps | null>(null);
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(""); // Para mostrar o que está a acontecer

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setVideoProps(null);
    setErrorMessage("");
    setLoadingProgress("");
  };

  const handleDownload = () => {
    alert("Para descarregar o ficheiro .MP4 final, seria necessário um servidor de renderização na nuvem. Esta é uma pré-visualização web em tempo real.");
  };

  // FUNÇÃO CRÍTICA: Obriga o navegador a descarregar a imagem antes de prosseguir
  const preloadImages = async (imageUrls: string[]) => {
    const promises = imageUrls.map((src, index) => {
      return new Promise<string | null>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          console.log(`Imagem ${index + 1} carregada.`);
          resolve(src);
        };
        img.onerror = () => {
          console.warn(`Falha ao carregar imagem: ${src}`);
          resolve(null); // Resolve como null para não bloquear tudo
        };
      });
    });

    // Espera que TODAS terminem (com sucesso ou erro)
    return Promise.all(promises);
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      // 1. ROTEIRO
      setLoadingProgress("A ler o artigo e a escrever o guião...");
      const scriptRes = await fetch("/api/create-script", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      if (!scriptRes.ok) throw new Error("Não foi possível ler este URL. Tente outro sítio.");
      const scriptData = await scriptRes.json();

      // 2. ÁUDIO
      setStatus("voicing");
      setLoadingProgress("A gerar narração neural...");
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({ text: scriptData.script_text }), 
        headers: { "Content-Type": "application/json" },
      });

      if (!audioRes.ok) throw new Error("Falha ao gerar o áudio.");
      const audioData = await audioRes.json();

      // 3. IMAGENS (PRÉ-CARREGAMENTO FORÇADO)
      setStatus("generating_images");
      setLoadingProgress(`A criar e descarregar ${scriptData.visual_keywords?.length || 5} imagens de IA... (Aguarde)`);
      
      const rawImageUrls = (scriptData.visual_keywords || []).map((prompt: string) => {
        // Usamos 720p para ser mais rápido, mas mantemos qualidade suficiente
        const enhancedPrompt = `${prompt}, cinematic lighting, photorealistic, vertical wallpaper`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=1280&nologo=true&model=flux`;
      });

      // O "AWAIT" AQUI É O QUE RESOLVE O PROBLEMA DO ECRÃ PRETO
      const loadedImages = await preloadImages(rawImageUrls);
      
      // Removemos imagens que falharam (null)
      const validImages = loadedImages.filter(img => img !== null) as string[];

      // Se todas falharem, usamos backups
      const finalImages = validImages.length > 0 ? validImages : [
        "https://picsum.photos/seed/backup1/720/1280",
        "https://picsum.photos/seed/backup2/720/1280"
      ];

      // Cálculo de Duração
      const lastCaptionEnd = audioData.captions?.[audioData.captions.length - 1]?.end ?? 30;
      const calculatedDuration = Math.ceil(lastCaptionEnd * 30) + 60; // +2s de margem

      setVideoProps({
        audioBase64: audioData.audio_base64,
        captions: audioData.captions,
        imageUrls: finalImages,
      });
      setDurationInFrames(calculatedDuration);
      setStatus("ready");

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Ocorreu um erro inesperado.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      {/* CABEÇALHO */}
      <div className="mb-10 text-center space-y-3">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          AutoShorts AI
        </h1>
        <p className="text-gray-400">Transforme links em vídeos virais.</p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
            
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
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {status !== "idle" && status !== "error" ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {status === "idle" ? "Gerar Vídeo" : "A Processar..."}
              </button>
            )}

            {/* STATUS DETALHADO */}
            {(status !== "idle" && status !== "ready" && status !== "error") && (
              <div className="mt-6 space-y-3 text-center animate-pulse">
                 <div className="text-sm text-blue-400 font-medium">
                   {loadingProgress}
                 </div>
                 {status === "generating_images" && (
                   <div className="text-xs text-gray-500">Isto pode demorar 10-20 segundos para garantir a sincronia.</div>
                 )}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-900 rounded-xl text-red-200 text-sm flex gap-2">
                <AlertCircle className="w-5 h-5" /> {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (LEITOR) */}
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
              <button onClick={handleDownload} className="bg-green-600 px-6 py-3 rounded-xl font-bold flex gap-2 hover:bg-green-500 text-white">
                <Download /> Baixar Vídeo
              </button>
            </div>
          ) : (
            <div className="text-center opacity-40">
              <Video className="w-12 h-12 mx-auto mb-4" />
              <p>A pré-visualização aparecerá aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}