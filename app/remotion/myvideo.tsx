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

export const MyVideo = ({
  audioBase64,
  captions,
  imageUrls,
}: MyVideoProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Fallback: Se não vier imagens, usa placeholders (Evita tela preta)
  const finalImages =
    imageUrls && imageUrls.length > 0
      ? imageUrls
      : [
          "https://picsum.photos/seed/fallback1/1080/1920",
          "https://picsum.photos/seed/fallback2/1080/1920",
        ];

  // 2. Cálculo de duração
  // Garante que o vídeo tenha no mínimo 5 segundos se não houver legendas
  const durationInSeconds = 
    captions && captions.length > 0 
      ? captions[captions.length - 1].end + 1 // +1s de margem no final
      : 5;
      
  const totalFrames = Math.ceil(durationInSeconds * fps);
  
  // Garante que durationPerImage nunca seja Zero ou Infinito
  const durationPerImage = totalFrames / finalImages.length;

  // 3. Lógica da Legenda Atual
  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* --- CAMADA 1: ÁUDIO --- */}
      {audioBase64 && <Audio src={audioBase64} />}

      {/* --- CAMADA 2: BACKGROUND (IMAGENS) --- */}
      <AbsoluteFill>
        {finalImages.map((src, index) => {
          // Onde essa imagem começa na timeline
          const fromFrame = Math.floor(index * durationPerImage);
          // Quanto tempo ela dura
          const durationFrame = Math.ceil(durationPerImage);

          // Efeito Ken Burns (Zoom Lento)
          // Calculamos o progresso baseado no tempo de vida DESTA imagem
          const frameSinceStart = frame - fromFrame;
          
          const scale = interpolate(
            frameSinceStart,
            [0, durationFrame],
            [1, 1.15], // Zoom de 100% para 115%
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={index}
              from={fromFrame}
              durationInFrames={durationFrame}
            >
              {/* FIX CRÍTICO: AbsoluteFill garante que a div ocupe 1080x1920 exato */}
              <AbsoluteFill style={{ overflow: "hidden" }}>
                <Img
                  src={src}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover", // Garante que a imagem preencha tudo sem distorcer
                    transform: `scale(${scale})`,
                  }}
                />
                {/* Overlay escuro para melhorar leitura do texto */}
                <div 
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0,0,0,0.3)" 
                  }} 
                />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* --- CAMADA 3: LEGENDAS --- */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          // Sobe um pouco o texto para não ficar no rodapé
          paddingBottom: "150px", 
        }}
      >
        {activeCaption ? (
          <WordAnimation frame={frame} fps={fps} word={activeCaption.word} />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Componente visual do texto (extraído para performance)
const WordAnimation = ({ frame, fps, word }: { frame: number; fps: number; word: string }) => {
  const scale = spring({
    frame: frame % 5,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <div style={{ transform: `scale(${scale})`, position: "relative", zIndex: 10 }}>
      <h1
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: "90px",
          textAlign: "center",
          color: "white",
          textTransform: "uppercase",
          lineHeight: 1,
          margin: 0,
          // Borda preta grossa para leitura em qualquer fundo
          textShadow: 
            "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
        }}
      >
        <span style={{ color: "#fbbf24" }}> {/* Amarelo Ouro */}
          {word}
        </span>
      </h1>
    </div>
  );
};