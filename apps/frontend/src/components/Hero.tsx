import foxLogo from '../assets/fox-logo.svg'

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-cream to-white px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <img
          src={foxLogo}
          alt="Valiente Café"
          className="mx-auto h-24 w-24 sm:h-28 sm:w-28"
        />
        <h1 className="mt-6 font-serif text-5xl text-lavender-dark sm:text-6xl">
          Valiente Café
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Café de especialidad, 100% vegano — porque ser valientes también es
          cuidar a los animales. Cada taza, hecha con calma, para quienes se
          atreven a disfrutar sin dejar a nadie atrás.
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
