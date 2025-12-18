import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";

// --- TIPAGENS ---
export interface Caption {
  word: string;
  start: number;
  end: number;
}

export interface MyVideoProps {
  audioBase64: string;
  captions: Caption[];
  imageUrls: string[];
}

// --- COMPONENTE PRINCIPAL ---
export const MyVideo = ({
  audioBase64,
  captions,
  imageUrls,
}: MyVideoProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 1. BLINDAGEM DE DADOS (FALLBACK)
  // Se a lista vier nula ou vazia, usamos placeholder para não dar erro de "map of undefined"
  const safeImages = (imageUrls && imageUrls.length > 0) 
    ? imageUrls 
    : ["https://picsum.photos/seed/fallback/720/1280"];

  // 2. CÁLCULO DE TEMPO "À PROVA DE ERRO"
  // Divide o tempo total pelo número de imagens
  const durationPerImage = durationInFrames / safeImages.length;

  // 3. LÓGICA DE LEGENDA (KARAOKÊ)
  const currentTime = frame / fps;
  const activeCaption = (captions || []).find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* CAMADA 1: ÁUDIO */}
      {audioBase64 && <Audio src={audioBase64} />}

      {/* CAMADA 2: IMAGENS */}
      <AbsoluteFill>
        {safeImages.map((src, index) => {
          // --- MATEMÁTICA RÍGIDA PARA FRAMES (SEM DECIMAIS) ---
          
          // Frame inicial desta imagem (arredondado para baixo)
          const startFrame = Math.floor(index * durationPerImage);
          
          // Frame final: Se for a última imagem, vai até o fim do vídeo. 
          // Se não, vai até o início da próxima.
          const endFrame = index === safeImages.length - 1 
            ? durationInFrames 
            : Math.floor((index + 1) * durationPerImage);
            
          // Duração exata desta cena
          const duration = endFrame - startFrame;

          // Se a duração for inválida (<= 0), não renderiza (evita crash)
          if (duration <= 0) return null;

          // Efeito Ken Burns (Zoom)
          const frameSinceStart = frame - startFrame;
          const scale = interpolate(
            frameSinceStart,
            [0, duration],
            [1, 1.15],
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
              // Removi layout="none" pois pode dar erro em versões antigas. 
              // AbsoluteFill abaixo resolve o posicionamento.
            >
              <AbsoluteFill style={{ overflow: "hidden" }}>
                <Img
                  src={src}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${scale})`,
                  }}
                  // Fallback visual silencioso
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none'; 
                  }}
                />
                {/* Sombra Gradiente para a legenda aparecer melhor */}
                <div 
                  style={{ 
                    position: "absolute", 
                    inset: 0, 
                    background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)" 
                  }} 
                />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* CAMADA 3: LEGENDA ANIMADA */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end", // Joga para baixo
          alignItems: "center",
          paddingBottom: "180px", // Margem inferior
        }}
      >
        {activeCaption ? (
          <WordAnimation 
            // Key força o React a reiniciar a animação a cada palavra nova
            key={activeCaption.start + activeCaption.word} 
            frame={frame} 
            fps={fps} 
            word={activeCaption.word} 
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SUB-COMPONENTE DE ANIMAÇÃO DE TEXTO ---
const WordAnimation = ({ frame, fps, word }: { frame: number; fps: number; word: string }) => {
  const scale = spring({
    frame: frame % 5, // Reinicia o spring a cada mount
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  return (
    <div style={{ transform: `scale(${scale})`, position: "relative", zIndex: 10 }}>
      <h1
        style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: "80px",
          textAlign: "center",
          color: "white",
          textTransform: "uppercase",
          // Borda preta sólida
          textShadow: 
            "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          margin: 0,
          padding: "0 20px"
        }}
      >
        <span style={{ color: "#fbbf24" }}>{word}</span>
      </h1>
    </div>
  );
};