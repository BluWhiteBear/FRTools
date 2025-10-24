// Handle file upload and tab population
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const formioData = JSON.parse(e.target.result);
            const formContainer = document.getElementById('formio-rendered');
            formContainer.innerHTML = '';

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

            // Create Form.io form with options
            const options = {
                sanitize: true,
                noAlerts: false,
                readOnly: false,
                hooks: {
                    beforeSubmit: (submission, next) => {
                        console.log('Form submission:', submission);
                        next();
                    }
                }
            };

            Formio.createForm(formContainer, formDefinition, options)
                .then(form => {
                    console.log('Form created successfully');
                    form.on('change', () => {
                        console.log('Form data:', form.data);
                    });
                    form.on('error', (errors) => {
                        console.error('Form errors:', errors);
                    });
                })
                .catch(err => {
                    console.error('Error creating form:', err);
                    formContainer.innerHTML = `
                        <div class="alert alert-danger">
                            Error creating form: ${err.message}
                        </div>`;
                });

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
