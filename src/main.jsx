import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  window.alepInstallPrompt = event
  window.dispatchEvent(new Event('alepinstallprompt'))
})

window.addEventListener('appinstalled', () => {
  window.alepInstallPrompt = null
})

class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Alep application error:', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-xl border border-amber-200/40 bg-zinc-900 p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Erreur d’application</p>
          <h1 className="mt-3 text-2xl font-bold">La page ne peut pas être chargée.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Rechargez la page. Si le problème continue, envoyez cette information au développeur.</p>
          {import.meta.env.DEV && <pre className="mt-5 overflow-auto border border-zinc-700 bg-zinc-950 p-3 text-xs text-amber-100">{this.state.error.message}</pre>}
        </section>
      </main>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
