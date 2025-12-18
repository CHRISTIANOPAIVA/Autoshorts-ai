import React from "react";
import { Composition } from "remotion";
// Mantendo o import em minúsculo conforme seu projeto
import { MyVideo, MyVideoProps } from "./myvideo";

// Dados Fakes para o Preview do Remotion Studio
const MOCK_DATA: MyVideoProps = {
  audioBase64: "", 
  imageUrls: [
    "https://picsum.photos/seed/tech/1080/1920",
    "https://picsum.photos/seed/nature/1080/1920",
    "https://picsum.photos/seed/city/1080/1920",
  ],
  captions: [
    { word: "TESTE", start: 0, end: 1 },
    { word: "DO", start: 1, end: 2 },
    { word: "VIDEO", start: 2, end: 3 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* CORREÇÃO: Removido <MyVideoProps> da tag Composition */}
      {/* O Remotion detecta os tipos automaticamente através do prop 'component' */}
      <Composition
        id="AutoShortsMain"
        component={MyVideo as any}
        durationInFrames={30 * 4}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={MOCK_DATA}
      />
    </>
  );
};