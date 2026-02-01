import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import Analytics from './components/Analytics';
import './styles.css'

// CodeMirror CSS
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/dracula.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/fold/foldgutter.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HelmetProvider>
            <BrowserRouter>
                <Analytics />
                <Routes>
                    <Route path="/" element={<Navigate to="/compiler/javascript" replace />} />
                    <Route path="/compiler/:lang" element={<App />} />
                    <Route path="*" element={<Navigate to="/compiler/javascript" replace />} />
                </Routes>
            </BrowserRouter>
        </HelmetProvider>
    </React.StrictMode>,
)
