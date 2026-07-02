import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export interface WikiPage {
  slug: string;
  title: string;
  description: string;
  content: string;
  links: string[];
}

const modules = import.meta.glob("../content/wiki/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const name = path.split("/").pop()?.replace(".md", "") ?? "";
  return name;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1] ?? "Untitled";
}

function extractDescription(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      return trimmed.slice(0, 160);
    }
  }
  return "";
}

function extractLinks(content: string): string[] {
  const links = new Set<string>();
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.add(match[1].trim().toLowerCase().replace(/\s+/g, "-"));
  }
  return [...links];
}

function wikiLinkToHtml(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_m, slug: string, label?: string) => {
      const href = slug.trim().toLowerCase().replace(/\s+/g, "-");
      const text = label ?? slug.trim();
      return `[${text}](/docs/${href})`;
    }
  );
}

export function getAllWikiPages(): WikiPage[] {
  return Object.entries(modules)
    .map(([path, raw]) => {
      const slug = slugFromPath(path);
      const content = raw as string;
      return {
        slug,
        title: extractTitle(content),
        description: extractDescription(content),
        content,
        links: extractLinks(content),
      };
    })
    .sort((a, b) => {
      if (a.slug === "index") return -1;
      if (b.slug === "index") return 1;
      return a.title.localeCompare(b.title);
    });
}

export function getWikiPage(slug: string): WikiPage | null {
  const normalized = slug.replace(/^\//, "");
  const pages = getAllWikiPages();
  return pages.find((p) => p.slug === normalized) ?? null;
}

export function renderWikiMarkdown(content: string): string {
  return marked.parse(wikiLinkToHtml(content)) as string;
}

export function getBacklinks(slug: string): WikiPage[] {
  const normalized = slug.replace(/^\//, "");
  return getAllWikiPages().filter((p) => p.links.includes(normalized));
}
