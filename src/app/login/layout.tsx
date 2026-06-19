import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Acessar plataforma",
  description:
    "Acesse o Monhang Editor 3D e entre no fluxo do conhecimento. Plataforma brasileira de modelagem, cenas e materiais 3D com inteligência artificial.",
  keywords: [
    "login Monhang",
    "acessar editor 3D",
    "plataforma modelagem 3D",
    "editor 3D brasileiro login",
  ],
  alternates: {
    canonical: `${SITE.url}/login`,
  },
  openGraph: {
    title: "Acessar Monhang Editor 3D",
    description:
      "Entre na plataforma brasileira de modelagem 3D com inteligência artificial. Tecnologia, território e conhecimento.",
    url: `${SITE.url}/login`,
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
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
    title: "Acessar Monhang Editor 3D",
    description:
      "Entre na plataforma brasileira de modelagem 3D com inteligência artificial.",
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
