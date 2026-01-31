import React, { useState } from 'react';
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
}