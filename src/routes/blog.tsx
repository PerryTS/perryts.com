/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import { Layout } from '../layout.js';
import { site } from '../cms.js';
import { renderTipTap, renderMarkdown } from '@skelpo/site-kit';

function renderBody(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') return renderMarkdown(body);
  return renderTipTap(body as never);
}
import { localize, type Translator } from '../i18n.js';
import type { ContentPublic } from '@skelpo/cms-client';

const PageHead: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div class="pt-20 pb-10 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-amber-950/10 to-transparent">
    <div class="max-w-3xl mx-auto text-center">
      {eyebrow ? <div class="text-xs uppercase tracking-[0.18em] font-semibold text-amber-400 mb-3">{eyebrow}</div> : null}
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">{title}</h1>
      {subtitle ? <p class="text-lg text-slate-400">{subtitle}</p> : null}
    </div>
  </div>
);

export const BlogIndex: FC<{
  posts: ContentPublic[]; t: Translator; locales: string[];
}> = ({ posts, t, locales }) => (
  <Layout
    title={`${t('nav.blog', 'Blog')} · Perry`}
    description="Engineering notes from the Perry native TypeScript compiler."
    site={site} t={t} locales={locales} pathForSwitcher="/blog"
  >
    <PageHead eyebrow={t('nav.blog', 'Blog')} title={t('nav.blog', 'Blog')} subtitle={`${posts.length} posts`} />
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <ul class="divide-y divide-white/5">
        {posts.map((p) => (
          <li class="py-8 first:pt-0">
            <a class="block group" href={p.url ?? '#'}>
              <h2 class="text-2xl font-semibold text-white group-hover:text-amber-300 transition-colors mb-2">{p.title}</h2>
              <div class="text-sm text-slate-500 mb-3">
                <time datetime={p.publishedAt ?? ''}>{(p.publishedAt ?? '').slice(0, 10)}</time>
                {Array.isArray(p.fields.tags) && p.fields.tags.length > 0
                  ? <> · <span>{(p.fields.tags as string[]).slice(0, 3).join(' · ')}</span></>
                  : null}
              </div>
              <p class="text-slate-400 leading-relaxed">{String(p.fields.excerpt ?? '')}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </Layout>
);

export const BlogPost: FC<{
  post: ContentPublic; t: Translator; locales: string[];
}> = ({ post, t, locales }) => (
  <Layout
    title={post.title} content={post} site={site}
    t={t} locales={locales}
    pathForSwitcher={`/blog/${post.slug}`}
    jsonLdImageUrl={`${site.url}/og/blog/${post.slug}.svg`}
  >
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header class="mb-10 pb-8 border-b border-white/5">
        <div class="text-sm text-amber-400 mb-2">
          <a href={localize('/blog', t.locale)} class="hover:text-amber-300">← {t('nav.blog', 'Blog')}</a>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">{post.title}</h1>
        <div class="text-sm text-slate-500">
          <time datetime={post.publishedAt ?? ''}>{(post.publishedAt ?? '').slice(0, 10)}</time>
        </div>
      </header>
      <div class="prose-content text-slate-300 leading-relaxed [&_p]:my-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-8 [&_h3]:mb-3 [&_a]:text-amber-300 [&_a:hover]:text-amber-200 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_code]:bg-amber-500/10 [&_code]:text-amber-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_pre]:bg-[#15161c] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-200 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400">
        {raw(renderBody(post.fields.body))}
      </div>
      <div class="mt-16 pt-8 border-t border-white/5 text-center">
        <a class="btn-secondary inline-block" href={localize('/blog', t.locale)}>← {t('nav.blog', 'Blog')}</a>
      </div>
    </article>
  </Layout>
);

export const NotFound: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title="404 · Perry" site={site} t={t} locales={locales} pathForSwitcher="/">
    <div class="max-w-md mx-auto px-4 py-32 text-center">
      <div class="text-7xl font-bold gradient-text mb-4">404</div>
      <p class="text-slate-400 mb-8">No content here.</p>
      <a class="btn-primary" href={localize('/', t.locale)}>← Home</a>
    </div>
  </Layout>
);
