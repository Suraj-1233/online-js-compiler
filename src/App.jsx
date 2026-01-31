import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, Eraser, Download, Upload, Share2, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import Output from './components/Output';
import { LANGUAGES, SINGLE_FILE_DEFAULTS, MULTI_FILE_TEMPLATES } from './utils/constants';
import { executePiston, createJSWorker } from './utils/runtime';

function App() {
    const { lang } = useParams();
    const navigate = useNavigate();
    const currentLangObj = LANGUAGES.find(l => l.id === lang) || LANGUAGES[0];
    const isMultiFile = currentLangObj.multiFile;

    // State
    const [activeFile, setActiveFile] = useState('');
    const [files, setFiles] = useState({}); // For multi-file
    const [code, setCode] = useState('');   // For single-file
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('playground_theme') || 'dark');

    // Refs
    const workerRef = useRef(null);
    const pyodideRef = useRef(null);
    const fileInputRef = useRef(null);

    // Theme effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('playground_theme', theme);
    }, [theme]);

    // Load Code/Files on Language Change
    useEffect(() => {
        if (!lang) return;

        // Multi-File Logic
        if (isMultiFile) {
            const savedFiles = localStorage.getItem(`playground_files_${lang}`);
            let initialFiles = {};
            if (savedFiles) {
                try { initialFiles = JSON.parse(savedFiles); } catch (e) { }
            }

            // Fallback to defaults if empty or invalid
            if (Object.keys(initialFiles).length === 0) {
                initialFiles = MULTI_FILE_TEMPLATES[lang] || {};
            }

            setFiles(initialFiles);
            // Set Default Active File
            if (lang === 'react') setActiveFile('App.jsx');
            else if (lang === 'html') setActiveFile('index.html');
            else setActiveFile(Object.keys(initialFiles)[0]);

        } else {
            // Single File Logic
            const savedCode = localStorage.getItem(`playground_code_${lang}`);
            setCode(savedCode || SINGLE_FILE_DEFAULTS[lang] || '');
            setActiveFile('');
        }

        setLogs([]);
    }, [lang, isMultiFile]);

    // Persist Data
    useEffect(() => {
        if (isMultiFile) {
            if (Object.keys(files).length > 0) {
                localStorage.setItem(`playground_files_${lang}`, JSON.stringify(files));
            }
        } else {
            localStorage.setItem(`playground_code_${lang}`, code);
        }
    }, [files, code, lang, isMultiFile]);

    // Handle Editor Change
    const handleCodeChange = (newCode) => {
        if (isMultiFile) {
            setFiles(prev => ({
                ...prev,
                [activeFile]: newCode
            }));
        } else {
            setCode(newCode);
        }
    };

    // Get Current Code for Editor
    const currentCode = isMultiFile ? (files[activeFile] || '') : code;

    // Get Mode for Editor (based on file ext or lang)
    const getEditorMode = () => {
        if (!isMultiFile) return lang; // mapped in Editor component
        if (activeFile.endsWith('.css')) return 'css';
        if (activeFile.endsWith('.html')) return 'html';
        if (activeFile.endsWith('.js') || activeFile.endsWith('.jsx')) return 'javascript';
        return 'javascript';
    };

    // Initialize Pyodide
    useEffect(() => {
        async function initPy() {
            if (window.loadPyodide && !pyodideRef.current) {
                pyodideRef.current = await window.loadPyodide();
            }
        }
        initPy();
    }, []);

    const addLog = (texts, type = 'log') => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const text = texts.map(t => typeof t === 'object' ? JSON.stringify(t, null, 2) : String(t)).join(' ');
        setLogs(prev => [...prev, { time, text, type }]);
    };

    const handleRun = async () => {
        setLogs([]);
        setIsRunning(true);

        // Multi-File Bundle Logic (HTML/React)
        if (isMultiFile) {
            let bundledCode = '';

            if (lang === 'html') {
                const html = files['index.html'] || '';
                const css = files['style.css'] || '';
                const js = files['script.js'] || '';

                // Basic Bundling
                bundledCode = html
                    .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
                    .replace('<script src="script.js"></script>', `<script>${js}</script>`);
            }
            else if (lang === 'react') {
                const appCode = files['App.jsx'] || '';
                const css = files['style.css'] || '';

                // Strip imports roughly (very basic)
                const cleanAppCode = appCode
                    .replace(/import\s+React.*?;/g, '')
                    .replace(/import\s+['"].*?['"];/g, '');

                const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${cleanAppCode}
    
    // Auto-mount if not present
    if (!document.getElementById('root').hasChildNodes()) {
         try {
             const root = ReactDOM.createRoot(document.getElementById('root'));
             root.render(<App />);
         } catch(e) { console.error("Mount error", e); }
    }
  </script>
</body>
</html>`;
                bundledCode = template;
            }

            // Pass this bundled code to output (we'll reuse the 'code' prop for preview content in Output)
            // Hacky: We temporarily set 'code' state? No, avoid that.
            // We need Output to accept 'previewContent' prop.
            // I will store previewContent in a ref or state.
            setPreviewOutput(bundledCode);
            setTimeout(() => setIsRunning(false), 300);
            return;
        }

        // Single File Logic
        const codeToRun = code;

        try {
            if (lang === 'javascript') {
                if (workerRef.current) workerRef.current.terminate();
                workerRef.current = createJSWorker(
                    codeToRun,
                    (args, type) => addLog(args, type),
                    (args) => { addLog(args, 'error'); setIsRunning(false); },
                    () => setIsRunning(false)
                );
            }
            else if (lang === 'python') {
                if (!pyodideRef.current) {
                    addLog(['Pyodide not loaded yet...'], 'warn');
                    setIsRunning(false);
                    return;
                }
                try {
                    pyodideRef.current.setStdout({ batched: (msg) => addLog([msg]) });
                    pyodideRef.current.setStderr({ batched: (msg) => addLog([msg], 'error') });
                    await pyodideRef.current.runPythonAsync(codeToRun);
                } catch (err) {
                    addLog([err.toString()], 'error');
                }
                setIsRunning(false);
            }
            else {
                // Piston
                const output = await executePiston(lang, codeToRun);
                addLog([output]);
                setIsRunning(false);
            }
        } catch (err) {
            addLog([err.message], 'error');
            setIsRunning(false);
        }
    };

    // State for Preview
    const [previewOutput, setPreviewOutput] = useState('');

    const handleStop = () => {
        if (workerRef.current) workerRef.current.terminate();
        setIsRunning(false);
    };

    const handleClear = () => {
        if (confirm('Reset code to default?')) {
            if (isMultiFile) {
                setFiles(MULTI_FILE_TEMPLATES[lang]);
            } else {
                setCode(SINGLE_FILE_DEFAULTS[lang] || '');
            }
            setLogs([]);
        }
    };

    const handleDownload = () => {
        // ... logic (omitted for brevity, can implement zip later)
        alert('Download single file supported only for now.');
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (e) => { /* ... simple read to active editor ... */ };

    const isPreviewMode = lang === 'html' || lang === 'react';

    return (
        <div className="app-container" data-theme={theme}>
            <Sidebar currentLanguage={lang} />

            <header className="toolbar">
                <div className="logo">
                    <span style={{ color: 'var(--accent-color)' }}>{'{'}</span>
                    Code Playground
                    <span style={{ color: 'var(--accent-color)' }}>{'}'}</span>
                </div>
                <div className="actions">
                    {!isRunning ? (
                        <button className="btn btn-primary" onClick={handleRun}>
                            <Play size={16} fill="currentColor" /> Run
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={handleStop}>Stop</button>
                    )}
                    <button className="btn btn-secondary" onClick={handleClear}><Eraser size={16} /></button>
                    <button className="btn btn-icon-only" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            <main className="workspace">
                {/* File Explorer (Only for MultiFile) */}
                {isMultiFile && (
                    <FileExplorer
                        files={files}
                        activeFile={activeFile}
                        onSelectFile={setActiveFile}
                    />
                )}

                <section className="editor-pane">
                    <div className="pane-header">
                        <span>{activeFile || lang.toUpperCase()}</span>
                    </div>
                    <Editor
                        code={currentCode}
                        onChange={handleCodeChange}
                        language={getEditorMode()} // Pass mode dynamically
                    />
                </section>

                <section className="output-pane">
                    <div className="pane-header">
                        <span>{isPreviewMode ? 'PREVIEW' : 'OUTPUT'}</span>
                        {!isPreviewMode && <button className="btn-xs" onClick={() => setLogs([])}>Clear</button>}
                    </div>
                    <Output
                        mode={isPreviewMode ? 'preview' : 'console'}
                        messages={logs}
                        previewContent={previewOutput} // Use state
                    />
                </section>
            </main>
        </div>
    );
}

export default App;
