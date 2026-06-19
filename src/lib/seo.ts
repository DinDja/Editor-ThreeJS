import type { Metadata } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monhang.com.br";

export const SITE = {
  name: "Monhang Editor 3D",
  shortName: "Monhang",
  tagline: "Entre no fluxo do conhecimento",
  description:
    "Editor 3D institucional guiado por tecnologia, território e inteligência. Modelagem, cena, materiais e IA em uma plataforma brasileira.",
  url: BASE_URL,
  locale: "pt_BR",
  author: "Monhang",
  creator: "Monhang",
  publisher: "Monhang",
  keywords: [
    "editor 3D",
    "modelagem 3D",
    "Three.js",
    "inteligência artificial",
    "cenas 3D",
    "materiais 3D",
    "renderização",
    "geometria",
    "Monhang",
    "plataforma brasileira",
    "editor 3D brasileiro",
    "tecnologia territorial",
    "arandu",
  ],
  ogImage: "/og-image.png",
} as const;

export function buildMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} — ${SITE.tagline}`,
      template: `%s | ${SITE.name}`,
    },
    description: SITE.description,
    keywords: [...SITE.keywords],
    authors: [{ name: SITE.author }],
    creator: SITE.creator,
    publisher: SITE.publisher,
    applicationName: SITE.shortName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: SITE.url,
      siteName: SITE.name,
      title: `${SITE.name} — ${SITE.tagline}`,
      description: SITE.description,
      images: [
        {
          url: SITE.ogImage,
          width: 1200,
          height: 630,
          alt: SITE.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE.name} — ${SITE.tagline}`,
      description: SITE.description,
      images: [SITE.ogImage],
    },
    icons: {
      icon: "/icon.png",
      shortcut: "/icon.png",
    },
    alternates: {
      canonical: SITE.url,
    },
    ...overrides,
  };
}
