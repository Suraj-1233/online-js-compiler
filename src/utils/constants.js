export const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', short: 'JS' },
    { id: 'python', name: 'Python', short: 'Py' },
    { id: 'cpp', name: 'C++', short: 'C++' },
    { id: 'java', name: 'Java', short: 'Java' },
    { id: 'go', name: 'Go', short: 'Go' },
    { id: 'html', name: 'HTML/CSS', short: 'HTML' },
    { id: 'react', name: 'React.js', short: 'React' }
];

export const DEFAULT_CODE = {
    javascript: `// Welcome to Code Playground! \nconsole.log("Hello from React! 🚀");\n\nconst items = [1, 2, 3];\nconsole.log("Items:", items);`,
    python: `# Welcome to Code Playground!\nprint("Hello from Python! 🐍")\n\nfor i in range(3):\n    print(f"Count: {i}")`,
    cpp: `// Welcome to Code Playground!\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++! 🚀" << std::endl;\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java! ☕");\n    }\n}`,
    go: `package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go! 🐹")\n}`,
    html: `<!DOCTYPE html>\n<html>\n<head>\n  <style>body { font-family: sans-serif; text-align: center; color: #333; }</style>\n</head>\n<body>\n  <h1>Hello HTML! 🌐</h1>\n</body>\n</html>`,
    react: `<!DOCTYPE html>\n<html>\n<head>\n  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>\n  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>\n  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n  <style>body { font-family: sans-serif; text-align: center; padding: 20px; }</style>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="text/babel">\n    function App() {\n      const [count, setCount] = React.useState(0);\n      return (\n        <div>\n          <h1>React Counter ⚛️</h1>\n          <p>Count: {count}</p>\n          <button onClick={() => setCount(count + 1)}>Increment</button>\n        </div>\n      );\n    }\n    const root = ReactDOM.createRoot(document.getElementById('root'));\n    root.render(<App />);\n  </script>\n</body>\n</html>`
};

export const LANGUAGE_MODES = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'text/x-c++src',
    java: 'text/x-java',
    go: 'text/x-go',
    html: 'htmlmixed',
    react: 'htmlmixed'
};
