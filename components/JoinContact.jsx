/**
 * Join Us / Contact — Layered style on slate-50
 * React + Tailwind. White cards with shadow, navy hover, lift + shadow-xl.
 */

const CARDS = [
  {
    id: 'student',
    label: 'For Students',
    title: 'Become an Analyst',
    desc: 'Join our rigorous training program and investment teams. We recruit every semester.',
    cta: 'View Recruitment Info',
    href: '#join',
  },
  {
    id: 'partner',
    label: 'For Partners',
    title: 'Partner with Us',
    desc: 'Connect with top talent in Boston and Seoul. We welcome corporate collaborations.',
    cta: 'Contact Executive Team',
    href: '#contact',
  },
];

export default function JoinContact() {
  return (
    <section
      id="join"
      className="bg-slate-50 py-16 md:py-20 px-6 md:px-8"
      aria-labelledby="join-contact-title"
    >
      <h2
        id="join-contact-title"
        className="text-slate-700 text-center font-semibold text-2xl md:text-4xl tracking-tight mb-8 md:mb-10"
      >
        Ready to Shape the Future?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-[900px] mx-auto">
        {CARDS.map((card) => (
          <a
            key={card.id}
            href={card.href}
            className="block bg-white rounded-2xl p-6 md:p-8 shadow-md transition-all duration-300 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-xl group"
            aria-labelledby={`join-card-${card.id}-title`}
          >
            <div className="flex flex-col items-start min-h-[200px]">
              <span className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2 transition-colors duration-300 group-hover:text-white">
                {card.label}
              </span>
              <h3
                id={`join-card-${card.id}-title`}
                className="text-lg md:text-xl font-semibold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-white"
              >
                {card.title}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-slate-600 mb-auto pb-4 transition-colors duration-300 group-hover:text-white">
                {card.desc}
              </p>
              <span className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5 transition-colors duration-300 group-hover:text-white">
                {card.cta}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
