import type { Metadata } from 'next';
import { buildMetadata, SITE } from '@/lib/seo';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export const metadata: Metadata = buildMetadata({
  title: SITE.name,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    url: SITE.url,
  },
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-[#0d0f10]">
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
    </div>
  );
}
