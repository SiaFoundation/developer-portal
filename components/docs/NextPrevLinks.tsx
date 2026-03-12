import Link from 'next/link';

interface NavLink {
  title: string;
  slug: string[];
}

export function NextPrevLinks({
  prev,
  next,
}: {
  prev: NavLink | null;
  next: NavLink | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="flex justify-between gap-4 mt-12 pt-6 border-t border-[#2d2d2d] light:border-[#e0e0e0]">
      {prev ? (
        <Link
          href={`/docs/${prev.slug.join('/')}`}
          className="flex flex-col gap-1 text-left group no-underline"
        >
          <span className="text-[11px] text-[#757575] uppercase tracking-wider">
            Previous
          </span>
          <span className="text-[14px] text-[#0099ff] group-hover:underline">
            &larr; {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug.join('/')}`}
          className="flex flex-col gap-1 text-right group no-underline"
        >
          <span className="text-[11px] text-[#757575] uppercase tracking-wider">
            Next
          </span>
          <span className="text-[14px] text-[#0099ff] group-hover:underline">
            {next.title} &rarr;
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
