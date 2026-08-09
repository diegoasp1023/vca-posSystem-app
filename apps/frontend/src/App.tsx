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
import { RequireGerente } from './pages/admin/RequireGerente'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminHomePage } from './pages/admin/AdminHomePage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminEmployeesPage } from './pages/admin/AdminEmployeesPage'
import { AdminMenuPage } from './pages/admin/AdminMenuPage'
import { AdminTabsPage } from './pages/admin/AdminTabsPage'

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
          </Route>

          {/* Admin panel: its own layout, no public header/nav/social icons. */}
          <Route path="admin" element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route element={<RequireAdmin />}>
                <Route path="cafes" element={<AdminProductsPage />} />
                <Route path="cursos" element={<AdminCoursesPage />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="personal" element={<AdminEmployeesPage />} />
              </Route>
              <Route element={<RequireGerente />}>
                <Route path="cuentas" element={<AdminTabsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
