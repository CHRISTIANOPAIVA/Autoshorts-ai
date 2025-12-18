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

  // 1. Fallbacks de segurança
  const validImages = imageUrls && imageUrls.length > 0 ? imageUrls : ["https://picsum.photos/seed/fallback/720/1280"];

  // 2. Tempo por imagem (Troca a cada 4 segundos ou divide igualmente se for curto)
  // Se o vídeo for longo, fixamos em 4s por imagem para dar dinamismo
  const framesPerImage = 120; 
  const totalScenes = Math.ceil(durationInFrames / framesPerImage);

  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audioBase64 && <Audio src={audioBase64} />}

      {/* Camada de Imagens em Loop */}
      <AbsoluteFill>
        {Array.from({ length: totalScenes }).map((_, i) => {
          // Loop infinito das imagens disponíveis
          const src = validImages[i % validImages.length];
          const startFrame = i * framesPerImage;
          
          const frameSinceStart = frame - startFrame;
          const scale = interpolate(
            frameSinceStart,
            [0, framesPerImage],
            [1, 1.15], // Zoom suave
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={i}
              from={startFrame}
              durationInFrames={framesPerImage}
              layout="none"
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
                  // Se der erro, fica transparente e mostra o fundo preto (menos feio que erro crítico)
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* Camada de Legendas */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: "150px", 
        }}
      >
        {activeCaption ? (
          <WordAnimation key={activeCaption.start} frame={frame} fps={fps} word={activeCaption.word} />
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

