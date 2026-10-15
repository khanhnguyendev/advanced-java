import { serializeJsonLd, type JsonLd as JsonLdData } from '@/lib/jsonld';

export function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
