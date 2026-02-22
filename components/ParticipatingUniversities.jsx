/**
 * Participating Universities — Infinite Marquee
 * React + Tailwind. White section, grayscale logos, hover to color, fade mask.
 * Add to tailwind.config.js for animation:
 *   keyframes: { marquee: { to: { transform: 'translateX(-50%)' } } },
 *   animation: { marquee: 'marquee 35s linear infinite' },
 */

const UNIVERSITIES = [
  { id: 'bc', name: 'Boston College', image: '/images/bc.png' },
  { id: 'bu', name: 'Boston University', image: '/images/bu.png' },
  { id: 'neu', name: 'Northeastern University', image: '/images/neu.png' },
  { id: 'tufts', name: 'Tufts University', image: '/images/tufts.png' },
  { id: 'cmu', name: 'Carnegie Mellon University', image: '/images/cmu.png' },
];

function UniversityLogo({ name, image }) {
  return (
    <div
      className="flex-shrink-0 w-[140px] h-[72px] md:w-[140px] md:h-[72px] flex items-center justify-center"
      title={name}
    >
      <img src={image} alt={name} className="w-full h-full object-contain object-center" />
    </div>
  );
}

export default function ParticipatingUniversities() {
  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.333%, 0, 0); }
        }
        .animate-marquee-universities {
          animation: marquee 40s linear infinite;
          will-change: transform;
        }
      `}</style>
      <section
        id="universities"
        className="bg-white py-16 md:py-24"
        aria-labelledby="universities-title"
      >
        <h2
          id="universities-title"
          className="text-slate-800 text-center font-semibold text-2xl md:text-3xl tracking-tight font-sans mb-8 md:mb-10"
        >
          Participating Universities
        </h2>

        <div
          className="overflow-hidden w-full"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          }}
        >
          <div className="flex w-max gap-0 animate-marquee-universities">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center justify-center gap-8 md:gap-14 flex-shrink-0 px-6 md:px-8 min-w-fit" aria-hidden={n > 1}>
                {UNIVERSITIES.map((u) => (
                  <UniversityLogo key={`${n}-${u.id}`} name={u.name} image={u.image} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
