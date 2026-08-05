import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { MenuSection } from './components/MenuSection'
import { LocationSection } from './components/LocationSection'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <MenuSection />
        <LocationSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
