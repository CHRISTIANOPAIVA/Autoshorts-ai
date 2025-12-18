import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { scrapeContent } from "@/lib/scraper";

export const maxDuration = 60;

// MUDAN€A 1: O Schema agora exige descri‡äes visuais, nÆo keywords soltas
const ScriptSchema = z.object({
  script_text: z.string().describe("O roteiro narrado completo, vibrante e engajador."),
  visual_keywords: z.array(z.string()).describe("5 a 7 prompts descritivos para um gerador de imagem AI. Devem descrever CENAS FÖSICAS."),
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL ‚ obrigat¢ria" }), { status: 400 });
    }

    console.log(`?? Iniciando scraping de: ${url}`);
    const pageContent = await scrapeContent(url);
    
    if (pageContent.length < 100) {
      return new Response(JSON.stringify({ error: "Conte£do insuficiente encontrado na p gina." }), { status: 422 });
    }

    console.log("?? Enviando para o GPT-4o...");
    
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: ScriptSchema,
      messages: [
        {
          role: "system",
          content: `Vocˆ ‚ um diretor de v¡deo experiente em criar conte£do viral. 
          
          SUA MISSÇO:
          1. Ler o texto fornecido.
          2. Criar um roteiro narrado de 60 segundos (aprox 150 palavras) que seja empolgante.
          
          IMPORTANTE SOBRE AS IMAGENS (visual_keywords):
          NÆo retorne palavras abstratas como "sucesso" ou "futuro". O gerador de imagens nÆo entende isso.
          Vocˆ deve retornar PROMPTS DESCRITIVOS de cenas f¡sicas em inglˆs.
          
          RUIM: ["happiness", "technology", "future"]
          BOM: ["a happy woman smiling holding a trophy", "a futuristic glowing microchip close up", "a cyberpunk city skyline at night"]
          
          Retorne APENAS o JSON.`
        },
        {
          role: "user",
          content: `Texto fonte:\n\n${pageContent}`
        }
      ],
    });

    return new Response(JSON.stringify(result.object), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno no servidor";
    console.error("? Erro na API create-script:", error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
