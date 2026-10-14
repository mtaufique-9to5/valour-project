'use client'

import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css"
import "./responsive.css"
import { Provider } from 'react-redux'
import { store } from './store'
import CartSidebar from '@/components/CartSidebar'
import CartHydrator from './CartHydrator'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>
        <Provider store={store}>
        <CartHydrator />
        <Toaster position="bottom-right" />
        <CartSidebar />
          {children}
        </Provider>
      </body>
    </html>
  )
}
