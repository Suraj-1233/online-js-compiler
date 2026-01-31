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
    const { lang, file } = useParams(); // file param optional if we route deeper
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

    // Load Code/Files on Language Change
    useEffect(() => {
        const targetLang = lang || 'javascript';

        // Multi-File Logic
        if (isMultiFile) {
            const savedFiles = localStorage.getItem(`playground_files_${targetLang}`);
            let initialFiles = {};
            if (savedFiles) {
                try { initialFiles = JSON.parse(savedFiles); } catch (e) { }
            }

            // Fallback to defaults if empty or invalid
            if (Object.keys(initialFiles).length === 0) {
                initialFiles = MULTI_FILE_TEMPLATES[targetLang] || {};
            }

            setFiles(initialFiles);
            // Set Default Active File
            if (targetLang === 'react') setActiveFile('App.js');
            else if (targetLang === 'html') setActiveFile('index.html');
            else setActiveFile(Object.keys(initialFiles)[0]);

        } else {
            // Single File Logic
            const savedCode = localStorage.getItem(`playground_code_${targetLang}`);
            setCode(savedCode || SINGLE_FILE_DEFAULTS[targetLang] || '');
            setActiveFile('');
        }

        setLogs([]);
    }, [lang, isMultiFile]);

    // Persist Data
    useEffect(() => {
        const targetLang = lang || 'javascript';
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
        if (!isMultiFile) return lang || 'javascript';
        if (activeFile.endsWith('.css')) return 'css';
        if (activeFile.endsWith('.html')) return 'html';
        if (activeFile.endsWith('.json')) return 'application/json';
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
        const targetLang = lang || 'javascript';

        // Multi-File Bundle Logic (HTML/React)
        if (isMultiFile) {
            let bundledCode = '';

            if (targetLang === 'html') {
                const html = files['index.html'] || files['public/index.html'] || '';
                const css = files['style.css'] || files['styles.css'] || '';
                const js = files['script.js'] || '';

                // Basic Bundling
                bundledCode = html
                    .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
                    .replace('<script src="script.js"></script>', `<script>${js}</script>`);
            }
            else if (targetLang === 'react') {
                const indexHtml = files['public/index.html'] || files['index.html'] || '<div id="root"></div>';
                const appCode = files['App.js'] || files['src/App.js'] || '';
                const indexCode = files['index.js'] || files['src/index.js'] || '';
                const css = files['styles.css'] || files['src/styles.css'] || '';

                // Basic bundler: Strip imports and combine
                const cleanApp = appCode.replace(/import\s+.*?;\n?/g, '').replace(/export default function/, 'function');
                const cleanIndex = indexCode.replace(/import\s+.*?;\n?/g, '');

                // Combine logic
                const combinedScript = `
               ${cleanApp}
               ${cleanIndex}
            `;

                const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${css}</style>
</head>
<body>
  ${indexHtml.includes('<body') ? indexHtml.match(/<body>([\s\S]*)<\/body>/)[1] : indexHtml}
  
  <script type="text/babel">
    ${combinedScript}
  </script>
</body>
</html>`;
                bundledCode = template;
            }

            setPreviewOutput(bundledCode);
            setTimeout(() => setIsRunning(false), 300);
            return;
        }

        // Single File Logic
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
                } catch (err) {
                    addLog([err.toString()], 'error');
                }
                setIsRunning(false);
            }
            else {
                // Piston
                const output = await executePiston(targetLang, codeToRun);
                addLog([output]);
                setIsRunning(false);
            }
        } catch (err) {
            addLog([err.message], 'error');
            setIsRunning(false);
        }
    };

    const handleStop = () => {
        if (workerRef.current) workerRef.current.terminate();
        setIsRunning(false);
    };

    const handleClear = () => {
        const targetLang = lang || 'javascript';
        if (confirm('Reset code to default?')) {
            if (isMultiFile) {
                setFiles(MULTI_FILE_TEMPLATES[targetLang]);
                if (targetLang === 'react') setActiveFile('App.js');
            } else {
                setCode(SINGLE_FILE_DEFAULTS[targetLang] || '');
            }
            setLogs([]);
        }
    };

    const handleDownload = () => alert('Download supported for single files only currently.');

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
        const name = prompt("Enter file name (e.g., components/Header.js):");
        if (name) {
            setFiles(prev => ({ ...prev, [name]: '// New File' }));
            setActiveFile(name);
        }
    };

    const isPreviewMode = (lang === 'html' || lang === 'react');

    return (
        <div className="app-container" data-theme={theme}>
            <Sidebar currentLanguage={lang || 'javascript'} />

            <header className="toolbar">
                <div className="logo">
                    <span style={{ color: 'var(--accent-color)' }}>{'{'}</span>
                    Code Playground
                    <span style={{ color: 'var(--accent-color)' }}>{'}'}</span>
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
        </div>
    );
}

export default App;
