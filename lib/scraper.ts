import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

export async function scrapeContent(url: string): Promise<string> {
  try {
    // Basic URL validation
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("Invalid protocol");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove chrome and noisy blocks
    ["script", "style", "nav", "footer", "header", "aside"].forEach((selector) => $(selector).remove());
    $("[role='navigation']").remove();
    $("[aria-label*='nav']").remove();

    const mainSelector = $("main").length ? "main" : $("article").length ? "article" : "body";

    const paragraphs: string[] = [];
    $(`${mainSelector} p`).each((_, element) => {
      const text = $(element).text().trim();
      if (text.length) {
        paragraphs.push(text);
      }
    });

    const cleanText = paragraphs.join("\n");
    if (!cleanText) {
      throw new Error("Empty content after parsing");
    }

    return cleanText.slice(0, 15000).trim();
  } catch (error) {
    console.error("[scraper] error", error);
    throw new Error("Unable to extract content from URL");
  }
}
