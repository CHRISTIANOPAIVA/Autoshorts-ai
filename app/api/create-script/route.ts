import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { scrapeContent } from "@/lib/scraper";

export const maxDuration = 60;

const ScriptSchema = z.object({
  script_text: z.string().describe("O guião narrado completo em Português."),
  visual_keywords: z.array(z.string())
    .min(7)
    .describe("7 descrições visuais FÍSICAS em Inglês para o gerador de imagem."),
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) return new Response(JSON.stringify({ error: "URL obrigatório" }), { status: 400 });

    const pageContent = await scrapeContent(url);
    
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: ScriptSchema,
      messages: [
        {
          role: "system",
          content: `Atue como um Especialista em Engenharia de Prompt Visual.
          
          TAREFA:
          1. Analise o texto e crie uma narração engajadora de 60s.
          2. Crie 7 PROMPTS PARA IMAGENS que ilustrem o conteúdo.
          
          REGRA DE OURO (CONTEXTO VISUAL):
          O gerador de imagens é literal. Você NÃO deve usar nomes próprios ambíguos ou conceitos abstratos. Você deve "traduzir" o conceito para uma CENA FÍSICA.
          
          DIRETRIZES GERAIS PARA QUALQUER ASSUNTO:
          
          1. SE FOR UMA EMPRESA (Ex: Apple, Shell, Amazon):
             - Não use apenas o nome. Descreva o prédio, a loja, o produto físico ou o logotipo brilhante em um escritório moderno.
             
          2. SE FOR UM ANIMAL OU SER VIVO COM NOME COMPOSTO:
             - Descreva a aparência física do animal.
             - Exemplo: Não diga "Sea Horse", diga "small aquatic creature with a curved tail underwater".
             
          3. SE FOR UM CONCEITO ABSTRATO (Ex: Economia, Amor, Política):
             - Use uma metáfora visual.
             - Exemplo: "Economia" -> "stock market chart with rising arrows on a screen".
             
          4. SE FOR UM LUGAR:
             - Descreva a arquitetura, o clima e a iluminação.
             
          O SEU OBJETIVO É EVITAR ALUCINAÇÕES DA IA DESCREVENDO A CENA VISUAL EXATA.`
        },
        { role: "user", content: `Conteúdo original:\n${pageContent}` }
      ],
    });

    return new Response(JSON.stringify(result.object), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}