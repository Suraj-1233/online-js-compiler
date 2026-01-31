export const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', short: 'JS', multiFile: false },
    { id: 'python', name: 'Python', short: 'Py', multiFile: false },
    { id: 'cpp', name: 'C++', short: 'C++', multiFile: false },
    { id: 'java', name: 'Java', short: 'Java', multiFile: false },
    { id: 'go', name: 'Go', short: 'Go', multiFile: false },
    { id: 'html', name: 'HTML/CSS/JS', short: 'HTML', multiFile: true },
    { id: 'react', name: 'React.js', short: 'React', multiFile: true }
];

export const LANGUAGE_MODES = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'text/x-c++src',
    java: 'text/x-java',
    go: 'text/x-go',
    html: 'htmlmixed',
    css: 'css',
    json: 'application/json',
    react: 'javascript' // JSX
};

// Config for multi-file templates
export const MULTI_FILE_TEMPLATES = {
    html: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello World 🌍</h1>
    <button id="btn">Click me</button>
    <p id="msg"></p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
        'style.css': `body {
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
  margin: 0;
}
.container {
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
h1 { color: #333; }
button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover { background: #0056b3; }`,
        'script.js': `document.getElementById('btn').addEventListener('click', () => {
    document.getElementById('msg').innerText = 'You clicked the button!';
});`
    },
    react: {
        'App.jsx': `import React, { useState } from 'react';
import './style.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>React Playground ⚛️</h1>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>App.jsx</code> and save to test HMR updates.
        </p>
      </div>
    </div>
  );
}`,
        'style.css': `.app {
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;
  padding: 2rem;
}
.card {
  padding: 2em;
  background: #2a2a2a;
  color: white;
  border-radius: 8px;
  display: inline-block;
  margin-top: 1rem;
}
button {
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  background-color: #646cff;
  border-radius: 8px;
  border: 1px solid transparent;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}`
    }
};

export const SINGLE_FILE_DEFAULTS = {
    javascript: `// JavaScript Playground\nconsole.log("Hello JS!");`,
    python: `# Python Playground\nprint("Hello Python!")`,
    cpp: `#include <iostream>\nint main() {\n    std::cout << "Hello C++!" << std::endl;\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}`,
    go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello Go!")\n}`
};
