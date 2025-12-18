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
  ImageIcon
} from "lucide-react";

type Status = "idle" | "scripting" | "voicing" | "generating_images" | "ready" | "error";

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
    alert("🚀 Funcionalidade de Render:\n\nEm produção, isso enviaria o JSON para um servidor FFMPEG.\n\nPor enquanto, aproveite o preview em tempo real!");
  };

  const preloadImages = async (imageUrls: string[]) => {
    const promises = imageUrls.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = () => {
          console.warn(`Falha ao carregar imagem: ${src}`);
          resolve(null);
        };
      });
    });
    await Promise.all(promises);
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      // --- PASSO 1: GERAR ROTEIRO ---
      const scriptRes = await fetch("/api/create-script", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      if (!scriptRes.ok) throw new Error("Não consegui ler essa URL. Tente outro site!");
      const scriptData = await scriptRes.json();

      setStatus("voicing");

      // --- PASSO 2: GERAR ÁUDIO ---
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({ text: scriptData.script_text }), 
        headers: { "Content-Type": "application/json" },
      });

      if (!audioRes.ok) throw new Error("Erro ao criar a narração.");
      const audioData = await audioRes.json();

      // --- PASSO 3: GERAR E BAIXAR IMAGENS ---
      setStatus("generating_images");
      
      const dynamicImages = (scriptData.visual_keywords || []).map((prompt: string) => {
        const enhancedPrompt = `${prompt}, cinematic lighting, photorealistic, 8k uhd, vertical wallpaper`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1080&height=1920&nologo=true&model=flux`;
      });

      console.log("⏳ Baixando imagens para evitar lag...");
      await preloadImages(dynamicImages);

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
      setErrorMessage(error?.message || "Ocorreu um erro inesperado.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 selection:bg-purple-500/30">
      
      {/* CABEÇALHO */}
      <div className="mb-10 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            AutoShorts AI
          </h1>
        </div>
        <p className="text-gray-400 text-lg">
          Transforme links em vídeos virais em segundos.
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LADO ESQUERDO: CONTROLES */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-all" />

            <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1">
              🔗 Link do Artigo (Wiki, Notícia, Blog)
            </label>
            
            <div className="relative">
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status !== "idle" && status !== "error"}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* BOTÕES */}
            {status === "ready" ? (
               <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
                 <button
                   onClick={handleReset}
                   className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                 >
                   <RotateCcw className="w-5 h-5" />
                   Criar Novo Vídeo (Sair)
                 </button>
               </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={status !== "idle" && status !== "error"}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
              >
                {status !== "idle" && status !== "error" ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                {status === "idle" && "Gerar Mágica ✨"}
                {status === "error" && "Tentar Novamente"}
                {status === "scripting" && "Escrevendo Roteiro..."}
                {status === "voicing" && "Criando Narração..."}
                {status === "generating_images" && "Renderizando Imagens..."}
              </button>
            )}

            {/* STATUS */}
            {(status === "scripting" || status === "voicing" || status === "generating_images") && (
              <div className="mt-6 space-y-4">
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-blue-500 transition-all duration-1000 
                    ${status === "scripting" ? "w-1/3" : ""}
                    ${status === "voicing" ? "w-2/3" : ""}
                    ${status === "generating_images" ? "w-full" : ""}
                    `} 
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <StatusItem active={status === "scripting"} label="Lendo link e criando roteiro..." />
                  <StatusItem active={status === "voicing"} label="Gerando voz neural..." />
                  <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${status === "generating_images" ? "bg-green-500/10 text-green-400" : "text-gray-600"}`}>
                    {status === "generating_images" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    <span>Criando e baixando imagens (IA)...</span>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: PLAYER */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#111] p-8 rounded-3xl border border-gray-800 min-h-[700px] relative overflow-hidden">
          
          <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

          {videoProps ? (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-500">
              <div className="relative z-10 shadow-2xl rounded-[3rem] overflow-hidden border-[8px] border-gray-900 bg-black outline outline-4 outline-gray-800">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
                 {/* CORREÇÃO AQUI: (as any) evita o erro de strict types no build */}
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
              <div className="flex gap-4 w-full max-w-sm z-10">
                <button 
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-green-500/20"
                >
                  <Download className="w-5 h-5" />
                  Baixar Vídeo
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center z-10 opacity-40 space-y-4">
              <div className="w-32 h-56 border-4 border-dashed border-gray-700 rounded-3xl mx-auto flex items-center justify-center bg-gray-900/50">
                <Video className="w-12 h-12 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-300">Preview do Vídeo</h3>
                <p className="text-gray-500">Seu conteúdo viral aparecerá aqui</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const StatusItem = ({ active, label }: { active: boolean, label: string }) => (
  <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${active ? "bg-blue-500/10 text-blue-400" : "text-gray-600"}`}>
    {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full bg-gray-700" />}
    <span>{label}</span>
  </div>
);