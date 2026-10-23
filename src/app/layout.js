'use client'

import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css"
import "./responsive.css"
import { Provider } from 'react-redux'
import { store } from './store'
import StorefrontChrome from './StorefrontChrome'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <head>
        {/* Poppins for every page, loaded once here (not via a CSS @import,
            which only applied when its stylesheet happened to come first).
            Weights match what the stylesheets use: 200–700, upright only. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Provider store={store}>
        <StorefrontChrome />
          {children}
        </Provider>
      </body>
    </html>
  )
}
