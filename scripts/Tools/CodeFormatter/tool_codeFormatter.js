document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formatBtn').addEventListener('click', formatCode);
    document.getElementById('copyBtn').addEventListener('click', copyFormattedCode);
    document.getElementById('inputCode').addEventListener('input', detectLanguage);
    hideAlert(); // Hide any existing alerts on page load
});

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alertContent = alertContainer.querySelector('.alert-content');
    
    alertContainer.className = `alert alert-${type} mb-4`;
    alertContent.textContent = message;
    alertContainer.style.display = 'block';
}

function hideAlert() {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.style.display = 'none';
}

function detectLanguage(event) {
    const input = event.target.value.trim();
    const languageSelect = document.getElementById('languageSelect');
    
    if (languageSelect.value === 'auto' && input) {
        try {
            hideAlert();
            
            // First try specific patterns that are more reliable
            if (input.startsWith('<?xml')) {
                languageSelect.value = 'xml';
                return;
            }
            
            // More lenient HTML detection
            if (input.includes('<!DOCTYPE html') || 
                input.includes('<html') || 
                (input.match(/<[a-z][^>]*>/i) && input.match(/<\/[a-z][^>]*>/i))) {
                languageSelect.value = 'html';
                return;
            }
            
            // Try parsing as JSON
            if (input.startsWith('{') || input.startsWith('[')) {
                try {
                    JSON.parse(input);
                    languageSelect.value = 'json';
                    return;
                } catch {}
            }
            
            // Check for SQL patterns
            const sqlPatterns = [
                /SELECT.*FROM/i,
                /INSERT INTO.*VALUES/i,
                /UPDATE.*SET/i,
                /DELETE FROM/i,
                /CREATE TABLE/i,
                /ALTER TABLE/i
            ];
            if (sqlPatterns.some(pattern => pattern.test(input))) {
                languageSelect.value = 'sql';
                return;
            }
            
            // Check for CSS patterns
            if (input.includes('{') && input.includes('}') && /[a-z-]+\s*:\s*[^;]+;/.test(input)) {
                languageSelect.value = 'css';
                return;
            }
            
            // Use language detector for JavaScript/TypeScript/JSX/TSX
            const detectedLang = langDetector.detectOne(input);
            if (detectedLang) {
                switch (detectedLang.toLowerCase()) {
                    case 'jsx':
                    case 'tsx':
                    case 'typescript':
                    case 'javascript':
                        languageSelect.value = detectedLang.toLowerCase();
                        return;
                }
            }
            
            if (input.length > 30) { // Only show alert if there's enough content to detect
                showAlert('Unable to auto-detect language. Please select a language manually.', 'warning');
            }
        } catch (err) {
            console.warn('Language detection error:', err);
        }
    }
}

function formatCode() {
    const input = document.getElementById('inputCode').value;
    const output = document.getElementById('outputCode');
    const language = document.getElementById('languageSelect').value;
    
    if (!input.trim()) {
        output.innerHTML = '<div class="text-muted">Please enter some code to format...</div>';
        return;
    }
    
    try {
        hideAlert(); // Hide any previous alerts
        let formatted;
        let languageClass;
        
        // Common Prettier options
        const prettierOptions = {
            printWidth: 100,
            tabWidth: 4,
            semi: true,
            singleQuote: true,
            trailingComma: 'es5',
            bracketSpacing: true,
            plugins: prettierPlugins,
        };
        
        switch (language) {
            case 'html':
            case 'xml':
                // Safely encode HTML entities
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'html',
                    htmlWhitespaceSensitivity: 'css'
                });
                
                // Only encode after formatting, and only encode < and > to preserve readability
                formatted = formatted
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                    
                languageClass = 'language-markup';
                break;
                
            case 'json':
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'json'
                });
                languageClass = 'language-json';
                break;
                
            case 'css':
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'css'
                });
                languageClass = 'language-css';
                break;
                
            case 'sql':
                try {
                    // Configure sql-formatter with more permissive options
                    formatted = sqlFormatter.format(input, {
                        language: 'tsql', // Use T-SQL dialect for better MS SQL Server support
                        indent: '    ',
                        uppercase: true,
                        linesBetweenQueries: 2,
                        keywordCase: 'upper',
                        dataTypeCase: 'upper',
                        functionCase: 'upper',
                        identifierCase: 'preserve' // Keep case of identifiers (table names, columns, etc.)
                    });
                } catch (sqlErr) {
                    // Fallback to basic SQL formatting if advanced formatting fails
                    console.warn('Advanced SQL formatting failed, using basic formatting:', sqlErr);
                    formatted = input
                        .replace(/\s+/g, ' ')
                        .replace(/\s*,\s*/g, ', ')
                        .replace(/\s*=\s*/g, ' = ')
                        .replace(/\(\s*/g, '(')
                        .replace(/\s*\)/g, ')')
                        .replace(/\s*\[\s*/g, '[')
                        .replace(/\s*\]\s*/g, ']')
                        .replace(/\s+AND\s+/gi, '\n    AND ')
                        .replace(/\s+OR\s+/gi, '\n    OR ')
                        .replace(/\s*SELECT\s+/gi, 'SELECT\n    ')
                        .replace(/\s*FROM\s+/gi, '\nFROM\n    ')
                        .replace(/\s*WHERE\s+/gi, '\nWHERE\n    ')
                        .replace(/\s*GROUP\s+BY\s+/gi, '\nGROUP BY\n    ')
                        .replace(/\s*ORDER\s+BY\s+/gi, '\nORDER BY\n    ')
                        .replace(/\s*INNER\s+JOIN\s+/gi, '\nINNER JOIN ')
                        .replace(/\s*LEFT\s+JOIN\s+/gi, '\nLEFT JOIN ')
                        .replace(/\s*RIGHT\s+JOIN\s+/gi, '\nRIGHT JOIN ')
                        .replace(/\s*ON\s+/gi, '\n    ON ');
                }
                languageClass = 'language-sql';
                break;
                
            case 'typescript':
            case 'tsx':
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'typescript'
                });
                languageClass = `language-${language}`;
                break;
                
            case 'jsx':
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'babel'
                });
                languageClass = 'language-jsx';
                break;
                
            default: // javascript
                formatted = prettier.format(input, {
                    ...prettierOptions,
                    parser: 'babel'
                });
                languageClass = 'language-javascript';
        }
        
        output.innerHTML = `<code class="${languageClass}">${formatted}</code>`;
        Prism.highlightElement(output.querySelector('code'));
        
    } catch (err) {
        showAlert(`Error formatting code: ${err.message}`);
        output.innerHTML = `<div class="text-danger">Failed to format code. Check the error message above.</div>`;
    }
}

async function copyFormattedCode() {
    const code = document.querySelector('#outputCode code')?.textContent;
    if (code) {
        try {
            await navigator.clipboard.writeText(code);
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            
            btn.textContent = 'Copied!';
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('btn-success');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy:', err);
            const btn = document.getElementById('copyBtn');
            btn.textContent = 'Copy Failed';
            btn.classList.add('btn-danger');
            
            setTimeout(() => {
                btn.textContent = 'Copy Formatted Code';
                btn.classList.remove('btn-danger');
            }, 2000);
        }
    }
}