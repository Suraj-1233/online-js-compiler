import React, { useRef, useEffect } from 'react';

export default function Output({ mode, messages, previewContent }) {
    const endRef = useRef(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (mode === 'preview') {
        return (
            <iframe
                className="preview-frame"
                srcDoc={previewContent}
                title="Preview"
                sandbox="allow-scripts allow-modals"
            />
        );
    }

    const renderMessage = (msg) => {
        if (msg.type === 'table') {
            try {
                // Determine if we need to parse
                // In App.jsx, I will pass the object. addLog converts to string?
                // I will modify App.jsx to NOT stringify if type is 'table' inside the logs state?
                // Or I'll just JSON.parse here.
                const data = typeof msg.text === 'string' ? JSON.parse(msg.text) : msg.text;

                if (!data || !data.columns) return <pre>{JSON.stringify(data, null, 2)}</pre>;

                return (
                    <div className="sql-result-table" style={{ marginTop: 8, marginBottom: 16, overflowX: 'auto' }}>
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

    return (
        <div className="console-output">
            {messages.map((msg, i) => (
                <div key={i} className={`console-line ${msg.type}`} style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="timestamp" style={{ marginRight: 10 }}>{msg.time}</span>
                        {msg.type !== 'table' && renderMessage(msg)}
                    </div>
                    {msg.type === 'table' && renderMessage(msg)}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
