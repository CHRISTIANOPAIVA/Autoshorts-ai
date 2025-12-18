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
  const { fps, durationInFrames } = useVideoConfig(); // Pegamos a duração total exata do vídeo

  // 1. Fallback robusto
  const finalImages =
    imageUrls && imageUrls.length > 0
      ? imageUrls
      : ["https://picsum.photos/seed/fallback/1080/1920"];

  // 2. Cálculo Matemático Preciso
  // Dividimos o total de frames pelo número de imagens
  const durationPerImage = durationInFrames / finalImages.length;

  // 3. Lógica da Legenda Atual
  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {audioBase64 && <Audio src={audioBase64} />}

      <AbsoluteFill>
        {finalImages.map((src, index) => {
          // Onde começa
          const fromFrame = Math.floor(index * durationPerImage);
          
          // Onde termina: Se for a última imagem, vai até o fim do vídeo
          // Se não, vai até o começo da próxima
          const isLastImage = index === finalImages.length - 1;
          const endFrame = isLastImage ? durationInFrames : Math.floor((index + 1) * durationPerImage);
          
          const duration = endFrame - fromFrame;

          // Ken Burns
          const frameSinceStart = frame - fromFrame;
          const scale = interpolate(
            frameSinceStart,
            [0, duration],
            [1, 1.15],
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={index}
              from={fromFrame}
              durationInFrames={duration} // Agora usamos a duração exata calculada
              layout="none" // Importante para não criar divs extras
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
                  // Fallback se a imagem da Pollinations falhar
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://picsum.photos/seed/error/1080/1920";
                  }}
                />
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
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
          <WordAnimation frame={frame} fps={fps} word={activeCaption.word} />
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
          fontFamily: "Montserrat, sans-serif", // Fonte mais moderna
          fontWeight: 900,
          fontSize: "85px",
          textAlign: "center",
          color: "white",
          textTransform: "uppercase",
          lineHeight: 1,
          textShadow: "4px 4px 0 #000", // Sombra dura estilo TikTok
          padding: "0 20px"
        }}
      >
        <span style={{ color: "#fbbf24" }}>{word}</span>
      </h1>
    </div>
  );
};