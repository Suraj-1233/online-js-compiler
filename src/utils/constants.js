export const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', short: 'JS', multiFile: false },
  { id: 'python', name: 'Python', short: 'Py', multiFile: false },
  { id: 'cpp', name: 'C++', short: 'C++', multiFile: false },
  { id: 'java', name: 'Java', short: 'Java', multiFile: false },
  { id: 'go', name: 'Go', short: 'Go', multiFile: false },
  { id: 'html', name: 'HTML/CSS/JS', short: 'HTML', multiFile: true },
  { id: 'react', name: 'React.js', short: 'React', multiFile: true },
  { id: 'sql', name: 'SQL (SQLite)', short: 'SQL', multiFile: true }
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
  react: 'javascript',
  sql: 'text/x-sql'
};

export const MULTI_FILE_TEMPLATES = {
  html: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML Project</title>
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
    'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
    'src/App.js': `import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Hello React ⚛️</h1>
      <p>Start editing to see some magic happen!</p>
      <button onClick={() => setCount(c => c + 1)}>
        Count is: {count}
      </button>
    </div>
  );
}`,
    'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    'src/styles.css': `.App {
  font-family: sans-serif;
  text-align: center;
  margin-top: 50px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background: #61dafb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  opacity: 0.8;
}`,
    'package.json': `{
  "name": "react-playground",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  }
}`
  },
  sql: {
    'schema.sql': `-- Create Tables
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user'
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  title TEXT,
  content TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Insert Sample Data
INSERT INTO users (name, email, role) VALUES 
('Alice', 'alice@example.com', 'admin'),
('Bob', 'bob@example.com', 'user'),
('Charlie', 'charlie@example.com', 'user');

INSERT INTO posts (user_id, title, content) VALUES
(1, 'Hello SQL', 'This is the first post'),
(2, 'Reactive Data', 'Using React with SQL?'),
(1, 'Admin Tips', 'How to manage users');`,
    'queries.sql': `-- Write your queries here
-- 1. Get all users
SELECT * FROM users;

-- 2. Join users and posts
SELECT users.name, posts.title, posts.content 
FROM users 
JOIN posts ON users.id = posts.user_id
WHERE users.role = 'admin';`
  }
};

export const SINGLE_FILE_DEFAULTS = {
  javascript: `// JavaScript Playground\nconsole.log("Hello JS!");`,
  python: `# Python Playground\nprint("Hello Python!")`,
  cpp: `#include <iostream>\nint main() {\n    std::cout << "Hello C++!" << std::endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}`,
  go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello Go!")\n}`
};
