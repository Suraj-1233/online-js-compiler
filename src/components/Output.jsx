import React, { useRef, useEffect, useState } from 'react';

export default function Output({ mode, messages, previewContent }) {
    const [subMode, setSubMode] = useState('preview'); // 'preview' or 'console'
    const endRef = useRef(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [messages]);

    // If we switch to console mode (JavaScript/Python), we don't need tabs
    const isDualMode = mode === 'preview';

    const renderConsole = () => (
        <div className="console-output">
            {messages.length === 0 && <div style={{ color: '#555', padding: '10px' }}>No logs yet...</div>}
            {messages.map((msg, i) => (
                <div key={i} className={`console-line ${msg.type}`} style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {msg.type !== 'table' && renderMessage(msg)}
                    </div>
                    {msg.type === 'table' && renderMessage(msg)}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );

    const renderMessage = (msg) => {
        if (msg.type === 'table') {
            try {
                const data = typeof msg.text === 'string' ? JSON.parse(msg.text) : msg.text;
                if (!data || !data.columns) return <pre>{JSON.stringify(data, null, 2)}</pre>;

                return (
                    <div className="sql-result-table">
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                    {data.columns.map((col, idx) => (
                                        <th key={idx} style={{
                                            border: '1px solid var(--border-color)',
                                            padding: '8px',
                                            textAlign: 'left',
                                            color: 'var(--accent-color)'
                                        }}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.values.map((row, rIdx) => (
                                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        {row.map((val, cIdx) => (
                                            <td key={cIdx} style={{
                                                padding: '8px',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}>
                                                {String(val)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            {data.values.length} rows returned
                        </div>
                    </div>
                );
            } catch (e) {
                return <span>Error rendering table: {e.message}</span>;
            }
        }
        return <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>;
    };

    if (isDualMode) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="output-tabs" style={{
                    display: 'flex',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    <button
                        className={`output-tab ${subMode === 'preview' ? 'active' : ''}`}
                        onClick={() => setSubMode('preview')}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: subMode === 'preview' ? 'var(--bg-primary)' : 'transparent',
                            color: subMode === 'preview' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            borderRight: '1px solid var(--border-color)'
                        }}
                    >
                        PREVIEW
                    </button>
                    <button
                        className={`output-tab ${subMode === 'console' ? 'active' : ''}`}
                        onClick={() => setSubMode('console')}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: subMode === 'console' ? 'var(--bg-primary)' : 'transparent',
                            color: subMode === 'console' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            borderRight: '1px solid var(--border-color)'
                        }}
                    >
                        CONSOLE {messages.length > 0 && `(${messages.length})`}
                    </button>
                </div>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
                    {subMode === 'preview' ? (
                        <iframe
                            className="preview-frame"
                            srcDoc={previewContent}
                            title="Preview"
                            sandbox="allow-scripts allow-modals"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    ) : renderConsole()}
                </div>
            </div>
        );
    }

    return renderConsole();
}
