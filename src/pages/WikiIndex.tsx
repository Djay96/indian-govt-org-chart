import { Link } from "react-router-dom";
import { getAllWikiPages } from "../lib/wiki";

export default function WikiIndex() {
  const pages = getAllWikiPages();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-950">
          Documentation Wiki
        </h1>
        <p className="text-ink-600 mt-2 max-w-2xl">
          A connected knowledge base about government accountability data in India.
          Pages link to each other — follow the trail to build intuition, like
          wandering through a well-organized notebook.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page) => (
          <Link
            key={page.slug}
            to={`/docs/${page.slug}`}
            className="card p-5 hover:border-saffron-400 hover:shadow-md transition group"
          >
            <h2 className="font-display text-lg font-semibold text-ink-900 group-hover:text-saffron-700">
              {page.title.replace(/^#+\s*/, "")}
            </h2>
            <p className="text-sm text-ink-500 mt-2 line-clamp-3">
              {page.description}
            </p>
            {page.links.length > 0 && (
              <p className="text-xs text-ink-400 mt-3">
                Links to {page.links.length} related page
                {page.links.length !== 1 ? "s" : ""}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
