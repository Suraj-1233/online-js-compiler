class PistonRuntime {
    constructor(language, version) {
        this.language = language;
        this.version = version || '*';
        this.apiUrl = 'https://emkc.org/api/v2/piston/execute';
    }

    async execute(code, onOutput, onError) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: this.language,
                    version: this.version,
                    files: [
                        {
                            content: code
                        }
                    ]
                }),
            });

            const result = await response.json();

            if (result.message) {
                // API Error
                onError([`API Error: ${result.message}`]);
                return { success: false, error: result.message };
            }

            if (result.run) {
                const { stdout, stderr, output, code } = result.run;

                // Add newline to stdout if it doesn't end with one, nicely formatted
                // Piston usually returns raw string. 

                if (stdout) onOutput([stdout]);
                if (stderr) onError([stderr]);

                // Fallback
                if (!stdout && !stderr && output) {
                    onOutput([output]);
                }

                return { success: code === 0 };
            }

            return { success: false, error: 'Unknown response format' };

        } catch (error) {
            onError([`Network Error: ${error.message}`]);
            return { success: false, error: error.message };
        }
    }
}

window.PistonRuntime = PistonRuntime;
