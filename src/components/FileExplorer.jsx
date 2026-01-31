import React, { useState } from 'react';
import {
    FileCode, FileJson, FileType, File, Folder, FolderOpen,
    ChevronRight, ChevronDown, Plus
} from 'lucide-react';

const getIcon = (filename) => {
    if (filename.endsWith('.html')) return <FileCode size={16} color="#e44d26" />;
    if (filename.endsWith('.css')) return <FileType size={16} color="#264de4" />;
    if (filename.endsWith('.js')) return <FileJson size={16} color="#f7df1e" />;
    if (filename.endsWith('.jsx')) return <FileCode size={16} color="#61dafb" />;
    if (filename.endsWith('.json')) return <FileJson size={16} color="#cbcbcb" />;
    return <File size={16} />;
};

// Helper: Convert paths to nested object tree
const buildTree = (paths) => {
    const tree = {};
    paths.forEach(path => {
        const parts = path.split('/');
        let current = tree;
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = index === parts.length - 1 ? null : {}; // null = file, {} = folder
            }
            current = current[part];
        });
    });
    return tree;
};

const FileItem = ({ name, path, isFolder, children, activeFile, onSelect, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (isFolder) {
        return (
            <div style={{ paddingLeft: depth * 12 }}>
                <div
                    className="file-item folder"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isOpen ? <FolderOpen size={16} color="#fbbf24" /> : <Folder size={16} color="#fbbf24" />}
                    <span className="file-name">{name}</span>
                </div>
                {isOpen && Object.keys(children).map(childName => (
                    <FileItem
                        key={childName}
                        name={childName}
                        path={`${path}${childName}`}
                        isFolder={children[childName] !== null}
                        children={children[childName]}
                        activeFile={activeFile}
                        onSelect={onSelect}
                        depth={depth + 1}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`file-item ${activeFile === path ? 'active' : ''}`}
            style={{ paddingLeft: (depth * 12) + 20 }} // +20 for indentation alignment with tokens
            onClick={() => onSelect(path)}
        >
            {getIcon(name)}
            <span className="file-name">{name}</span>
        </div>
    );
};

export default function FileExplorer({ files, activeFile, onSelectFile, onAddFile }) {
    const filePaths = Object.keys(files).sort(); // Sort helps grouping
    const tree = buildTree(filePaths);

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <span>Files</span>
                <button className="btn-icon-only" onClick={onAddFile} title="New File">
                    <Plus size={14} />
                </button>
            </div>
            <div className="file-list">
                {Object.keys(tree).map(name => {
                    // If it's a folder, path should include slash? No, simple recursion handles it
                    // But for top level, path is empty prefix
                    const isFolder = tree[name] !== null;
                    // If folder, we need to pass down the correct prefix for children
                    // Actually, my recursive builder reconstructs paths purely from names? 
                    // No, I need to know full path for selection.
                    // Let's pass the 'current path so far'.
                    return (
                        <FileItem
                            key={name}
                            name={name}
                            path={isFolder ? `${name}/` : name}
                            isFolder={isFolder}
                            children={tree[name]}
                            activeFile={activeFile}
                            onSelect={onSelectFile}
                        />
                    );
                })}
            </div>
        </div>
    );
}
