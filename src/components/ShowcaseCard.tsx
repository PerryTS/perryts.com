import Image from "next/image";
import Link from "next/link";
import type { ShowcaseProject } from "@/lib/showcase";

export function ShowcaseCard({ project }: { project: ShowcaseProject }) {
  const href = project.hasFeaturePage
    ? `/showcase/${project.slug}`
    : project.githubUrl;
  const isExternal = !project.hasFeaturePage;

  const content = (
    <div className="feature-card block group h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          {project.platforms.map((platform) => (
            <span
              key={platform}
              className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            >
              {platform}
            </span>
          ))}
        </div>
        {project.logoUrl && (
          <Image
            src={project.logoUrl}
            alt={`${project.name} logo`}
            width={40}
            height={40}
            className="rounded-lg shrink-0 ml-3"
          />
        )}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-perry-400 transition-colors">
        {project.name}
      </h3>
      <p className="text-sm text-slate-500 mb-3">{project.tagline}</p>
      <p className="text-slate-400 text-sm mb-4 flex-1">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
