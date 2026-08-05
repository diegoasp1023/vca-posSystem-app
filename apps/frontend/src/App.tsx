import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { MenuPage } from './pages/MenuPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { CoursePage } from './pages/CoursePage'
import { ProtectedRoute } from './pages/admin/ProtectedRoute'
import { RequireAdmin } from './pages/admin/RequireAdmin'
import { AdminHomePage } from './pages/admin/AdminHomePage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="nosotros" element={<AboutPage />} />
            <Route path="contacto" element={<ContactPage />} />
            <Route path="cursos/:slug" element={<CoursePage />} />

            <Route path="admin" element={<ProtectedRoute />}>
              <Route index element={<AdminHomePage />} />
              <Route element={<RequireAdmin />}>
                <Route path="cafes" element={<AdminProductsPage />} />
                <Route path="cursos" element={<AdminCoursesPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
