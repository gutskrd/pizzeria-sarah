export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className="on-dark bg-char text-white">
      <div className={`container-site py-12 md:py-16 ${aside ? 'grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-16' : ''}`}>
        <div>
          {eyebrow && <p className="text-sm font-semibold text-white/65">{eyebrow}</p>}
          <h1 className="mt-2 text-[clamp(2.75rem,9vw,5.5rem)] tracking-[-0.01em] [font-stretch:72%]">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-lg text-white/80 md:text-xl">{intro}</p>}
          {children}
        </div>
        {aside}
      </div>
    </header>
  );
}
