import { Hero } from '../components/Hero'
import { MenuSection } from '../components/MenuSection'
import { CoursesSection } from '../components/CoursesSection'
import { LocationSection } from '../components/LocationSection'

export function Home() {
  return (
    <>
      <Hero />
      <MenuSection />
      <CoursesSection />
      <LocationSection />
    </>
  )
}
