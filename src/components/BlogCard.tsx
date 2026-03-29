import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import type { BlogPost } from "@/lib/blog";

export async function BlogCard({ post }: { post: BlogPost }) {
  const locale = await getLocale();

  return (
    <Link href={`/blog/${post.slug}`} className="feature-card block group">
      <div className="flex flex-wrap gap-2 mb-3">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
          >
            {tag}
          </span>
        ))}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
        {post.title}
      </h3>
      <p className="text-slate-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
      <time className="text-xs text-slate-500">
        {new Date(post.date).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
    </Link>
  );
}
