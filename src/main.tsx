import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { initSync } from './store/sync'
import './styles/global.css'

initSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
