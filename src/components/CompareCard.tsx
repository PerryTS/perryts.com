import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { CompareItem } from "@/lib/compare";

export async function CompareCard({ item }: { item: CompareItem }) {
  const t = await getTranslations("compare");
  const ui = await getTranslations("compare.ui");

  const title = t(`items.${item.slug}.title`);
  const tldr = t(`items.${item.slug}.tldr`);
  const categoryLabel = ui(`category.${item.category}`);

  return (
    <Link href={`/compare/${item.slug}`} className="feature-card block group">
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
          {categoryLabel}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
        {title}
      </h3>
      <p className="text-slate-400 text-sm line-clamp-3">{tldr}</p>
    </Link>
  );
}
