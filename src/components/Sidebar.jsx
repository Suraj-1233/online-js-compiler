import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Cpu, Coffee, Box, Globe, Atom, Code2 } from 'lucide-react';
import { LANGUAGES } from '../utils/constants';

const ICON_MAP = {
    javascript: Code2,
    python: Terminal,
    cpp: Cpu,
    java: Coffee,
    go: Box,
    html: Globe,
    react: Atom
};

export default function Sidebar({ currentLanguage }) {
    return (
        <div className="language-sidebar">
            {LANGUAGES.map(lang => {
                const Icon = ICON_MAP[lang.id] || Code2;
                const isActive = currentLanguage === lang.id;

                return (
                    <Link
                        key={lang.id}
                        to={`/compiler/${lang.id}`}
                        className={`language-tab ${isActive ? 'active' : ''}`}
                        title={lang.name}
                    >
                        <div className="lang-icon">
                            <Icon size={20} />
                        </div>
                        <span className="lang-name">{lang.short}</span>
                    </Link>
                );
            })}
        </div>
    );
}
