import React from 'react';
import { Terminal, Cpu, Coffee, Box, Globe, Atom, Code2 } from 'lucide-react';
import { LANGUAGES } from '../utils/constants';

const ICON_MAP = {
    javascript: Code2,
    python: Terminal, // Approximation
    cpp: Cpu,
    java: Coffee,
    go: Box,
    html: Globe,
    react: Atom
};

export default function Sidebar({ currentLanguage, setLanguage }) {
    return (
        <div className="language-sidebar">
            {LANGUAGES.map(lang => {
                const Icon = ICON_MAP[lang.id] || Code2;
                return (
                    <div
                        key={lang.id}
                        className={`language-tab ${currentLanguage === lang.id ? 'active' : ''}`}
                        onClick={() => setLanguage(lang.id)}
                        title={lang.name}
                    >
                        <div className="lang-icon">
                            <Icon size={20} />
                        </div>
                        <span className="lang-name">{lang.short}</span>
                    </div>
                );
            })}
        </div>
    );
}
