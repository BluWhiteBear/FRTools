// Render Form.io form inside an isolated iframe (only Bootstrap CSS applies)
function renderFormInIframe(formDefinition) {
    const iframe = document.getElementById('formio-frame');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Create isolated HTML document with only Bootstrap CSS
    const iframeContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.form.io/formiojs/formio.full.min.css">
    <style>
        body {
            padding: 1rem;
            background: #fff;
        }
    </style>
</head>
<body>
    <div id="formio-container"></div>
    <script src="https://cdn.form.io/formiojs/formio.full.min.js"><\/script>
    <script>
        const formDefinition = ${JSON.stringify(formDefinition)};
        const options = {
            sanitize: true,
            noAlerts: false,
            readOnly: false
        };
        
        Formio.createForm(document.getElementById('formio-container'), formDefinition, options)
            .then(form => {
                console.log('Form created successfully in iframe');
                // Auto-resize iframe to fit content
                const resizeObserver = new ResizeObserver(() => {
                    const height = document.body.scrollHeight;
                    window.parent.postMessage({ type: 'resize', height: height }, '*');
                });
                resizeObserver.observe(document.body);
            })
            .catch(err => {
                console.error('Error creating form:', err);
                document.getElementById('formio-container').innerHTML = 
                    '<div class="alert alert-danger">Error creating form: ' + err.message + '</div>';
            });
    <\/script>
</body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(iframeContent);
    iframeDoc.close();
}

// Listen for iframe resize messages
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'resize') {
        const iframe = document.getElementById('formio-frame');
        if (iframe) {
            iframe.style.height = (event.data.height + 20) + 'px';
        }
    }
});

// Handle file upload and tab population
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const formioData = JSON.parse(e.target.result);
            
            // Load client and server scripts
            const clientScript = formioData.ClientSideScript || '';
            const serverScript = formioData.ServerSideScript || '';

            // Get the form definition
            let formDefinition = formioData.FormioTemplate ? 
                JSON.parse(formioData.FormioTemplate) : 
                formioData;

            // Clean up problematic conditional logic
            const cleanComponent = (comp) => {
                if (comp.conditional) {
                    delete comp.conditional;
                }
                if (comp.customConditional) {
                    delete comp.customConditional;
                }
                if (comp.components) {
                    comp.components = comp.components.map(c => cleanComponent(c));
                }
                return comp;
            };

            // Clean up form definition
            if (formDefinition.components) {
                formDefinition.components = formDefinition.components.map(c => cleanComponent(c));
            }

            // Extract embedded scripts if they're not provided directly
            if (!clientScript && !serverScript) {
                const { extractedClientScript, extractedServerScript } = extractScriptsFromForm(formDefinition);
                
                // Update script editors with either provided or extracted scripts
                document.getElementById('clientScriptEditor').textContent = extractedClientScript;
                document.getElementById('serverScriptEditor').textContent = extractedServerScript;
            } else {
                // Use provided scripts
                document.getElementById('clientScriptEditor').textContent = clientScript;
                document.getElementById('serverScriptEditor').textContent = serverScript;
            }

            // Format and display template JSON
            document.getElementById('templateEditor').textContent = JSON.stringify(formDefinition, null, 2);

            // Show preview container
            const previewContainer = document.querySelector('.preview-container');
            previewContainer.style.display = 'block';

            // Render Form.io in isolated iframe
            renderFormInIframe(formDefinition);

            // Set up copy buttons
            setupCopyButtons();

            // Highlight code in all editors
            Prism.highlightAll();

            // Switch to viewer tab
            document.getElementById('viewer-tab').click();

        } catch (error) {
            console.error('Error parsing form definition:', error);
            formContainer.innerHTML = `
                <div class="alert alert-danger">
                    Error parsing form: ${error.message}
                </div>`;
        }
    };
    reader.readAsText(file);
});

function extractScriptsFromForm(formDefinition) {
    let clientScript = '';
    let serverScript = '';

    function processComponent(component) {
        // Client-side scripts
        if (component.customConditional) {
            clientScript += `// ${component.label || component.key} - Custom Condition\n${component.customConditional}\n\n`;
        }
        if (component.calculateValue) {
            clientScript += `// ${component.label || component.key} - Calculate Value\n${component.calculateValue}\n\n`;
        }
        if (component.customDefaultValue) {
            clientScript += `// ${component.label || component.key} - Default Value\n${component.customDefaultValue}\n\n`;
        }
        if (component.customValidation) {
            clientScript += `// ${component.label || component.key} - Custom Validation\n${component.customValidation}\n\n`;
        }
        if (component.customCode) {
            clientScript += `// ${component.label || component.key} - Custom Code\n${component.customCode}\n\n`;
        }
        if (component.validate?.custom) {
            clientScript += `// ${component.label || component.key} - Custom Validation\n${component.validate.custom}\n\n`;
        }

        // Server-side scripts
        if (component.validate?.json) {
            serverScript += `' ${component.label || component.key} - JSON Validation\n${component.validate.json}\n\n`;
        }
    }

    function walkComponents(components) {
        if (!components) return;
        
        components.forEach(component => {
            processComponent(component);

            // Recursively process nested components
            if (component.components) {
                walkComponents(component.components);
            }
            if (component.columns) {
                component.columns.forEach(col => {
                    if (col.components) {
                        walkComponents(col.components);
                    }
                });
            }
            if (component.rows) {
                component.rows.forEach(row => {
                    row.forEach(col => {
                        if (col.components) {
                            walkComponents(col.components);
                        }
                    });
                });
            }
            // Handle tabs
            if (component.tabs) {
                component.tabs.forEach(tab => {
                    if (tab.components) {
                        walkComponents(tab.components);
                    }
                });
            }
        });
    }

    // Process all components
    walkComponents(formDefinition.components || []);

    return {
        extractedClientScript: clientScript || '// No client-side scripts found',
        extractedServerScript: serverScript || "' No server-side scripts found"
    };
}

// Setup copy button functionality
function setupCopyButtons() {
    const copyButtons = {
        'copyClientScriptBtn': 'clientScriptEditor',
        'copyServerScriptBtn': 'serverScriptEditor',
        'copyTemplateBtn': 'templateEditor'
    };

    Object.entries(copyButtons).forEach(([buttonId, editorId]) => {
        document.getElementById(buttonId).onclick = async () => {
            try {
                const content = document.getElementById(editorId).textContent;
                await navigator.clipboard.writeText(content);
                const btn = document.getElementById(buttonId);
                btn.textContent = 'Copied!';
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.textContent = buttonId.includes('Template') ? 'Copy JSON' : 'Copy Script';
                    btn.classList.remove('btn-success');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        };
    });
}

// Ensure code highlighting is applied when switching tabs
document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', () => {
        Prism.highlightAll();
    });
});
