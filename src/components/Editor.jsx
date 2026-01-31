import React, { useEffect, useRef } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/go/go';
import 'codemirror/mode/css/css';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/fold/comment-fold';

import { LANGUAGE_MODES } from '../utils/constants';

export default function Editor({ code, onChange, language }) {
    const editorRef = useRef(null);
    const cmInstance = useRef(null);

    useEffect(() => {
        if (!editorRef.current) return;

        cmInstance.current = CodeMirror(editorRef.current, {
            value: code,
            mode: LANGUAGE_MODES[language] || 'javascript',
            theme: 'dracula',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            tabSize: 2
        });

        cmInstance.current.on('change', (instance) => {
            onChange(instance.getValue());
        });

        return () => {
            // Cleanup not strictly necessary for simple div, but good practice
            if (editorRef.current) editorRef.current.innerHTML = '';
        };
    }, []); // Run once on mount

    // Update logic when props change
    useEffect(() => {
        if (cmInstance.current) {
            // Only set value if different to avoid cursor jumps
            if (cmInstance.current.getValue() !== code) {
                cmInstance.current.setValue(code);
            }
        }
    }, [code]); // Careful circular dependency? 
    // Actually, usually we don't update FROM props if we are writing. 
    // But if we switch language, `code` changes from parent. 
    // See handling in App.jsx.

    useEffect(() => {
        if (cmInstance.current) {
            const mode = LANGUAGE_MODES[language] || 'javascript';
            cmInstance.current.setOption('mode', mode);
            // Set tab size
            const size = (['python', 'cpp', 'java', 'go'].includes(language)) ? 4 : 2;
            cmInstance.current.setOption('tabSize', size);
        }
    }, [language]);

    return <div className="editor-wrapper" ref={editorRef} />;
}
