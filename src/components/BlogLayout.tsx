import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

export function BlogLayout({
  post,
  children,
}: {
  post: BlogPost;
  children: React.ReactNode;
}) {
  return (
    <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16l-4-4m0 0l4-4m-4 4h18"
            />
          </svg>
          Back to Blog
        </Link>

        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{post.title}</h1>

        <time className="text-sm text-slate-500 block mb-12">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>

        <div className="prose prose-invert prose-slate max-w-none [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-12 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:text-slate-300 [&>p]:leading-relaxed [&>p]:mb-6 [&>ul]:text-slate-300 [&>ul]:mb-6 [&>ul]:space-y-2 [&>ul>li]:pl-2 [&>ol]:text-slate-300 [&>ol]:mb-6 [&>ol]:space-y-2">
          {children}
        </div>
      </div>
    </article>
  );
}
