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

// CORREÇÃO: Removemos "React.FC<MyVideoProps>" e tipamos direto nos props
// Use React.FC so Remotion's Composition prop accepts the component type
export const MyVideo: React.FC<MyVideoProps> = ({
  audioBase64,
  captions,
  imageUrls,
}: MyVideoProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // width não estava sendo usado

  // 1. Tratamento de Fallbacks
  const finalImages =
    imageUrls && imageUrls.length > 0
      ? imageUrls
      : Array(5)
          .fill(0)
          .map((_, i) => `https://picsum.photos/seed/${i + 55}/1080/1920`);

  // 2. Cálculo da duração
  const durationInSeconds = captions.length > 0 ? captions[captions.length - 1].end : 30;
  const totalFrames = Math.ceil(durationInSeconds * fps);
  const durationPerImage = totalFrames / (finalImages.length || 1);

  // 3. Lógica da Legenda
  const currentTime = frame / fps;
  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  return (
    // style={{...}} é necessário no Remotion, ignore o aviso de lint sobre CSS inline
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* CAMADA 1: ÁUDIO */}
      {audioBase64 && <Audio src={audioBase64} />}

      {/* CAMADA 2: BACKGROUND */}
      <AbsoluteFill>
        {finalImages.map((src, index) => {
          const from = index * durationPerImage;
          const startFrame = index * durationPerImage;
          
          const scale = interpolate(
            frame - startFrame,
            [0, durationPerImage],
            [1, 1.15],
            { extrapolateRight: "clamp" }
          );

          return (
            <Sequence
              key={index}
              from={Math.floor(from)}
              durationInFrames={Math.ceil(durationPerImage)}
            >
              <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${scale})`,
                  }}
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* CAMADA 3: LEGENDAS */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          top: "25%",
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
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <div style={{ transform: `scale(${scale})` }}>
      <h1 className="text-6xl md:text-8xl font-black text-center text-white uppercase leading-tight drop-shadow-xl"
          style={{ 
            WebkitTextStroke: "3px black",
            textShadow: "0px 4px 20px rgba(0,0,0,0.8)" 
          }}>
        <span className="text-yellow-400">
          {word}
        </span>
      </h1>
    </div>
  );
};
