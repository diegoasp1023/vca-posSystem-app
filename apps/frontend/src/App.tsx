import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { MenuPage } from './pages/MenuPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { CoursePage } from './pages/CoursePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="nosotros" element={<AboutPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="cursos/:slug" element={<CoursePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
