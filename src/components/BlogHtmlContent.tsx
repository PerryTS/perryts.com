export function BlogHtmlContent({ html }: { html: string }) {
  return (
    <div
      className="blog-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
