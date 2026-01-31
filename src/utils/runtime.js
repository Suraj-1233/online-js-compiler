// Piston API
const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

export const PISTON_VERSIONS = {
    cpp: '10.2.0',
    java: '15.0.2',
    go: '1.16.2',
    python: '3.10.0', // Fallback if Pyodide fails? Or just use Pyodide.
    javascript: '18.15.0' // We use browser JS mostly, but Piston support exists
};

export async function executePiston(language, code) {
    const version = PISTON_VERSIONS[language];
    if (!version) throw new Error(`Language ${language} not supported by Piston.`);

    // Mapping
    const langMap = { cpp: 'c++', java: 'java', go: 'go' }; // Piston expects c++, not cpp
    const apiLang = langMap[language] || language;

    const response = await fetch(PISTON_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: apiLang,
            version: version,
            files: [{ content: code }]
        })
    });

    const data = await response.json();
    if (data.run) {
        if (data.run.stderr) throw new Error(data.run.stderr);
        return data.run.stdout;
    }
    return '';
}

// Inline Web Worker for JavaScript
export function createJSWorker(code, onLog, onError, onDone) {
    const workerScript = `
    self.onmessage = function(e) {
        const code = e.data;
        const customConsole = {
            log: (...args) => self.postMessage({ type: 'log', args }),
            warn: (...args) => self.postMessage({ type: 'warn', args }),
            error: (...args) => self.postMessage({ type: 'error', args }),
            info: (...args) => self.postMessage({ type: 'log', args })
        };
        try {
            const run = new Function('console', code);
            run(customConsole);
            self.postMessage({ type: 'done' });
        } catch (err) {
            self.postMessage({ type: 'error', args: [err.toString()] });
        }
    };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
        const { type, args } = e.data;
        if (type === 'done') onDone();
        else if (type === 'error') onError(args);
        else onLog(args, type);
    };

    worker.onerror = (e) => onError([e.message]);
    worker.postMessage(code);
    return worker;
}
