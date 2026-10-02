export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-cream">
      <div className="container-site py-14 md:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(2.6rem,8vw,5rem)] font-medium leading-[0.98] tracking-[-0.02em]">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-ink-soft md:text-xl">{intro}</p>}
        {children}
      </div>
    </header>
  );
}
