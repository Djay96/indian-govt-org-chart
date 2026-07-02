import { Link, useParams } from "react-router-dom";
import {
  getWikiPage,
  getAllWikiPages,
  getBacklinks,
  renderWikiMarkdown,
} from "../lib/wiki";

function wikiPath(slug: string) {
  return slug ? `/docs/${slug}` : "/docs";
}

export default function WikiPage() {
  const { slug = "" } = useParams();
  const page = getWikiPage(slug);
  const allPages = getAllWikiPages();
  const backlinks = page ? getBacklinks(page.slug) : [];

  if (!page) {
    return (
      <div className="card p-8 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Page not found</h1>
        <Link to="/docs" className="text-saffron-600 hover:underline">
          ← Back to wiki index
        </Link>
      </div>
    );
  }

  const html = renderWikiMarkdown(page.content);

  return (
    <div className="grid lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1 space-y-4">
        <div className="card p-4 sticky top-24">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-3">
            Wiki Pages
          </h3>
          <nav className="space-y-1">
            {allPages.map((p) => (
              <Link
                key={p.slug || "index"}
                to={wikiPath(p.slug)}
                className={`block rounded-lg px-2 py-1.5 text-sm transition ${
                  p.slug === page.slug
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {p.title.replace(/^#+\s*/, "")}
              </Link>
            ))}
          </nav>

          {backlinks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-ink-100">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
                Backlinks
              </h4>
              <div className="space-y-1">
                {backlinks.map((bl) => (
                  <Link
                    key={bl.slug || "index"}
                    to={wikiPath(bl.slug)}
                    className="block text-sm text-saffron-600 hover:underline"
                  >
                    {bl.title.replace(/^#+\s*/, "")}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <article className="lg:col-span-3">
        <div className="card p-6 sm:p-8">
          <div
            className="wiki-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {page.links.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink-500 mb-2">
              Related pages
            </h3>
            <div className="flex flex-wrap gap-2">
              {page.links.map((link) => (
                <Link
                  key={link}
                  to={wikiPath(link)}
                  className="rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-700 hover:border-saffron-400 hover:text-saffron-700 transition"
                >
                  {link.replace(/-/g, " ")}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
