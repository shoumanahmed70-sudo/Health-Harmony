import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { I18nProvider, useI18n } from './i18n'
import { AppProvider } from './state/app'
import { PROD_DEMO_BLOCKED } from './data/api'
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
import ResetPassword from './pages/ResetPassword'
import Admin from './pages/Admin'
import Contact from './pages/Contact'
import { About, Faq, NotFound, PolicyPage } from './pages/Static'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** Production guard: a PROD build without Supabase keys would serve an empty
 *  demo store to real customers — show a clear setup screen instead. */
function SetupError() {
  const { t } = useI18n()
  return (
    <main className="page">
      <div className="wrap empty-pane">
        <div className="empty-emoji">⚙️</div>
        <div className="empty-title">{t('setup.title')}</div>
        <div className="empty-sub">{t('setup.sub')}</div>
      </div>
    </main>
  )
}

function Shell() {
  if (PROD_DEMO_BLOCKED) {
    return <SetupError />
  }
  return (
    <>
      <div className="bg-art" aria-hidden="true">
        <img src={BG_LEFT} alt="" loading="lazy" />
        <img src={BG_RIGHT} alt="" loading="lazy" />
      </div>
      <ScrollTop />
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
        <Route path="/reset-password" element={<ResetPassword />} />
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
