export function Hero() {
  return (
    <section className="bg-gradient-to-b from-cream to-white px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-5xl text-lavender-dark sm:text-6xl">
          Valiente Café
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Café de especialidad, hecho con calma, para quienes se atreven a
          disfrutar cada taza.
        </p>
        <a
          href="#menu"
          className="mt-10 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
        >
          Ver el menú
        </a>
      </div>
    </section>
  )
}
