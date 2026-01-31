import React from 'react';
import { FileCode, FileJson, FileType, File } from 'lucide-react';

export default function FileExplorer({ files, activeFile, onSelectFile }) {
    const getIcon = (filename) => {
        if (filename.endsWith('.html')) return <FileCode size={16} color="#e44d26" />;
        if (filename.endsWith('.css')) return <FileType size={16} color="#264de4" />;
        if (filename.endsWith('.js')) return <FileJson size={16} color="#f7df1e" />;
        if (filename.endsWith('.jsx')) return <FileCode size={16} color="#61dafb" />;
        return <File size={16} />;
    };

    return (
        <div className="file-explorer">
            <div className="explorer-header">FILES</div>
            <div className="file-list">
                {Object.keys(files).map((filename) => (
                    <div
                        key={filename}
                        className={`file-item ${activeFile === filename ? 'active' : ''}`}
                        onClick={() => onSelectFile(filename)}
                    >
                        {getIcon(filename)}
                        <span className="file-name">{filename}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
