export function DocHeader({
  catalogId,
  title,
  titleLang,
}: {
  catalogId: string;
  title: string;
  /** BCP-47 tag of the language the title is written in; omitted when unknown (slug fallback). */
  titleLang?: string;
}) {
  return (
    <header className="doc-header">
      <p className="doc-id mono">{catalogId}</p>
      <h1 lang={titleLang}>{title}</h1>
    </header>
  );
}
