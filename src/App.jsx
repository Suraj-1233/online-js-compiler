import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Eraser, Download, Upload, Share2, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Output from './components/Output';
import { DEFAULT_CODE } from './utils/constants';
import { executePiston, createJSWorker } from './utils/runtime';

function App() {
    const [language, setLanguage] = useState(() => localStorage.getItem('playground_lang') || 'javascript');
    const [code, setCode] = useState(DEFAULT_CODE[language]);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [theme, setTheme] = useState('dark');

    // Refs
    const workerRef = useRef(null);
    const pyodideRef = useRef(null);

    // Load code from storage on language change
    useEffect(() => {
        // Save previous code first? No, we just load.
        // Actually, 'code' state should track current code. 
        // On language switch, we load from storage or default.
        const saved = localStorage.getItem(`playground_code_${language}`);
        setCode(saved || DEFAULT_CODE[language]);
    }, [language]);

    // Persist code & language
    useEffect(() => {
        localStorage.setItem(`playground_code_${language}`, code);
        localStorage.setItem('playground_lang', language);
    }, [code, language]);

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
        setLogs([]); // Clear logs for non-preview
        setIsRunning(true);

        // HTML/React: Just show preview (handled by Output component automatically reading 'code')
        if (language === 'html' || language === 'react') {
            // Small delay to simulate run
            setTimeout(() => setIsRunning(false), 300);
            return;
        }

        try {
            if (language === 'javascript') {
                if (workerRef.current) workerRef.current.terminate();
                workerRef.current = createJSWorker(
                    code,
                    (args, type) => addLog(args, type),
                    (args) => { addLog(args, 'error'); setIsRunning(false); },
                    () => setIsRunning(false)
                );
            }

            else if (language === 'python') {
                if (!pyodideRef.current) {
                    addLog(['Pyodide not loaded yet...'], 'warn');
                    setIsRunning(false);
                    return;
                }
                try {
                    // Hijack print
                    pyodideRef.current.setStdout({ batched: (msg) => addLog([msg]) });
                    pyodideRef.current.setStderr({ batched: (msg) => addLog([msg], 'error') });
                    await pyodideRef.current.runPythonAsync(code);
                } catch (err) {
                    addLog([err.toString()], 'error');
                }
                setIsRunning(false);
            }

            else {
                // Piston (C++, Java, Go)
                const output = await executePiston(language, code);
                addLog([output]);
                setIsRunning(false);
            }
        } catch (err) {
            addLog([err.message], 'error');
            setIsRunning(false);
        }
    };

    const handleStop = () => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            addLog(['Execution terminated.'], 'warn');
        }
        setIsRunning(false);
    };

    const handleClear = () => {
        setLogs([]);
        setCode('');
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `playground.${language === 'python' ? 'py' : language === 'javascript' || language === 'react' ? 'js' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'go' ? 'go' : 'html'}`;
        a.click();
    };

    // Derived state
    const isPreviewMode = language === 'html' || language === 'react';

    return (
        <div className="app-container" data-theme={theme}>
            <Sidebar currentLanguage={language} setLanguage={setLanguage} />

            {/* Toolbar */}
            <header className="toolbar">
                <div className="logo">
                    <span style={{ color: 'var(--accent-color)' }}>{'{'}</span>
                    Code Playground
                    <span style={{ color: 'var(--accent-color)' }}>{'}'}</span>
                </div>

                <div className="actions">
                    {!isRunning ? (
                        <button className="btn btn-primary" onClick={handleRun}>
                            <Play size={16} fill="currentColor" /> Run Code
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={handleStop}>
                            <Square size={16} fill="currentColor" /> Stop
                        </button>
                    )}

                    <button className="btn btn-secondary" onClick={handleClear} title="Clear Code">
                        <Eraser size={16} />
                    </button>

                    <button className="btn btn-icon-only" onClick={handleDownload} title="Download">
                        <Download size={18} />
                    </button>

                    <button className="btn btn-icon-only" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="workspace">
                <section className="editor-pane">
                    <div className="pane-header">
                        <span>{language.toUpperCase()}</span>
                    </div>
                    <Editor
                        code={code}
                        onChange={setCode}
                        language={language}
                    />
                </section>

                <section className="output-pane">
                    <div className="pane-header">
                        <span>{isPreviewMode ? 'PREVIEW' : 'OUTPUT'}</span>
                        {!isPreviewMode && <button className="btn-xs" onClick={() => setLogs([])}>Clear Console</button>}
                    </div>
                    <Output
                        mode={isPreviewMode ? 'preview' : 'console'}
                        messages={logs}
                        previewContent={code}
                    />
                </section>
            </main>
        </div>
    );
}

export default App;
