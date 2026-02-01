import React from 'react';
import { Code, Play, Database, FileCode } from 'lucide-react';

const languages = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨', desc: 'Run Node.js & ES6 code instantly' },
    { id: 'python', name: 'Python', icon: '🐍', desc: 'Execute Python 3 scripts in browser' },
    { id: 'react', name: 'React', icon: '⚛️', desc: 'Build React apps with JSX support' },
    { id: 'html', name: 'HTML/CSS', icon: '🎨', desc: 'Live preview for web designs' },
    { id: 'sql', name: 'SQL', icon: '🗄️', desc: 'Practice SQLite queries' },
    { id: 'cpp', name: 'C++', icon: '⚡', desc: 'Compile and run C++ code' },
    { id: 'java', name: 'Java', icon: '☕', desc: 'Run Java applications online' },
    { id: 'go', name: 'Go', icon: '🔵', desc: 'Execute Golang snippets' }
];

export default function LanguageGrid({ currentLang }) {
    return (
        <div className="language-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            padding: '40px',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            {languages.map(lang => (
                <a
                    key={lang.id}
                    href={`/compiler/${lang.id}`}
                    className={`lang-card ${currentLang === lang.id ? 'active' : ''}`}
                    style={{
                        textDecoration: 'none',
                        padding: '24px',
                        borderRadius: '12px',
                        background: currentLang === lang.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        border: `2px solid ${currentLang === lang.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = currentLang === lang.id ? 'var(--accent-color)' : 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <div style={{ fontSize: '2.5rem' }}>{lang.icon}</div>
                    <h3 style={{
                        color: 'var(--text-primary)',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        margin: 0
                    }}>{lang.name}</h3>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        margin: 0,
                        lineHeight: '1.5'
                    }}>{lang.desc}</p>
                </a>
            ))}
        </div>
    );
}
