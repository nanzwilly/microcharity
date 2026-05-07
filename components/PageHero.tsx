interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export default function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="bg-white border-b border-[var(--color-line)]">
      <div className="container-page py-14 md:py-20 max-w-3xl">
        {eyebrow && (
          <p className="text-sm font-semibold text-accent-600 uppercase tracking-wider mb-3">{eyebrow}</p>
        )}
        <h1 className="font-display text-4xl md:text-5xl text-ink leading-[1.1] mb-4">{title}</h1>
        {subtitle && <p className="text-lg text-body leading-relaxed">{subtitle}</p>}
      </div>
    </section>
  );
}
