export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-cream bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="font-serif text-xl text-coral-dark">
          valiente café
        </span>

        <nav className="hidden gap-8 text-sm font-medium text-lavender-dark sm:flex">
          <a href="#menu" className="hover:text-coral-dark">
            Menú
          </a>
          <a href="#ubicacion" className="hover:text-coral-dark">
            Ubicación
          </a>
        </nav>

        {/* TODO: wire up to Keycloak login (public + PKCE client) once auth is implemented. */}
        <button
          type="button"
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          Ingresa
        </button>
      </div>
    </header>
  )
}
