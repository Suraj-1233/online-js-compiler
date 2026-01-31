// DOM Elements
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const outputContainer = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const languageSelect = document.getElementById('languageSelect');

// Local Storage Keys
const STORAGE_KEY = 'code_playground_code';
const LANGUAGE_KEY = 'code_playground_language';

// Current Language
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'javascript';

// Python Runtime Instance
let pythonRuntime = null;

// Default Code Templates
const defaultCode = {
    javascript: `// Welcome to Code Playground!
// Write your JavaScript code here and click "Run Code"

console.log("Hello, World! 🚀");

const items = ["Apple", "Banana", "Cherry"];
console.log("Fruits:", items);

function add(a, b) {
  return a + b;
}

console.log("2 + 3 =", add(2, 3));

// Try causing an error
// console.log(unknownVariable);
`,
    python: `# Welcome to Code Playground!
# Write your Python code here and click "Run Code"

print("Hello, World! 🐍")

items = ["Apple", "Banana", "Cherry"]
print("Fruits:", items)

def add(a, b):
    return a + b

print("2 + 3 =", add(2, 3))

# Try some Python features
for i in range(3):
    print(f"Count: {i}")
`
};

// URL Compression / Decompression Logic
function encodeCode(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return '';
    }
}

function decodeCode(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return null;
    }
}

// Load saved code: URL Hash > LocalStorage > Default
let initialCode = '';
const hash = window.location.hash.slice(1); // Remove #

if (hash) {
    const decoded = decodeCode(hash);
    if (decoded !== null) {
        initialCode = decoded;
        // Defer toast until page load completes
        setTimeout(() => showToast('Code loaded from URL', 'success'), 500);
    } else {
        initialCode = localStorage.getItem(STORAGE_KEY) || defaultCode[currentLanguage];
        setTimeout(() => showToast('Invalid URL code, loaded saved/default', 'error'), 500);
    }
} else {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    // Check for null explicitly so empty string is valid
    initialCode = savedCode !== null ? savedCode : defaultCode[currentLanguage];
}

// Language mode mapping
const languageModes = {
    'javascript': 'javascript',
    'python': 'python'
};

// Initialize CodeMirror
let editor = CodeMirror(document.getElementById("editor"), {
    mode: languageModes[currentLanguage],
    theme: "dracula",
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    tabSize: currentLanguage === 'python' ? 4 : 2,
    value: initialCode
});

// Set language selector to current language
languageSelect.value = currentLanguage;

// Save to Local Storage on change
editor.on('change', () => {
    localStorage.setItem(STORAGE_KEY, editor.getValue());
});

// Web Worker Logic
const workerCode = `
    self.onmessage = function(e) {
        const code = e.data;
        
        // Track if any async operation is scheduled
        let hasAsync = false;
        
        // Proxy setTimeout/setInterval to detect async usage
        const originalSetTimeout = self.setTimeout;
        self.setTimeout = function(...args) {
            hasAsync = true;
            return originalSetTimeout.apply(self, args);
        };
        
        const originalSetInterval = self.setInterval;
        self.setInterval = function(...args) {
            hasAsync = true;
            return originalSetInterval.apply(self, args);
        };
        
        // Custom Console Proxy
        const customConsole = {
            log: (...args) => self.postMessage({ type: 'log', args }),
            warn: (...args) => self.postMessage({ type: 'warn', args }),
            error: (...args) => self.postMessage({ type: 'error', args }),
            info: (...args) => self.postMessage({ type: 'log', args })
        };

        try {
            // Create a function with custom console
            const run = new Function('console', code);
            run(customConsole);
            
            // Signal completion
            // If hasAsync is true, code initiated timers, so we shouldn't assume it's "finished"
            self.postMessage({ type: 'done', hasPending: hasAsync });
        } catch (err) {
            self.postMessage({ type: 'error', args: [err.toString()] });
        }
    };
`;

let currentWorker = null;

function formatArg(arg) {
    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return String(arg);
        }
    }
    return String(arg);
}

function appendToOutput(args, type = 'log') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    const now = new Date();
    timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    line.appendChild(timestamp);

    const message = args.map(formatArg).join(' ');
    const messageNode = document.createElement('span');
    messageNode.textContent = message;

    line.appendChild(messageNode);
    outputContainer.appendChild(line);

    outputContainer.scrollTop = outputContainer.scrollHeight;
}

function toggleRunState(isRunning) {
    if (isRunning) {
        runBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
    } else {
        runBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
    }
}

async function runCode() {
    const code = editor.getValue();

    // Clear previous output
    outputContainer.innerHTML = '';

    toggleRunState(true);

    if (currentLanguage === 'javascript') {
        // JavaScript execution using Web Worker
        // 1. Terminate existing worker if any
        if (currentWorker) {
            currentWorker.terminate();
        }

        // 2. Create new Worker from Blob
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        currentWorker = new Worker(URL.createObjectURL(blob));

        // 3. Handle messages from Worker
        currentWorker.onmessage = function (e) {
            const { type, args, hasPending } = e.data;

            if (type === 'done') {
                if (!hasPending) {
                    toggleRunState(false);
                }
            } else {
                appendToOutput(args || [], type);
            }
        };

        currentWorker.onerror = function (e) {
            appendToOutput([e.message], 'error');
            toggleRunState(false);
        };

        // 4. Send code to Worker
        currentWorker.postMessage(code);

    } else if (currentLanguage === 'python') {
        // Python execution using Pyodide
        try {
            // Initialize Python runtime if not already done
            if (!pythonRuntime) {
                appendToOutput(['Loading Python environment... (first time only)'], 'log');
                pythonRuntime = new PythonRuntime();
            }

            // Execute Python code
            await pythonRuntime.execute(
                code,
                (output) => appendToOutput(output, 'log'),
                (error) => appendToOutput(error, 'error')
            );

            toggleRunState(false);
        } catch (error) {
            appendToOutput([`Python Error: ${error.message}`], 'error');
            toggleRunState(false);
        }
    }
}

function stopExecution() {
    if (currentWorker) {
        currentWorker.terminate();
        currentWorker = null;
        appendToOutput(['Execution terminated by user.'], 'warn');
    }
    toggleRunState(false);
}

// Drag to Scroll Logic (Finger Scroll Simulation)
function enableDragScroll(element) {
    let isDown = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;

    element.style.cursor = 'grab';

    element.addEventListener('mousedown', (e) => {
        isDown = true;
        element.style.cursor = 'grabbing';
        startX = e.pageX - element.offsetLeft;
        startY = e.pageY - element.offsetTop;
        scrollLeft = element.scrollLeft;
        scrollTop = element.scrollTop;
    });

    element.addEventListener('mouseleave', () => {
        isDown = false;
        element.style.cursor = 'grab';
    });

    element.addEventListener('mouseup', () => {
        isDown = false;
        element.style.cursor = 'grab';
    });

    element.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - element.offsetLeft;
        const y = e.pageY - element.offsetTop;
        const walkX = (x - startX) * 1.5; // Scroll-fastness
        const walkY = (y - startY) * 1.5;
        element.scrollLeft = scrollLeft - walkX;
        element.scrollTop = scrollTop - walkY;
    });
}

// File Upload Logic
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        editor.setValue(content);
        localStorage.setItem(STORAGE_KEY, content);
        showToast('File uploaded successfully', 'success');
    };
    reader.onerror = function () {
        showToast('Error reading file', 'error');
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
}

// Download Code Logic
function downloadCode() {
    const code = editor.getValue();
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'playground.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Download started', 'success', 2000);
}

// Share Code Logic
function shareCode() {
    const code = editor.getValue();
    const encoded = encodeCode(code);
    const newUrl = `${window.location.origin}${window.location.pathname}#${encoded}`;

    // Update URL without reload
    window.history.replaceState(null, null, newUrl);

    // Copy to clipboard
    navigator.clipboard.writeText(newUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy link', 'error');
    });
}

// Toast Logic
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, duration);
    }

    return toast;
}

// Custom Confirm Toast
function showConfirmToast(message, onConfirm) {
    const toast = document.createElement('div');
    toast.className = `toast toast-warning`;
    toast.style.flexDirection = 'column';
    toast.style.alignItems = 'flex-start';

    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.alignItems = 'center';
    msgDiv.style.gap = '10px';
    msgDiv.innerHTML = `<span class="toast-icon">⚠️</span><span>${message}</span>`;

    const btnDiv = document.createElement('div');
    btnDiv.style.display = 'flex';
    btnDiv.style.gap = '8px';
    btnDiv.style.marginTop = '8px';
    btnDiv.style.width = '100%';
    btnDiv.style.justifyContent = 'flex-end';

    const yesBtn = document.createElement('button');
    yesBtn.className = 'btn-xs';
    yesBtn.style.borderColor = 'var(--text-primary)';
    yesBtn.textContent = 'Yes, Clear';
    yesBtn.onclick = () => {
        onConfirm();
        removeToast();
    };

    const noBtn = document.createElement('button');
    noBtn.className = 'btn-xs';
    noBtn.textContent = 'Cancel';
    noBtn.onclick = removeToast;

    btnDiv.appendChild(noBtn);
    btnDiv.appendChild(yesBtn);

    toast.appendChild(msgDiv);
    toast.appendChild(btnDiv);
    toastContainer.appendChild(toast);

    function removeToast() {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }
}

// Event Listeners
runBtn.addEventListener('click', runCode);
stopBtn.addEventListener('click', stopExecution);
downloadBtn.addEventListener('click', downloadCode);
shareBtn.addEventListener('click', shareCode);
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

// Language Selector
languageSelect.addEventListener('change', (e) => {
    const newLanguage = e.target.value;

    // Save current language
    currentLanguage = newLanguage;
    localStorage.setItem(LANGUAGE_KEY, newLanguage);

    // Update CodeMirror mode
    editor.setOption('mode', languageModes[newLanguage]);

    // Update tab size (Python uses 4 spaces, JS uses 2)
    editor.setOption('tabSize', newLanguage === 'python' ? 4 : 2);

    // Clear output
    outputContainer.innerHTML = '';

    // Show toast
    const langName = newLanguage === 'javascript' ? 'JavaScript' : 'Python';
    showToast(`Switched to ${langName}`, 'success', 2000);

    // Optional: Load default code for new language if editor is empty
    if (!editor.getValue().trim()) {
        editor.setValue(defaultCode[newLanguage]);
    }
});

clearConsoleBtn.addEventListener('click', () => {
    outputContainer.innerHTML = '';
    showToast('Console cleared', 'info', 2000);
});

clearBtn.addEventListener('click', () => {
    showConfirmToast('Clear all code? This cannot be undone.', () => {
        editor.setValue('');
        localStorage.setItem(STORAGE_KEY, '');
        editor.focus();
        showToast('Code cleared successfully', 'success');
    });
});

// State
let isDarkMode = true;

// Theme Toggle Logic
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    editor.setOption('theme', isDarkMode ? 'dracula' : 'eclipse');
}

themeToggle.addEventListener('click', toggleTheme);

// Apply drag scroll to Editor and Output
// CodeMirror specific scroller
enableDragScroll(editor.getScrollerElement());
// Console output
enableDragScroll(outputContainer);
