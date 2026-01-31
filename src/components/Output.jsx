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

    return (
        <div className="console-output">
            {messages.map((msg, i) => (
                <div key={i} className={`console-line ${msg.type}`}>
                    <span className="timestamp">{msg.time}</span>
                    <span>{msg.text}</span>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
