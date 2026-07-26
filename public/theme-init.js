// Aplica el tema antes del primer paint para evitar flash. Vive como archivo
// externo (no inline) para que la CSP pueda ser `script-src 'self'`.
;(function () {
  var stored = localStorage.getItem('theme')
  var theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  document.documentElement.dataset.theme = theme
})()
