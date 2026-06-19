import { SITE } from "@/lib/seo";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Windows, macOS, Linux",
  inLanguage: "pt-BR",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
  author: {
    "@type": "Organization",
    name: SITE.author,
    url: SITE.url,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: "pt-BR",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.author,
  url: SITE.url,
  description: SITE.description,
};

export function JsonLd() {
  const merged = [webAppJsonLd, websiteJsonLd, orgJsonLd];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(merged) }}
    />
  );
}
