/**
 * Core Divisions (핵심 활동) — React + Tailwind
 * Dark & Luxury theme. Use in a project with Tailwind CSS configured.
 */

const divisions = [
  {
    id: 'equity-research',
    title: 'Equity Research Team',
    description:
      'Conducting in-depth fundamental analysis and publishing industry reports.',
    href: '#research',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
  },
  {
    id: 'investment',
    title: 'Investment Team',
    description:
      'Managing active portfolios with disciplined investment strategies.',
    href: '#activity',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 4 5-5" />
        <path d="M11 10v4" />
      </svg>
    ),
  },
  {
    id: 'case-competition',
    title: 'Case Competition Team',
    description:
      'Analyzing complex M&A scenarios and valuation modeling.',
    href: '#activity',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 14c-1.5 0-2.5-.5-3-1.5S2.5 9 4 8" />
        <path d="M18 14c1.5 0 2.5-.5 3-1.5s.5-3.5-1-4.5" />
        <path d="M4 12h16" />
        <path d="M10 12c0 2.2 1.8 4 4 4s4-1.8 4-4" />
      </svg>
    ),
  },
];

export default function CoreDivisions() {
  return (
    <section
      id="divisions"
      className="bg-slate-900 py-16 md:py-20 px-6 md:px-8"
      aria-labelledby="core-divisions-title"
    >
      <div className="max-w-[1400px] mx-auto">
        <h2
          id="core-divisions-title"
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white text-center mb-10"
        >
          Core Divisions{' '}
          <span className="block text-base font-normal text-white/60 tracking-wide mt-0.5">
            핵심 활동
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {divisions.map((division) => (
            <article
              key={division.id}
              className="bg-slate-900/55 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col items-start transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/20"
            >
              <div
                className="text-white/85 mb-4 [&_svg]:block"
                aria-hidden
              >
                {division.icon}
              </div>
              <h3 className="text-[1.0625rem] font-semibold tracking-tight text-white mb-2">
                {division.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/65 mb-5 flex-grow">
                {division.description}
              </p>
              <a
                href={division.href}
                className="text-[0.8125rem] font-medium text-white/80 inline-flex items-center gap-1.5 hover:text-white hover:gap-2 transition-all duration-200"
              >
                Learn more <span aria-hidden>→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
