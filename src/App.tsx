import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { I18nProvider, useI18n } from './i18n'
import { AppProvider } from './state/app'
import Header from './components/Header'
import Footer from './components/Footer'
import { BG_LEFT, BG_RIGHT } from './data/bg'
import { RequireAdmin, RequireUser, Toasts } from './components/ui'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductPage from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Invoice from './pages/Invoice'
import Account from './pages/Account'
import AuthPage from './pages/Auth'
import Admin from './pages/Admin'
import Contact from './pages/Contact'
import { About, Faq, NotFound, PolicyPage } from './pages/Static'
import { isSupabaseConfigured } from './data/api'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function DemoBar() {
  const { t } = useI18n()
  if (isSupabaseConfigured) return null
  return <div className="demo-bar">{t('demo.banner')}</div>
}

function Shell() {
  return (
    <>
      <div className="bg-art" aria-hidden="true">
        <img src={BG_LEFT} alt="" loading="lazy" />
        <img src={BG_RIGHT} alt="" loading="lazy" />
      </div>
      <ScrollTop />
      <DemoBar />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Catalog />} />
        <Route path="/shop/category/:slug" element={<Catalog />} />
        <Route path="/shop/:params" element={<Catalog />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:number" element={<OrderConfirmation />} />
        <Route path="/invoice/:number" element={<Invoice />} />
        <Route
          path="/account"
          element={
            <RequireUser>
              <Account />
            </RequireUser>
          }
        />
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/policies/:slug" element={<PolicyRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <Toasts />
    </>
  )
}

function PolicyRoute() {
  // reads the :slug param via the same component family
  const { slug = '' } = useSlugParam()
  return <PolicyPage slug={slug} />
}

import { useParams } from 'react-router-dom'
function useSlugParam() {
  return useParams<{ slug: string }>()
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  )
}
