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

  // CÁLCULO DE SINCRONIA PRECISA
  // Temos certeza que imageUrls não é null porque o Page.tsx travou o carregamento
  const durationPerImage = durationInFrames / imageUrls.length;

  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audioBase64 && <Audio src={audioBase64} />}

      <AbsoluteFill>
        {imageUrls.map((src, index) => {
          // Matemática de frames inteiros para evitar falhas
          const startFrame = Math.floor(index * durationPerImage);
          
          // O último frame vai forçosamente até o fim do vídeo
          const endFrame = index === imageUrls.length - 1 
            ? durationInFrames 
            : Math.floor((index + 1) * durationPerImage);
            
          const duration = endFrame - startFrame;

          // Ken Burns suave
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
              // Sequence cria um contexto de tempo relativo
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

      {/* Legendas */}
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