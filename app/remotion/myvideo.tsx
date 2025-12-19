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
  const { fps, durationInFrames } = useVideoConfig();

  // GARANTIA: Se o Page.tsx fez o trabalho dele, aqui tem 7 imagens.
  // Se não, o fallback entra em ação.
  const images = imageUrls && imageUrls.length > 0 ? imageUrls : ["https://picsum.photos/seed/error/720/1280"];

  // CÁLCULO PRECISO: Frames Totais / Número de Imagens
  // Math.floor para evitar números quebrados, mas somamos o resto na última imagem
  const framesPerImage = Math.floor(durationInFrames / images.length);

  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audioBase64 && <Audio src={audioBase64} />}

      <AbsoluteFill>
        {images.map((src, index) => {
          const from = index * framesPerImage;
          
          // Lógica Especial para a Última Imagem:
          // Ela pega todos os frames restantes até o fim do vídeo.
          // Isso evita aquele "flash preto" de 1 frame no final por erro de arredondamento.
          const to = index === images.length - 1 
            ? durationInFrames 
            : (index + 1) * framesPerImage;
            
          const duration = to - from;

          // Se a duração for <= 0 por algum erro bizarro, pula
          if (duration <= 0) return null;

          const frameSinceStart = frame - from;
          const scale = interpolate(
            frameSinceStart,
            [0, duration],
            [1, 1.15],
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={index}
              from={from}
              durationInFrames={duration}
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
                />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: "150px", 
        }}
      >
        {activeCaption ? (
          <WordAnimation key={activeCaption.start + activeCaption.word} frame={frame} fps={fps} word={activeCaption.word} />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const WordAnimation = ({ frame, fps, word }: { frame: number; fps: number; word: string }) => {
  const scale = spring({
    frame: frame % 5,
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
          textShadow: "4px 4px 0 #000",
          margin: 0,
          padding: "0 20px"
        }}
      >
        <span style={{ color: "#fbbf24" }}>{word}</span>
      </h1>
    </div>
  );
};