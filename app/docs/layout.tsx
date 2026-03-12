import { DocsShell } from '@/components/docs/DocsShell';
import { Footer } from '@/components/Footer';
import { getNav } from '@/lib/docs';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = getNav();

  return (
    <>
      <DocsShell nav={nav}>{children}</DocsShell>
      <Footer />
    </>
  );
}
