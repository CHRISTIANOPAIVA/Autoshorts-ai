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

  // --- LÓGICA DE NORMALIZAÇÃO (CORREÇÃO DO NÚMERO DE IMAGENS) ---
  const ensureSevenPrompts = (prompts: string[]): string[] => {
    let newPrompts = [...prompts];
    
    // Se vier vazio, adiciona genéricos
    if (newPrompts.length === 0) {
      newPrompts = ["Abstract technology background", "Futuristic landscape"];
    }

    // Enquanto tiver menos de 7, repete os que já existem
    while (newPrompts.length < 7) {
      const randomPrompt = newPrompts[Math.floor(Math.random() * newPrompts.length)];
      newPrompts.push(randomPrompt);
    }

    // Se tiver mais de 7, corta
    return newPrompts.slice(0, 7);
  };

  // --- LÓGICA DE DOWNLOAD SEQUENCIAL ---
  const downloadImageWithRetry = async (src: string, attempt = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(src);
      img.onerror = () => {
        if (attempt < 3) {
          setTimeout(() => {
            downloadImageWithRetry(src, attempt + 1).then(resolve).catch(reject);
          }, 1500); // Espera 1.5s entre tentativas
        } else {
          // SE FALHAR 3 VEZES, RETORNA UM PLACEHOLDER (Não quebra o app)
          console.warn("Falha total na imagem. Usando backup.");
          resolve(`https://picsum.photos/seed/retry_fail_${Math.random()}/720/1280`); 
        }
      };
    });
  };

  const processImagesSequentially = async (prompts: string[]) => {
    const finalImages: string[] = [];
    
    // Garante que temos EXATAMENTE 7 prompts antes de começar
    const normalizedPrompts = ensureSevenPrompts(prompts);

    for (let i = 0; i < normalizedPrompts.length; i++) {
      const prompt = normalizedPrompts[i];
      setLoadingProgress(`A baixar cena ${i + 1} de 7...`);
      
      const seed = Math.floor(Math.random() * 100000);
      const enhancedPrompt = `${prompt}, cinematic lighting, 4k, vertical`;
      // Usamos Seed aleatório para que, se o prompt for repetido, a imagem seja diferente
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=1280&nologo=true&model=flux&seed=${seed}`;

      const confirmedUrl = await downloadImageWithRetry(imageUrl);
      finalImages.push(confirmedUrl);
      
      // Pausa leve para não travar a API
      await new Promise(r => setTimeout(r, 200));
    }

    return finalImages;
  };

  const handleGenerate = async () => {
    if (!url) return;
    setStatus("scripting");
    setErrorMessage("");
    setVideoProps(null);

    try {
      setLoadingProgress("A ler link e criar guião...");
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
      const readyImages = await processImagesSequentially(scriptData.visual_keywords || []);

      // CÁLCULO DE DURAÇÃO EXATA
      // Pega o fim da última legenda e adiciona 1 segundo de margem
      const lastTimestamp = audioData.captions?.[audioData.captions.length - 1]?.end ?? 30;
      const totalDurationInSeconds = lastTimestamp + 1.5; 
      const totalFrames = Math.ceil(totalDurationInSeconds * 30);

      setVideoProps({
        audioBase64: audioData.audio_base64,
        captions: audioData.captions,
        imageUrls: readyImages, // Aqui garantimos que são 7 imagens
      });
      setDurationInFrames(totalFrames);
      setStatus("ready");

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Erro inesperado.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-10 text-center space-y-3">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          AutoShorts AI
        </h1>
        <p className="text-gray-400">Geração de Vídeo com 7 Cenas Garantidas</p>
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

            {(status !== "idle" && status !== "ready" && status !== "error") && (
              <div className="mt-6 space-y-3 text-center">
                 <div className="text-sm text-blue-400 font-bold animate-pulse">{loadingProgress}</div>
                 <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                   <div className="h-full bg-blue-500 w-full animate-pulse"></div>
                 </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-900 rounded-xl text-red-200 text-sm flex gap-2">
                <AlertCircle className="w-5 h-5" /> {errorMessage}
              </div>
            )}
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
            </div>
          ) : (
            <div className="text-center opacity-40">
              <Video className="w-12 h-12 mx-auto mb-4" />
              <p>O vídeo aparecerá aqui após o processamento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}