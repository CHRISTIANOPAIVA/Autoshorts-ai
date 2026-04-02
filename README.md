# AutoShorts AI

Gera automaticamente vídeos curtos (shorts) a partir de qualquer URL de artigo. Basta colar um link — a IA cria o roteiro, a narração, as imagens e monta o vídeo pronto para exportar.

## Como funciona

1. **Scraping** — extrai o conteúdo textual da URL fornecida
2. **Roteiro** — GPT-4o analisa o artigo, identifica o assunto principal, escreve uma narração em Português (BR) de ~60s e gera 7 prompts de imagem em inglês
3. **Narração** — OpenAI TTS (`tts-1`, voz `alloy`) converte o texto em áudio MP3
4. **Legendas** — Whisper (`whisper-1`) transcreve o áudio com timestamps por palavra
5. **Imagens** — DALL-E 3 gera 7 imagens `1024×1792` em paralelo (portrait/9:16)
6. **Preview** — Remotion Player renderiza o vídeo no navegador com imagens + áudio + legendas sincronizadas
7. **Exportação** — Remotion Renderer renderiza o MP4 no servidor com progresso via SSE e faz o download automaticamente

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 18 + Tailwind CSS 4 + Lucide React |
| IA — texto | GPT-4o via Vercel AI SDK |
| IA — áudio | OpenAI TTS-1 + Whisper-1 |
| IA — imagens | DALL-E 3 |
| Vídeo | Remotion 4 |
| Validação | Zod |

## Pré-requisitos

- Node.js 18+
- Chave de API da OpenAI com acesso a GPT-4o, TTS, Whisper e DALL-E 3

## Configuração

```bash
# Clone e instale dependências
npm install

# Crie o arquivo de variáveis de ambiente
cp .env.example .env.local
```

Preencha `.env.local`:

```env
OPENAI_API_KEY=sk-...
```

## Executar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), cole um URL de artigo e clique em **Gerar Vídeo**.

## Build de produção

```bash
npm run build
npm start
```

## Estrutura do projeto

```
app/
├── page.tsx                  # Interface principal (client component)
├── api/
│   ├── create-script/        # GPT-4o: roteiro + prompts de imagem
│   ├── generate-audio/       # TTS + Whisper (captions)
│   ├── generate-images/      # DALL-E 3 (7 imagens em paralelo)
│   └── export-video/         # Remotion Renderer → MP4 via SSE
└── remotion/
    ├── myvideo.tsx            # Composição Remotion (imagens + áudio + legendas)
    └── Root.tsx               # Registro da composição
lib/
└── scraper.ts                # Scraping de conteúdo de artigos (Cheerio)
```

## Observações

- A exportação do vídeo é feita server-side pelo Remotion Renderer e pode demorar alguns minutos dependendo da duração do áudio.
- O progresso da exportação é transmitido em tempo real via Server-Sent Events (SSE).
- Em caso de falha na geração de uma imagem individual, é usada uma imagem placeholder automática para não interromper o fluxo.
