/** Shown instantly while an admin page loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Pagina wordt geladen" className="animate-[reveal_300ms_ease-out_both]">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="admin-card p-5">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton mt-3 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
      <span className="sr-only">Bezig met laden…</span>
    </div>
  );
}
