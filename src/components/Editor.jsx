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

export default function Editor({ code, onChange, language, theme }) {
    const editorRef = useRef(null);
    const cmInstance = useRef(null);

    useEffect(() => {
        if (!editorRef.current) return;

        cmInstance.current = CodeMirror(editorRef.current, {
            value: code,
            mode: LANGUAGE_MODES[language] || 'javascript',
            theme: theme === 'dark' ? 'dracula' : 'eclipse',
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
            if (editorRef.current) editorRef.current.innerHTML = '';
        };
    }, []);

    // Update value
    useEffect(() => {
        if (cmInstance.current) {
            if (cmInstance.current.getValue() !== code) {
                cmInstance.current.setValue(code);
            }
        }
    }, [code]);

    // Update theme and language
    useEffect(() => {
        if (cmInstance.current) {
            const mode = LANGUAGE_MODES[language] || 'javascript';
            cmInstance.current.setOption('mode', mode);
            cmInstance.current.setOption('theme', theme === 'dark' ? 'dracula' : 'eclipse');

            const size = (['python', 'cpp', 'java', 'go'].includes(language)) ? 4 : 2;
            cmInstance.current.setOption('tabSize', size);
        }
    }, [language, theme]);

    return <div className="editor-wrapper" ref={editorRef} />;
}
