// DOM Elements
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const outputContainer = document.getElementById('output');
const previewFrame = document.getElementById('previewFrame');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const languageTabs = document.querySelectorAll('.language-tab');
const languageLabel = document.getElementById('languageLabel');

// Local Storage Keys
const CODE_STORAGE_PREFIX = 'code_playground_code_';
const LANGUAGE_KEY = 'code_playground_language';

// Helper to get storage key for a language
const getStorageKey = (lang) => CODE_STORAGE_PREFIX + lang;

// Current Language
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'javascript';

// Python & Piston Runtime Instances
let pythonRuntime = null;
let pistonRuntime = null;

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
`,
    cpp: `// Welcome to Code Playground!
// Write your C++ code here and click "Run Code"

#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello from C++! 🚀" << std::endl;
    
    std::vector<std::string> fruits = {"Apple", "Banana", "Cherry"};
    std::cout << "Fruits: ";
    for (const auto& fruit : fruits) {
        std::cout << fruit << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`,
    java: `// Welcome to Code Playground!
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java! ☕");
        
        for (int i = 1; i <= 3; i++) {
            System.out.println("Count: " + i);
        }
    }
}`,
    go: `// Welcome to Code Playground!
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go! 🐹")
    
    fruits := []string{"Apple", "Banana", "Cherry"}
    for _, fruit := range fruits {
        fmt.Println(fruit)
    }
}`,
    html: `<!-- Welcome to Code Playground! -->
<!-- Write HTML, CSS, and JS here for Live Preview -->

<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      background: #f0f0f0;
      color: #333;
      padding: 20px;
    }
    h1 { color: #e91e63; }
    .card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: inline-block;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      background: #e91e63;
      border: none;
      border-radius: 4px;
      color: white;
      margin-top: 10px;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>

  <div class="card">
      <h1>Hello from HTML Preview! 🌐</h1>
      <p>Edit this code and click "Run Code" to update.</p>
      
      <button onclick="alert('Hello from inner iframe!')">Click Me</button>
  </div>

</body>
</html>`,
    react: `<!-- React Playground ⚛️ -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <!-- React & ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <!-- Babel for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <style>
    body { font-family: sans-serif; padding: 20px; text-align: center; background: #282c34; color: white; margin: 0; }
    .container { background: #333; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: inline-block; margin-top: 50px; }
    button { background: #61dafb; border: none; padding: 10px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; color: #282c34; font-weight: bold; margin-top: 10px; }
    button:hover { opacity: 0.8; }
    h1 { color: #61dafb; }
  </style>
</head>
<body>

  <div id="root"></div>

  <script type="text/babel">
    function App() {
      const [count, setCount] = React.useState(0);

      return (
        <div className="container">
          <h1>Hello, React! ⚛️</h1>
          <p>You clicked {count} times</p>
          <button onClick={() => setCount(count + 1)}>
            Click Me
          </button>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>

</body>
</html>`
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
        setTimeout(() => showToast('Code loaded from URL', 'success'), 500);
    } else {
        initialCode = localStorage.getItem(getStorageKey(currentLanguage)) || defaultCode[currentLanguage];
        setTimeout(() => showToast('Invalid URL code, loaded saved/default', 'error'), 500);
    }
} else {
    const savedCode = localStorage.getItem(getStorageKey(currentLanguage));
    initialCode = savedCode !== null ? savedCode : defaultCode[currentLanguage];
}

// Language mode mapping
const languageModes = {
    'javascript': 'javascript',
    'python': 'python',
    'cpp': 'text/x-c++src',
    'java': 'text/x-java',
    'go': 'text/x-go',
    'html': 'htmlmixed',
    'react': 'htmlmixed' // Uses HTML + Babel script
};

// Initialize CodeMirror
let editor = CodeMirror(document.getElementById("editor"), {
    mode: languageModes[currentLanguage] || 'javascript',
    theme: "dracula",
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    tabSize: (currentLanguage === 'python' || currentLanguage === 'cpp' || currentLanguage === 'java' || currentLanguage === 'go') ? 4 : 2,
    value: initialCode,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
});

// UI Helper to switch between Output and Preview
function updateOutputView(lang) {
    const outputTitle = document.querySelector('.output-pane .pane-title');

    if (lang === 'html' || lang === 'react') {
        outputContainer.style.display = 'none';
        previewFrame.style.display = 'block';
        outputTitle.textContent = 'Preview';
        clearConsoleBtn.style.display = 'none';
        previewFrame.srcdoc = editor.getValue();
    } else {
        outputContainer.style.display = 'block';
        previewFrame.style.display = 'none';
        outputTitle.textContent = 'Output';
        clearConsoleBtn.style.display = 'inline-block';
    }
}

// Initial UI Setup
updateOutputView(currentLanguage);

// Set active language tab
languageTabs.forEach(tab => {
    if (tab.dataset.lang === currentLanguage) {
        tab.classList.add('active');
    } else {
        tab.classList.remove('active');
    }
});

// Update language label
const labels = {
    'javascript': 'JavaScript',
    'python': 'Python',
    'cpp': 'C++',
    'java': 'Java',
    'go': 'Go',
    'html': 'HTML/CSS',
    'react': 'React.js'
};
languageLabel.textContent = labels[currentLanguage] || currentLanguage;

// Save to Local Storage on change
editor.on('change', () => {
    localStorage.setItem(getStorageKey(currentLanguage), editor.getValue());
});

// Web Worker Logic
const workerCode = `
    self.onmessage = function(e) {
        const code = e.data;
        
        let hasAsync = false;
        
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
        
        const customConsole = {
            log: (...args) => self.postMessage({ type: 'log', args }),
            warn: (...args) => self.postMessage({ type: 'warn', args }),
            error: (...args) => self.postMessage({ type: 'error', args }),
            info: (...args) => self.postMessage({ type: 'log', args })
        };

        try {
            const run = new Function('console', code);
            run(customConsole);
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

    // Clear previous output (only if console mode)
    if (currentLanguage !== 'html' && currentLanguage !== 'react') {
        outputContainer.innerHTML = '';
    }

    toggleRunState(true);

    if (currentLanguage === 'javascript') {
        if (currentWorker) {
            currentWorker.terminate();
        }

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        currentWorker = new Worker(URL.createObjectURL(blob));

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

        currentWorker.postMessage(code);

    } else if (['cpp', 'java', 'go'].includes(currentLanguage)) {
        const versions = {
            'cpp': '10.2.0',
            'java': '15.0.2',
            'go': '1.16.2'
        };

        try {
            pistonRuntime = new PistonRuntime(currentLanguage, versions[currentLanguage]);

            await pistonRuntime.execute(
                code,
                (output) => appendToOutput(output, 'log'),
                (error) => appendToOutput(error, 'error')
            );

            toggleRunState(false);
        } catch (error) {
            appendToOutput([`Runtime Error: ${error.message}`], 'error');
            toggleRunState(false);
        }

    } else if (currentLanguage === 'python') {
        try {
            if (!pythonRuntime) {
                pythonRuntime = new PythonRuntime();
            }

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
    } else if (currentLanguage === 'html' || currentLanguage === 'react') {
        // Just update iframe
        previewFrame.srcdoc = code;
        setTimeout(() => toggleRunState(false), 200);
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

// Drag to Scroll Logic
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
        const walkX = (x - startX) * 1.5;
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
        localStorage.setItem(getStorageKey(currentLanguage), content);
        showToast('File uploaded successfully', 'success');

        // Auto update preview if HTML/React
        if (currentLanguage === 'html' || currentLanguage === 'react') {
            previewFrame.srcdoc = content;
        }
    };
    reader.onerror = function () {
        showToast('Error reading file', 'error');
    };
    reader.readAsText(file);

    event.target.value = '';
}

// Download Code Logic
function downloadCode() {
    const code = editor.getValue();
    let ext = 'js';
    if (currentLanguage === 'python') ext = 'py';
    else if (currentLanguage === 'cpp') ext = 'cpp';
    else if (currentLanguage === 'java') ext = 'java';
    else if (currentLanguage === 'go') ext = 'go';
    else if (currentLanguage === 'html') ext = 'html';
    else if (currentLanguage === 'react') ext = 'html'; // React is mostly HTML here

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `playground.${ext}`;
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

    window.history.replaceState(null, null, newUrl);

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

// Language Sidebar Tabs
languageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const newLanguage = tab.dataset.lang;

        // Don't do anything if already active
        if (newLanguage === currentLanguage) return;

        // Update active state
        languageTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update language label
        const labels = {
            'javascript': 'JavaScript',
            'python': 'Python',
            'cpp': 'C++',
            'java': 'Java',
            'go': 'Go',
            'html': 'HTML/CSS',
            'react': 'React.js'
        };
        languageLabel.textContent = labels[newLanguage] || newLanguage;

        // Switch Language
        currentLanguage = newLanguage;
        localStorage.setItem(LANGUAGE_KEY, newLanguage);

        // Update CodeMirror mode
        editor.setOption('mode', languageModes[newLanguage] || 'javascript');
        editor.setOption('tabSize', (newLanguage === 'python' || newLanguage === 'cpp' || newLanguage === 'java' || newLanguage === 'go') ? 4 : 2);

        // Load Code for New Language
        const savedCode = localStorage.getItem(getStorageKey(newLanguage));
        const codeToLoad = savedCode !== null ? savedCode : defaultCode[newLanguage];
        editor.setValue(codeToLoad);

        // Clear output (handled by updateOutputView logic mostly)
        outputContainer.innerHTML = '';

        // Update View (Preview vs Console)
        updateOutputView(newLanguage);
    });
});

clearConsoleBtn.addEventListener('click', () => {
    outputContainer.innerHTML = '';
    showToast('Cleared', 'info', 2000);
});

clearBtn.addEventListener('click', () => {
    showConfirmToast('Clear all code? This cannot be undone.', () => {
        editor.setValue('');
        localStorage.setItem(getStorageKey(currentLanguage), '');
        outputContainer.innerHTML = '';
        if (currentLanguage === 'html' || currentLanguage === 'react') {
            previewFrame.srcdoc = '';
        }
        editor.focus();
        showToast('Code and output cleared', 'success');
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
