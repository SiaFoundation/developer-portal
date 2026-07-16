import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroCode } from '@/components/HeroCode';
import { getHeroExamples } from '@/lib/hero-snippets';

export const metadata: Metadata = {
  title:
    'Sia Developer Portal — Build private, user-owned storage into any app',
  description:
    'Add encrypted, user-owned storage to browser, mobile, desktop, and server apps with the Sia Storage SDK. No storage infrastructure to operate.',
};

const STEPS = [
  { number: '01', title: 'Install the SDK', href: '/docs/quickstart' },
  {
    number: '02',
    title: 'Connect a storage account',
    href: '/docs/quickstart/connect-to-an-indexer',
  },
  {
    number: '03',
    title: 'Store an object',
    href: '/docs/quickstart/upload-an-object',
  },
  {
    number: '04',
    title: 'Download it back',
    href: '/docs/quickstart/download-an-object',
  },
];

const USE_CASES = [
  {
    title: 'Photo backup',
    description: 'Back up camera rolls to storage the user owns.',
  },
  {
    title: 'Desktop sync',
    description: `Keep folders in sync across a user's devices.`,
  },
  {
    title: 'Encrypted documents',
    description: 'Store records nobody but the user can read.',
  },
  {
    title: 'Media archives',
    description: 'Archive large video and audio libraries durably.',
  },
  {
    title: 'User-controlled app data',
    description: 'Give users data that outlives your service.',
  },
  {
    title: 'File sharing',
    description: 'Share objects with public or time-limited links.',
  },
];

const REASONS = [
  {
    title: 'Private by default',
    description: `Data and metadata are encrypted on the user's device before they touch the network. The coordination service and storage providers never see plaintext — there is nothing for a provider to read, scan, or leak.`,
  },
  {
    title: 'No infrastructure to run',
    description:
      'The SDK talks directly to the network from your app. There are no buckets to provision, no servers to operate, and no per-app backend required just to store files.',
  },
  {
    title: 'Durable by design',
    description:
      'Every object is erasure-coded into 30 shards spread across independent storage providers worldwide. Any 10 shards reconstruct the data, so it survives even if 20 of the 30 providers go offline.',
  },
  {
    title: 'No lock-in',
    description:
      'Sia is an open network. Your app can use the hosted indexer, a third-party one, or your own — and users hold the keys to their data either way.',
  },
];

const SDKS = [
  {
    name: 'Rust',
    install: 'cargo add sia_storage',
    href: 'https://docs.rs/sia_storage',
  },
  {
    name: 'Go',
    install: 'go get go.sia.tech/siastorage@latest',
    href: 'https://pkg.go.dev/go.sia.tech/siastorage',
  },
  {
    name: 'Python',
    install: 'pip install sia-storage',
    href: 'https://pypi.org/project/sia-storage/',
  },
  {
    name: 'Dart',
    install: 'dart pub add sia_storage',
    href: 'https://pub.dev/packages/sia_storage',
  },
  {
    name: 'JavaScript',
    install: 'npm install @siafoundation/sia-storage',
    href: 'https://www.npmjs.com/package/@siafoundation/sia-storage',
  },
];

function ArchitectureFlow() {
  const nodes = [
    {
      title: 'Your app',
      dot: 'bg-[#FF7919]',
      description: `The SDK encrypts and erasure-codes data locally. Keys stay on the user's device.`,
    },
    {
      title: 'Indexer',
      dot: 'bg-[#E50AAE]',
      description:
        'Tracks encrypted object records and keeps data healthy. Hosted by Sia Storage or self-hosted — it never sees plaintext.',
    },
    {
      title: 'Storage providers',
      dot: 'bg-[#36D955]',
      description:
        'Independent nodes worldwide store encrypted shards — never filenames, metadata, or readable data.',
    },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:items-stretch">
      {nodes.map((node, i) => (
        <div key={node.title} className="contents">
          {i > 0 && (
            <div
              aria-hidden
              className="hidden md:flex items-center px-2 text-[#757575] light:text-[#999] font-mono text-[13px]"
            >
              ⇄
            </div>
          )}
          <div className="flex-1 rounded-lg border border-[#2d2d2d] light:border-[#e0e0e0] p-5">
            <h3 className="m-0 flex items-center gap-2 text-[14px] font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
              <span
                aria-hidden
                className={`inline-block h-2 w-2 rounded-full ${node.dot}`}
              />
              {node.title}
            </h3>
            <p className="mt-2 mb-0 text-[13px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
              {node.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const heroExamples = await getHeroExamples();
  return (
    <>
      <Header />
      <main className="pt-[50px] bg-[#0f0f0f] light:bg-white min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[720px] rounded-full bg-(--accent)/[0.07] blur-3xl light:hidden"
          />
          <div className="relative max-w-5xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-12 grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="m-0 font-mono text-[12px] uppercase tracking-widest text-(--accent)">
                Sia Storage SDK
              </p>
              <h1 className="mt-3 mb-0 text-3xl md:text-[2.5rem] md:leading-[1.15] font-semibold tracking-tight text-[#e7e7e7] light:text-[#1a1a1a]">
                Build private, user-owned storage into any app.
              </h1>
              <p className="mt-4 mb-0 text-[15px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
                Sia is a decentralized storage network. The SDK encrypts data on
                the user's device, spreads it across independent storage
                providers worldwide, and gets it back on demand — with no
                storage infrastructure for you to operate.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/docs/quickstart"
                  className="rounded-md bg-(--accent) px-5 py-2.5 text-[14px] font-medium text-[#1D2609] light:text-[#EFF2ED] no-underline hover:bg-(--accent)/85 transition-colors"
                >
                  Start building
                </Link>
                <Link
                  href="/docs/core-concepts/trust-and-deployment"
                  className="rounded-md border border-[#2d2d2d] light:border-[#e0e0e0] px-5 py-2.5 text-[14px] font-medium text-[#e7e7e7] light:text-[#1a1a1a] no-underline hover:border-(--accent) transition-colors"
                >
                  How it works
                </Link>
              </div>
            </div>
            <HeroCode examples={heroExamples} />
          </div>
          <div className="max-w-5xl mx-auto px-4 md:px-8 pb-14">
            <ol className="m-0 p-0 list-none grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 border-t border-[#2d2d2d] light:border-[#e0e0e0] pt-6">
              {STEPS.map((step) => (
                <li key={step.number}>
                  <Link href={step.href} className="group no-underline">
                    <span className="block font-mono text-[11px] text-(--accent)">
                      {step.number}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium text-[#e7e7e7] light:text-[#1a1a1a] group-hover:text-(--accent) transition-colors">
                      {step.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
          <h2 className="m-0 text-xl font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
            How it works
          </h2>
          <p className="mt-3 mb-6 max-w-2xl text-[14px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
            Your app sends encrypted data directly to storage providers and
            coordinates through an indexer, which stores only encrypted records.
            Users approve your app once, then own their data independently of
            you.
          </p>
          <ArchitectureFlow />
          <p className="mt-5 mb-0 text-[13px] text-[#757575] light:text-[#999]">
            The{' '}
            <Link
              href="/docs/core-concepts/trust-and-deployment"
              className="text-(--accent) no-underline hover:underline"
            >
              trust &amp; deployment model
            </Link>{' '}
            covers what the indexer can see, who pays for storage, and what
            happens if it goes offline.
          </p>
        </section>

        {/* Use cases */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
          <h2 className="m-0 text-xl font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
            What can you build?
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-lg bg-[#171717] light:bg-[#f6f8fa] p-4"
              >
                <h3 className="m-0 text-[14px] font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
                  {useCase.title}
                </h3>
                <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Sia */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
          <h2 className="m-0 text-xl font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
            Why Sia?
          </h2>
          <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
            {REASONS.map((reason) => (
              <div
                key={reason.title}
                className="border-l-2 border-[#2d2d2d] light:border-[#e0e0e0] pl-4"
              >
                <h3 className="m-0 text-[14px] font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
                  {reason.title}
                </h3>
                <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SDKs */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
          <h2 className="m-0 text-xl font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
            Pick your SDK
          </h2>
          <p className="mt-3 mb-6 max-w-2xl text-[14px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
            First-party SDKs for Rust, Go, Python, Dart, and JavaScript — the
            JavaScript SDK runs in Node and the browser, and the Dart SDK
            supports Flutter on mobile and desktop.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SDKS.map((sdk) => (
              <div
                key={sdk.name}
                className="rounded-lg border border-[#2d2d2d] light:border-[#e0e0e0] p-4 flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 text-[14px] font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
                    {sdk.name}
                  </h3>
                  <a
                    href={sdk.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-(--accent) no-underline hover:underline"
                  >
                    Reference →
                  </a>
                </div>
                <code className="block rounded-md bg-[#0d1117] light:bg-[#f6f8fa] border border-[#2d2d2d] light:border-[#e0e0e0] px-3 py-2 text-[12px] text-[#e7e7e7] light:text-[#1a1a1a] overflow-x-auto whitespace-nowrap">
                  <span className="select-none text-[#757575] light:text-[#6e7781]">
                    ${' '}
                  </span>
                  {sdk.install}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* Hosted vs self-hosted + CTA */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
          <h2 className="m-0 text-xl font-semibold text-[#e7e7e7] light:text-[#1a1a1a]">
            Start free
          </h2>
          <p className="mt-3 mb-0 max-w-2xl text-[14px] leading-relaxed text-[#b0b0b0] light:text-[#374151]">
            <a
              href="https://sia.storage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--accent) no-underline hover:underline"
            >
              sia.storage
            </a>{' '}
            is a hosted indexer with a 50GB free tier and no setup. And because
            the SDK works with any Sia indexer, including self-hosted ones,
            you're never locked in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs/quickstart"
              className="rounded-md bg-(--accent) px-5 py-2.5 text-[14px] font-medium text-[#1D2609] light:text-[#EFF2ED] no-underline hover:bg-(--accent)/85 transition-colors"
            >
              Follow the quickstart
            </Link>
            <Link
              href="/docs/core-concepts/apps"
              className="rounded-md border border-[#2d2d2d] light:border-[#e0e0e0] px-5 py-2.5 text-[14px] font-medium text-[#e7e7e7] light:text-[#1a1a1a] no-underline hover:border-(--accent) transition-colors"
            >
              Explore the concepts
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
