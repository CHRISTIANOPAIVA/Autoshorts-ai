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
  const [loadingProgress, setLoadingProgress] = useState("");

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setVideoProps(null);
    setErrorMessage("");
    setLoadingProgress("");
  };

  // --- LÓGICA DE DOWNLOAD ROBUSTA ---

  // 1. Tenta baixar uma única imagem. Se falhar, tenta de novo 3 vezes.
  const downloadImageWithRetry = async (src: string, attempt = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(src);
      img.onerror = () => {
        if (attempt < 3) {
          // Se falhar, espera 1 segundo e tenta de novo (Recursividade)
          console.warn(`Tentativa ${attempt} falhou para ${src}. Tentando novamente...`);
          setTimeout(() => {
            downloadImageWithRetry(src, attempt + 1).then(resolve).catch(reject);
          }, 1000);
        } else {
          reject(new Error("Falha ao baixar imagem após 3 tentativas"));
        }
      };
    });
  };

  // 2. Processa a lista um por um para não bloquear a API
  const processImagesSequentially = async (prompts: string[]) => {
    const finalImages: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      setLoadingProgress(`Baixando imagem ${i + 1} de ${prompts.length} em Alta Definição...`);
      
      // Adicionamos um número aleatório (seed) para garantir que a imagem mude
      const seed = Math.floor(Math.random() * 10000);
      const enhancedPrompt = `${prompt}, cinematic lighting, photorealistic, vertical wallpaper`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=1280&nologo=true&model=flux&seed=${seed}`;

      try {
        // AWAIT aqui é crucial: O código PARA e espera a imagem baixar
        const confirmedUrl = await downloadImageWithRetry(imageUrl);
        finalImages.push(confirmedUrl);
        
        // Pequena pausa para a API não nos bloquear (500ms)
        await new Promise(r => setTimeout(r, 500));
        
      } catch (error) {
        console.error(`Erro fatal na imagem ${i + 1}:`, error);
        throw new Error(`Não foi possível gerar a imagem da cena ${i + 1}. Tente novamente.`);
      }
    }

    return finalImages;
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      // 1. ROTEIRO
      setLoadingProgress("Lendo conteúdo e criando roteiro...");
      const scriptRes = await fetch("/api/create-script", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      if (!scriptRes.ok) throw new Error("Erro ao ler URL.");
      const scriptData = await scriptRes.json();

      // 2. ÁUDIO
      setStatus("voicing");
      setLoadingProgress("Narrando o texto (IA Neural)...");
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({ text: scriptData.script_text }), 
        headers: { "Content-Type": "application/json" },
      });

      if (!audioRes.ok) throw new Error("Erro ao criar áudio.");
      const audioData = await audioRes.json();

      // 3. IMAGENS (SEQUENCIAL E OBRIGATÓRIO)
      setStatus("generating_images");
      
      // Garante que temos prompts
      const prompts = scriptData.visual_keywords || ["Tech background", "Abstract connection"];
      
      // CHAMA A FUNÇÃO QUE TRAVA TUDO ATÉ ACABAR
      const readyImages = await processImagesSequentially(prompts);

      // Se chegou aqui, temos TODAS as imagens baixadas.
      
      const lastCaptionEnd = audioData.captions?.[audioData.captions.length - 1]?.end ?? 30;
      const calculatedDuration = Math.ceil(lastCaptionEnd * 30) + 60;

      setVideoProps({
        audioBase64: audioData.audio_base64,
        captions: audioData.captions,
        imageUrls: readyImages,
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
                {status === "idle" ? "Gerar Vídeo" : "Aguarde..."}
              </button>
            )}

            {/* STATUS DETALHADO */}
            {(status !== "idle" && status !== "ready" && status !== "error") && (
              <div className="mt-6 space-y-3 text-center">
                 <div className="text-sm text-blue-400 font-bold animate-pulse">
                   {loadingProgress}
                 </div>
                 {status === "generating_images" && (
                   <div className="w-full bg-gray-800 rounded-full h-2 mt-2 overflow-hidden">
                     <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                   </div>
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

        {/* DIREITA */}
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
            </div>
          ) : (
            <div className="text-center opacity-40">
              <Video className="w-12 h-12 mx-auto mb-4" />
              <p>O vídeo só aparecerá quando estiver 100% pronto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}