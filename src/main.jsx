import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import "bootstrap-icons/font/bootstrap-icons.css"
import './index.css'
import App from './app/App.jsx'
import { Provider } from 'react-redux'
import { store } from './app/store.jsx'
import ThemeProvider from './shared/styles/theme/ThemeProvider.jsx'
import './shared/styles/theme/customTheme.css'


import $ from "jquery";
import GlobalLoadingProvider from './shared/loading/GlobalLoadingProvider.jsx'
if (typeof window !== "undefined") {
  window.$ = window.jQuery = $;
  window._fontSize ??= 12;
  window._cw ??= 28;
  window._ch ??= 24;

  const now = new Date();
  window.gy = now.getFullYear();
  window.gm = now.getMonth() + 1;
  window.gd = now.getDate();
}


// 2) ŞİMDİ eklentiyi ve CSS'ini dinamik olarak yükle:
import("./assets/date/css/persianDatepicker-default.css"); // sıranın önemi yok
import("./assets/date/js/persianDatepicker.js"); // önemli: dinamik!


createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider initial="light">
      <GlobalLoadingProvider>
        <App />
      </GlobalLoadingProvider>
    </ThemeProvider>
  </Provider>
);
