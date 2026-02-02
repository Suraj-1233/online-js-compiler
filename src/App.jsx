import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Square, Eraser, Download, Upload, Share2, Sun, Moon } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import LZString from 'lz-string'; // Import compression
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import Output from './components/Output';
import SEO from './components/SEO';
import { LANGUAGES, SINGLE_FILE_DEFAULTS, MULTI_FILE_TEMPLATES } from './utils/constants';
import { SEO_DATA } from './utils/seoConstants';
import { executePiston, createJSWorker } from './utils/runtime';
import LanguageGrid from './components/LanguageGrid';

function App() {
    const { lang } = useParams();
    const seoData = SEO_DATA[lang] || SEO_DATA['default'];

    const navigate = useNavigate();
    const location = useLocation();
    const currentLangObj = LANGUAGES.find(l => l.id === lang) || LANGUAGES[0];
    const isMultiFile = currentLangObj.multiFile;

    // State
    const [activeFile, setActiveFile] = useState('');
    const [files, setFiles] = useState({}); // For multi-file
    const [code, setCode] = useState('');   // For single-file
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('playground_theme') || 'dark');
    const [previewOutput, setPreviewOutput] = useState('');

    // Refs
    const workerRef = useRef(null);
    const pyodideRef = useRef(null);
    const fileInputRef = useRef(null);

    // Theme effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('playground_theme', theme);
    }, [theme]);

    // Preview Log Listener
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data && e.data.type === 'preview-log') {
                addLog(e.data.content, e.data.logType);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Load Code/Files on Language Change (with Share Support)
    useEffect(() => {
        const targetLang = lang || 'javascript';
        const params = new URLSearchParams(location.search);
        const sharedCode = params.get('c');
        const sharedFiles = params.get('f');

        // 1. Check for Shared Content first
        if (isMultiFile && sharedFiles) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(sharedFiles);
                if (decompressed) {
                    const parsedFiles = JSON.parse(decompressed);
                    setFiles(parsedFiles);
                    if (targetLang === 'react') setActiveFile('src/App.js');
                    else if (targetLang === 'html') setActiveFile('index.html');
                    else if (targetLang === 'sql') setActiveFile('queries.sql');
                    else setActiveFile(Object.keys(parsedFiles)[0]);

                    setLogs([{ time: new Date().toLocaleTimeString('en-US', { hour12: false }), text: 'Loaded shared project!', type: 'success' }]);
                    return; // Stop here, don't load defaults
                }
            } catch (e) { console.error("Share load error", e); }
        }
        else if (!isMultiFile && sharedCode) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(sharedCode);
                if (decompressed) {
                    setCode(decompressed);
                    setActiveFile('');
                    setLogs([{ time: new Date().toLocaleTimeString('en-US', { hour12: false }), text: 'Loaded shared code!', type: 'success' }]);
                    return; // Stop here
                }
            } catch (e) { console.error("Share load error", e); }
        }

        // 2. Fallback to LocalStorage or Defaults
        if (isMultiFile) {
            const savedFiles = localStorage.getItem(`playground_files_${targetLang}`);
            let initialFiles = {};
            if (savedFiles) {
                try { initialFiles = JSON.parse(savedFiles); } catch (e) { }
            }

            if (Object.keys(initialFiles).length === 0) {
                initialFiles = MULTI_FILE_TEMPLATES[targetLang] || {};
            }

            setFiles(initialFiles);
            if (targetLang === 'react') {
                setActiveFile(initialFiles['src/App.jsx'] ? 'src/App.jsx' : 'src/App.js');
            }
            else if (targetLang === 'html') setActiveFile('index.html');
            else if (targetLang === 'sql') setActiveFile('queries.sql');
            else setActiveFile(Object.keys(initialFiles)[0]);

        } else {
            const savedCode = localStorage.getItem(`playground_code_${targetLang}`);
            setCode(savedCode || SINGLE_FILE_DEFAULTS[targetLang] || '');
            setActiveFile('');
        }

        setLogs([]);
    }, [lang, isMultiFile, location.search]);

    // Persist Data (Only if NOT viewing a read-only share? Actually we can overwrite LS, it's fine)
    useEffect(() => {
        const targetLang = lang || 'javascript';
        // Don't auto-save immediately if we just loaded? 
        // It's okay, user can overwrite their local cache with the shared one.
        if (isMultiFile) {
            if (Object.keys(files).length > 0) {
                localStorage.setItem(`playground_files_${targetLang}`, JSON.stringify(files));
            }
        } else {
            localStorage.setItem(`playground_code_${targetLang}`, code);
        }
    }, [files, code, lang, isMultiFile]);

    // Handle Editor Change
    const handleCodeChange = (newCode) => {
        if (isMultiFile) {
            setFiles(prev => ({ ...prev, [activeFile]: newCode }));
        } else {
            setCode(newCode);
        }
    };

    const currentCode = isMultiFile ? (files[activeFile] || '') : code;

    const getEditorMode = () => {
        if (!isMultiFile) return lang || 'javascript';
        if (activeFile.endsWith('.css')) return 'css';
        if (activeFile.endsWith('.html')) return 'html';
        if (activeFile.endsWith('.json')) return 'application/json';
        if (activeFile.endsWith('.js') || activeFile.endsWith('.jsx')) return 'javascript';
        if (activeFile.endsWith('.sql')) return 'text/x-sql';
        return 'javascript';
    };

    // Lazy Load Pyodide only when Python is selected
    useEffect(() => {
        async function initPy() {
            if (lang === 'python') {
                // Load Pyodide script if not already loaded
                if (!window.loadPyodide && !document.querySelector('script[src*="pyodide"]')) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
                    script.async = true;
                    document.head.appendChild(script);

                    // Wait for script to load
                    await new Promise((resolve) => {
                        script.onload = resolve;
                    });
                }

                // Initialize Pyodide instance
                if (window.loadPyodide && !pyodideRef.current) {
                    pyodideRef.current = await window.loadPyodide();
                }
            }
        }
        initPy();
    }, [lang]);

    const addLog = (texts, type = 'log') => {
        let text;
        if (type === 'table') {
            text = JSON.stringify(texts[0]);
        } else {
            text = texts.map(t => typeof t === 'object' ? JSON.stringify(t) : String(t)).join(' ');
        }
        setLogs(prev => [...prev, { text, type }]);
    };

    const handleRun = async () => {
        setLogs([]);
        setIsRunning(true);
        const targetLang = lang || 'javascript';

        if (targetLang === 'sql') {
            try {
                if (!window.initSqlJs) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/sql-wasm.js";
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                const SQL = await window.initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
                });
                const db = new SQL.Database();
                db.run(files['schema.sql'] || '');
                const results = db.exec(files['queries.sql'] || '');
                if (results.length === 0) {
                    addLog(['Query executed successfully. Use SELECT to view results.'], 'success');
                } else {
                    results.forEach(res => { addLog([res], 'table'); });
                }
                db.close();
            } catch (e) { addLog([e.message], 'error'); }
            setIsRunning(false);
            return;
        }

        if (isMultiFile) {
            let bundledCode = '';

            // Console Bridge Script
            const bridgeScript = `
                <script>
                    (function() {
                        const originalLog = console.log;
                        const originalError = console.error;
                        const originalWarn = console.warn;
                        
                        const send = (type, args) => {
                            window.parent.postMessage({ type: 'preview-log', logType: type, content: Array.from(args) }, '*');
                        };
                        
                        console.log = function() { send('log', arguments); originalLog.apply(console, arguments); };
                        console.error = function() { send('error', arguments); originalError.apply(console, arguments); };
                        console.warn = function() { send('warn', arguments); originalWarn.apply(console, arguments); };
                        
                        window.onerror = function(msg, url, line, col, error) {
                            send('error', [msg + " (Line: " + line + ")"]);
                        };
                    })();
                </script>
            `;

            if (targetLang === 'html') {
                const html = files['index.html'] || files['public/index.html'] || '';
                const css = files['style.css'] || files['styles.css'] || '';
                const js = files['script.js'] || '';
                bundledCode = html
                    .replace('<head>', `<head>${bridgeScript}`)
                    .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
                    .replace('<script src="script.js"></script>', `<script>${js}</script>`);
            }
            else if (targetLang === 'react') {
                const indexHtml = files['public/index.html'] || files['index.html'] || '<div id="root"></div>';
                const appCode = files['src/App.js'] || files['src/App.jsx'] || files['App.js'] || files['App.jsx'] || '';
                const indexCode = files['src/index.js'] || files['src/index.jsx'] || files['index.js'] || files['index.jsx'] || '';
                const css = files['src/styles.css'] || files['styles.css'] || '';

                const clean = (c) => c
                    .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '') // Standard from imports
                    .replace(/import\s+['"].*?['"];?/g, '')               // Side effect imports like CSS
                    .replace(/export\s+default\s+/g, '')
                    .replace(/export\s+/g, '');

                const combinedScript = `
                    // Inject Hooks helper so users don't have to use React.useState
                    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, useLayoutEffect } = React;
                    
                    ${clean(appCode)}
                    ${clean(indexCode)}
                `;

                bundledCode = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    ${bridgeScript}
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>${css}</style>
</head>
<body>
    ${indexHtml.includes('<body') ? indexHtml.match(/<body>([\s\S]*)<\/body>/)[1] : indexHtml}
    <script type="text/babel">
        try {
            ${combinedScript}
        } catch (err) {
            console.error(err);
        }
    </script>
</body>
</html>`;
            }
            setPreviewOutput(bundledCode);
            setTimeout(() => setIsRunning(false), 300);
            return;
        }

        const codeToRun = code;
        try {
            if (targetLang === 'javascript') {
                if (workerRef.current) workerRef.current.terminate();
                workerRef.current = createJSWorker(
                    codeToRun,
                    (args, type) => addLog(args, type),
                    (args) => { addLog(args, 'error'); setIsRunning(false); },
                    () => setIsRunning(false)
                );
            }
            else if (targetLang === 'python') {
                if (!pyodideRef.current) {
                    addLog(['Pyodide not loaded yet...'], 'warn');
                    setIsRunning(false);
                    return;
                }
                try {
                    pyodideRef.current.setStdout({ batched: (msg) => addLog([msg]) });
                    pyodideRef.current.setStderr({ batched: (msg) => addLog([msg], 'error') });
                    await pyodideRef.current.runPythonAsync(codeToRun);
                } catch (err) { addLog([err.toString()], 'error'); }
                setIsRunning(false);
            }
            else {
                const output = await executePiston(targetLang, codeToRun);
                addLog([output]);
                setIsRunning(false);
            }
        } catch (err) {
            addLog([err.message], 'error');
            setIsRunning(false);
        }
    };

    const handleStop = () => { if (workerRef.current) workerRef.current.terminate(); setIsRunning(false); };

    const handleClear = () => {
        const targetLang = lang || 'javascript';
        // Clear URL params
        navigate(location.pathname, { replace: true });

        if (confirm('Reset code to default?')) {
            if (isMultiFile) {
                const template = MULTI_FILE_TEMPLATES[targetLang] || {};
                setFiles(template);
                if (targetLang === 'react') {
                    setActiveFile(template['src/App.jsx'] ? 'src/App.jsx' : 'src/App.js');
                }
                else if (targetLang === 'sql') setActiveFile('queries.sql');
                else if (targetLang === 'html') setActiveFile('index.html');
                else setActiveFile(Object.keys(template)[0] || '');
            } else {
                setCode(SINGLE_FILE_DEFAULTS[targetLang] || '');
            }
            setLogs([]);
            setPreviewOutput(''); // Clear the preview frame too
        }
    };

    const handleDownload = async () => {
        const targetLang = lang || 'javascript';
        if (isMultiFile) {
            const zip = new JSZip();
            Object.keys(files).forEach(filename => zip.file(filename, files[filename]));
            try {
                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, `${targetLang}-project.zip`);
            } catch (e) { alert("Failed to generate zip"); }
        } else {
            const extMap = { javascript: 'js', python: 'py', cpp: 'cpp', java: 'java', go: 'go' };
            const ext = extMap[targetLang] || 'txt';
            const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
            saveAs(blob, `main.${ext}`);
        }
    };

    const handleShare = () => {
        // 1. Compress current state
        let compressed = "";
        let paramKey = "";

        if (isMultiFile) {
            compressed = LZString.compressToEncodedURIComponent(JSON.stringify(files));
            paramKey = "f";
        } else {
            compressed = LZString.compressToEncodedURIComponent(code);
            paramKey = "c";
        }

        // 2. Build URL
        const url = new URL(window.location.href);
        url.searchParams.set(paramKey, compressed);

        // Clear other key to avoid confusion if moving modes? (Actually React Router handles the path so we usually just have 1 active mode)

        const shareUrl = url.toString();

        // 3. Copy and Update History
        navigator.clipboard.writeText(shareUrl).then(() => {
            // Update URL bar without reload, so user sees the change
            window.history.pushState({}, '', shareUrl);
            alert("Sharable Link copied to clipboard! 🔗\n(Anyone with this link will see your exact code)");
        });
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (isMultiFile) {
                setFiles(prev => ({ ...prev, [file.name]: ev.target.result }));
                setActiveFile(file.name);
            } else {
                setCode(ev.target.result);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleAddFile = () => {
        const name = prompt("Enter file name:");
        if (name) {
            setFiles(prev => ({ ...prev, [name]: '// New File' }));
            setActiveFile(name);
        }
    };

    const isPreviewMode = (lang === 'html' || lang === 'react');

    return (
        <div className="app-container" data-theme={theme}>
            <SEO lang={lang} />

            <header className="toolbar">
                <h1 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' }}>
                    <a href="/" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit' }}>
                        <img src="/logo.png" alt="OnlineCodePlayground - Free Online Code Compiler and Editor Logo" style={{ height: 28, width: 'auto', marginRight: 8 }} />
                        <span style={{ letterSpacing: '0.5px' }}>OnlineCodePlayground</span>
                    </a>
                </h1>
                <div className="actions">
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} aria-label="Upload code file" />

                    {!isRunning ? (
                        <button className="btn btn-primary" onClick={handleRun} aria-label="Run code">
                            <Play size={16} fill="currentColor" /> Run
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={handleStop} aria-label="Stop execution">Stop</button>
                    )}
                    <button className="btn btn-secondary" onClick={handleClear} aria-label="Clear code and reset to default"><Eraser size={16} /></button>
                    <button className="btn btn-icon-only" onClick={handleUploadClick} title="Upload" aria-label="Upload code file"><Upload size={18} /></button>
                    <button className="btn btn-icon-only" onClick={handleDownload} title="Download" aria-label="Download code"><Download size={18} /></button>
                    <button className="btn btn-icon-only" onClick={handleShare} title="Share (Includes Code)" aria-label="Share code with link"><Share2 size={18} /></button>
                    <button className="btn btn-icon-only" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            <Sidebar currentLanguage={lang || 'javascript'} />

            <main className="workspace">
                {isMultiFile && (
                    <FileExplorer
                        files={files}
                        activeFile={activeFile}
                        onSelectFile={setActiveFile}
                        onAddFile={handleAddFile}
                    />
                )}

                <section className="editor-pane">
                    <div className="pane-header">
                        <span>{activeFile || (lang || 'javascript').toUpperCase()}</span>
                    </div>
                    <Editor
                        code={currentCode}
                        onChange={handleCodeChange}
                        language={getEditorMode()}
                        theme={theme}
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
                        previewContent={previewOutput}
                    />
                </section>
            </main>

            {/* Featured Languages Grid for Internal Linking */}
            <section style={{
                marginLeft: 'var(--sidebar-width)',
                background: 'var(--bg-primary)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '60px',
                paddingBottom: '40px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '12px'
                    }}>Try Our Compilers</h2>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>Choose from 8 programming languages and start coding instantly</p>
                </div>
                <LanguageGrid currentLang={lang} />
            </section>

            {/* Visible SEO Summary for Keyword Density */}
            <footer className="seo-footer">
                <div className="footer-content">
                    <div className="footer-grid">
                        <section className="footer-section">
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem' }}>About OnlineCodePlayground</h2>
                            <p>OnlineCodePlayground is the premier <strong>free online code compiler</strong> and playground for developers worldwide. Whether you're building <strong>React applications</strong>, practicing <strong>SQL database queries</strong>, learning <strong>Python programming</strong>, or experimenting with <strong>JavaScript ES6+</strong>, our platform provides a zero-configuration, instant-start coding environment directly in your browser. No downloads, no setup, no credit card—just pure coding productivity.</p>
                        </section>
                        <section className="footer-section">
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem' }}>Supported Languages</h2>
                            <p>Our <strong>multi-language IDE</strong> supports <strong>JavaScript (Node.js/ES6+)</strong>, <strong>Python 3</strong>, <strong>React (JSX/Hooks)</strong>, <strong>HTML5/CSS3</strong>, <strong>C++17</strong>, <strong>Java SE</strong>, <strong>Go (Golang)</strong>, and <strong>SQL (SQLite)</strong>. Each compiler runs in an optimized sandbox with real-time execution and instant output.</p>
                            <div className="footer-links" style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                <a href="/compiler/javascript" aria-label="JavaScript Online Compiler" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>JavaScript Compiler</a>
                                <a href="/compiler/python" aria-label="Python Online Compiler" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Python Compiler</a>
                                <a href="/compiler/react" aria-label="React Online Editor" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>React Playground</a>
                                <a href="/compiler/html" aria-label="HTML CSS JavaScript Editor" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>HTML/CSS Editor</a>
                                <a href="/compiler/sql" aria-label="SQL Online Editor" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>SQL Database</a>
                                <a href="/compiler/cpp" aria-label="C++ Online Compiler" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>C++ Compiler</a>
                                <a href="/compiler/java" aria-label="Java Online Compiler" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Java Compiler</a>
                                <a href="/compiler/go" aria-label="Go Online Compiler" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Go Compiler</a>
                            </div>
                        </section>
                        <section className="footer-section">
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem' }}>Why Choose Us?</h2>
                            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
                                <li>✓ <strong>100% Free</strong> – No signup, no ads, no paywalls</li>
                                <li>✓ <strong>Instant Execution</strong> – Run code in milliseconds</li>
                                <li>✓ <strong>Multi-File Projects</strong> – Build complex apps with ease</li>
                                <li>✓ <strong>Share & Collaborate</strong> – Generate links to share code</li>
                                <li>✓ <strong>Mobile Friendly</strong> – Code on any device</li>
                                <li>✓ <strong>Offline Ready</strong> – PWA support for offline use</li>
                            </ul>
                        </section>
                    </div>

                    {/* FAQ Section for Rich Snippet */}
                    <section style={{
                        marginTop: '50px',
                        paddingTop: '40px',
                        borderTop: '1px solid var(--border-color)',
                        maxWidth: '900px',
                        margin: '50px auto 0'
                    }}>
                        <h2 style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            textAlign: 'center',
                            marginBottom: '30px',
                            color: 'var(--text-primary)'
                        }}>Frequently Asked Questions</h2>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <details style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                                <summary style={{ fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    Is OnlineCodePlayground completely free?
                                </summary>
                                <p style={{ marginTop: '12px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                    Yes! OnlineCodePlayground is 100% free forever. No signup required, no credit card needed, no hidden costs. All features—including multi-file projects, code sharing, and downloads—are available to everyone at no charge.
                                </p>
                            </details>

                            <details style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                                <summary style={{ fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    Which programming languages are supported?
                                </summary>
                                <p style={{ marginTop: '12px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                    We support 8 popular languages: JavaScript (Node.js/ES6+), React (JSX with Hooks), Python 3 (via Pyodide), HTML/CSS/JavaScript, SQL (SQLite), C++17, Java SE, and Go (Golang). Each language has its own optimized runtime environment.
                                </p>
                            </details>

                            <details style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                                <summary style={{ fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    Can I save and share my code?
                                </summary>
                                <p style={{ marginTop: '12px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                    Absolutely! Your code is automatically saved in your browser's local storage. You can generate shareable links (which encode your entire project in the URL), download individual files, or export multi-file projects as ZIP archives.
                                </p>
                            </details>

                            <details style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                                <summary style={{ fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    Do I need to install anything?
                                </summary>
                                <p style={{ marginTop: '12px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                    No installation needed! OnlineCodePlayground runs entirely in your browser using modern Web APIs. Just visit the site and start coding immediately. It works perfectly on desktop, tablet, and mobile devices—no apps, no downloads, no dependencies.
                                </p>
                            </details>
                        </div>
                    </section>

                    <div className="footer-bottom" style={{
                        marginTop: '50px',
                        paddingTop: '25px',
                        borderTop: '1px solid var(--border-color)',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        &copy; 2026 <strong>OnlineCodePlayground.in</strong> - The World's Best Free Online Code Editor &amp; Compiler. Built with ❤️ by <a href="https://www.linkedin.com/company/zetawa-dark-private-limited/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>ZETAWA DARK PRIVATE LIMITED</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
