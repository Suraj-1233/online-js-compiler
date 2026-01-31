// Python Runtime using Pyodide
class PythonRuntime {
    constructor() {
        this.pyodide = null;
        this.loading = false;
        this.loaded = false;
    }

    async initialize() {
        if (this.loaded) return this.pyodide;
        if (this.loading) {
            // Wait for existing load to complete
            while (this.loading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.pyodide;
        }

        this.loading = true;
        try {
            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
            });
            this.loaded = true;
            return this.pyodide;
        } catch (error) {
            console.error("Failed to load Pyodide:", error);
            throw error;
        } finally {
            this.loading = false;
        }
    }

    async execute(code, onOutput, onError) {
        try {
            const pyodide = await this.initialize();

            // Redirect Python stdout to JavaScript
            pyodide.runPython(`
import sys
import io

class JSOutput:
    def __init__(self):
        self.buffer = []
    
    def write(self, text):
        # Append all text to preserve newlines
        self.buffer.append(text)
    
    def flush(self):
        pass
    
    def get_output(self):
        result = ''.join(self.buffer)
        self.buffer = []
        return result

_js_output = JSOutput()
sys.stdout = _js_output
sys.stderr = _js_output
            `);

            // Execute user code
            pyodide.runPython(code);

            // Get output
            const output = pyodide.runPython('_js_output.get_output()');
            if (output) {
                onOutput([output]);
            }

            return { success: true };
        } catch (error) {
            onError([error.message]);
            return { success: false, error: error.message };
        }
    }
}

// Export for use in main script
window.PythonRuntime = PythonRuntime;
