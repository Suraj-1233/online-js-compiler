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
        let text;
        if (type === 'table') {
            text = JSON.stringify(texts[0]);
        } else {
            text = texts.map(t => typeof t === 'object' ? JSON.stringify(t, null, 2) : String(t)).join(' ');
        }
        setLogs(prev => [...prev, { time, text, type }]);
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
                <div className="logo">
                    <img src="/logo.png" alt="Logo" style={{ height: 28, width: 'auto', marginRight: 8 }} />
                    <span style={{ letterSpacing: '0.5px' }}>OnlineCodePlayground</span>
                </div>
                <div className="actions">
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

                    {!isRunning ? (
                        <button className="btn btn-primary" onClick={handleRun}>
                            <Play size={16} fill="currentColor" /> Run
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={handleStop}>Stop</button>
                    )}
                    <button className="btn btn-secondary" onClick={handleClear}><Eraser size={16} /></button>
                    <button className="btn btn-icon-only" onClick={handleUploadClick} title="Upload"><Upload size={18} /></button>
                    <button className="btn btn-icon-only" onClick={handleDownload} title="Download"><Download size={18} /></button>
                    <button className="btn btn-icon-only" onClick={handleShare} title="Share (Includes Code)"><Share2 size={18} /></button>
                    <button className="btn btn-icon-only" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
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

            {/* Visible SEO Summary for Keyword Density */}
            <footer className="seo-footer">
                <div className="footer-content">
                    <div className="footer-grid">
                        <section className="footer-section">
                            <h3>About OnlineCodePlayground</h3>
                            <p>OnlineCodePlayground is the premier destination for developers to experiment with code in real-time. Whether you are building <strong>React apps</strong>, practicing <strong>SQL queries</strong>, or learning <strong>Python algorithms</strong>, our platform provides a zero-config, low-latency environment directly in your browser.</p>
                        </section>
                        <section className="footer-section">
                            <h3>Supported Languages</h3>
                            <p>We support a wide array of languages including <strong>JavaScript (Node.js/ES6)</strong>, <strong>Python 3</strong>, <strong>React (JSX)</strong>, <strong>HTML/CSS</strong>, <strong>C++</strong>, <strong>Java</strong>, <strong>Go</strong>, and <strong>SQL (SQLite)</strong>.</p>
                            <div className="footer-links" style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                <a href="/compiler/javascript" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>JS Compiler</a>
                                <a href="/compiler/python" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>Python Online</a>
                                <a href="/compiler/react" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>React Editor</a>
                                <a href="/compiler/html" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>HTML Preview</a>
                                <a href="/compiler/sql" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>SQL Editor</a>
                                <a href="/compiler/cpp" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.85rem' }}>C++ Compiler</a>
                            </div>
                        </section>
                        <section className="footer-section">
                            <h3>Global Reach</h3>
                            <p>Join thousands of developers worldwide who use our <strong>online code compiler</strong> for interviewing, prototyping, and education. No sign-up required, 100% free forever.</p>
                        </section>
                    </div>
                    <div className="footer-bottom">
                        &copy; 2026 OnlineCodePlayground.in - The Best Online Code Editor.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
