# ⚡️ Online JavaScript Compiler

A lightweight, client-side JavaScript playground that lets you write and execute code instantly in your browser.

## Features

- **Real-time Editor**: Powered by CodeMirror with syntax highlighting and bracket matching.
- **Safe Execution**: sandboxed `console.log`, `warn`, and `error` outputs.
- **Themes**: Switch between Dark (Dracula) and Light (Eclipse) modes.
- **Persistence**: Automatically saves your work to Local Storage so you never lose code on refresh.
- **Responsive**: Works great on desktop and mobile.
- **Share**: Generate shareable URLs with your code encoded in the link.
- **Download**: Export your code as a `.js` file.

## How to Use

1. **Write Code**: Type standard JavaScript in the editor pane.
2. **Run**: Click the "Run Code" button (or ⚡️ icon) to execute.
3. **View Output**: See results in the Console Output pane.
4. **Clear**: Use the Clear button to reset the editor (requires confirmation).
5. **Share**: Click the share icon to copy a link to your clipboard.

## Installation / Deployment

Since this is a static web application (HTML/CSS/JS only), you can deploy it anywhere!

### Local
Simply map the folder to a web server or open `index.html` directly in your browser.

### Deploy to Netlify / Vercel / GitHub Pages
1. Upload this folder.
2. Point the build settings to `index.html` (no build command needed).
3. Publish!

## Tech Stack
- HTML5
- CSS3 (Variables, Flexbox)
- JavaScript (ES6+)
- [CodeMirror 5](https://codemirror.net/5/) (via CDN)

## License
MIT
