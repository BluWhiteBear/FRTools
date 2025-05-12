const StringPrintoutConverter = {
    // State management
    state: {
        formioData: null,
        outputString: '',
        indentLevel: 0,
    },

    // Reset state for new conversion
    resetState() {
        this.state = {
            formioData: null,
            outputString: '',
            indentLevel: 0,
        };
    },

    // Get indent string based on current level
    getIndent() {
        return '  '.repeat(this.state.indentLevel);
    },    // Main conversion function
    convertFormToString(formData) {
        this.resetState();
        
        try {
            // Parse the Form.io template if it's a string
            let formTemplate;
            if (typeof formData.FormioTemplate === 'string') {
                formTemplate = JSON.parse(formData.FormioTemplate);
            } else {
                formTemplate = formData.FormioTemplate;
            }

            this.state.formioData = formData;
            
            // Start with form name as header
            this.state.outputString = `'## ${formData.FormName || 'Form'}  \\n\\n' + \n`;
            
            // Process each component
            if (formTemplate.components && Array.isArray(formTemplate.components)) {
                this.processComponents(formTemplate.components);
            }
            
            // Remove trailing plus sign and newline if they exist
            if (this.state.outputString.endsWith(" + \n")) {
                this.state.outputString = this.state.outputString.slice(0, -4);
            }
            
            return this.state.outputString;
        } catch (error) {
            console.error('Error converting form to string:', error);
            return `// Error converting form to string:\n// ${error.message}`;
        }
    },

    // Process each component in the form
    processComponents(components) {
        if (!components || !Array.isArray(components)) return;

        components.forEach(component => {
            this.processComponent(component);
        });
    },

    // Process a single component
    processComponent(component) {
        // Skip components that are not valid, have no type, or have a hidden property set to true
        if (!component || !component.type || component.hidden)
        {
            console.warn(`Skipping invalid component: ${JSON.stringify(component)}`);
            return;
        }

        // Handle different component types
        switch (component.type) {
            case 'textfield':
            case 'textarea':
            case 'number':
            case 'email':
            case 'phoneNumber':
            case 'currency':
            case 'datetime':
            case 'date':
            case 'time':
                this.processBasicField(component);
                break;
                
            case 'select':
            case 'selectboxes':
            case 'radio':
                this.processSelectionField(component);
                break;
                
            case 'checkbox':
                this.processCheckboxField(component);
                break;
                  case 'panel':
                this.processPanelField(component);
                break;
                
            case 'columns':
                this.processColumnsField(component);
                break;
                
            case 'fieldset':
                this.processFieldsetField(component);
                break;
                
            case 'table':
                this.processTableField(component);
                break;
                
            case 'datagrid':
                this.processDataGridField(component);
                break;
                
            case 'htmlelement':
                this.processHTMLElement(component);
                break;
                
            case 'content':
                this.processContentField(component);
                break;
            
            case 'button':
                // Skip buttons in printout
                break;
                
            default:
                // For any other component types, add a generic handler
                this.processGenericField(component);
                break;
        }
    },// Process basic input fields (text, number, email, etc.)
    processBasicField(component) {
        const indent = this.getIndent();
        this.state.outputString += `${indent}'**${component.label || component.key}**  \\n' + \n`;
        this.state.outputString += `${indent}[${component.key}] + '  \\n\\n' + \n`;
    },// Process selection fields (select, radio, checkboxes)
    processSelectionField(component) {
        const indent = this.getIndent();
        this.state.outputString += `${indent}'**${component.label || component.key}**  \\n' + \n`;
        this.state.outputString += `${indent}[${component.key}] + '  \\n\\n' + \n`;
    },// Process checkbox field
    processCheckboxField(component) {
        const indent = this.getIndent();
        this.state.outputString += `${indent}'**${component.label || component.key}**: ' + \n`;
        this.state.outputString += `${indent}'[${component.key}] + '  \\n\\n' + \n`;
    },// Process panel container
    processPanelField(component) {
        const indent = this.getIndent();
        
        if (component.title) {
            this.state.outputString += `${indent}'### ${component.title}  \\n\\n' + \n`;
        }
        
        // Process child components
        if (component.components && Array.isArray(component.components)) {
            this.state.indentLevel++;
            this.processComponents(component.components);
            this.state.indentLevel--;
        }
        
        this.state.outputString += `${indent}'---  \\n\\n' + \n`;
    },// Process columns container
    processColumnsField(component) {
        const indent = this.getIndent();
        
        if (component.columns && Array.isArray(component.columns) && component.columns.length > 0) {
            // Start with a title if the component has a label
            // if (component.label) {
            //     this.state.outputString += `${indent}'**${component.label}**  \\n\\n' + \n`;
            // }
            
            // Collect all components from each column
            const columnComponents = [];
            let maxComponentCount = 0;
            
            component.columns.forEach((column, colIndex) => {
                // Extract the components that should be displayed in the output
                const components = [];
                
                if (column.components && Array.isArray(column.components)) {
                    column.components.forEach(comp => {
                        // Skip buttons and non-data components
                        if (comp.type === 'button') return;
                        
                        // Add to our components list
                        components.push({
                            key: comp.key,
                            label: comp.label || comp.key,
                            type: comp.type
                        });
                    });
                }
                
                columnComponents.push(components);
                maxComponentCount = Math.max(maxComponentCount, components.length);
            });

            // Create a table with the exact number of columns we need
            const colCount = component.columns.length;
            
            // Create header row with column titles
            this.state.outputString += `${indent}'| ' + \n`;
            component.columns.forEach((column, index) => {
                const columnTitle = column.title || `Column ${index + 1}`;
                if (index < colCount - 1) {
                    //this.state.outputString += `${indent}'**${columnTitle}** | ' + \n`;
                    this.state.outputString += `${indent}' | ' + \n`;
                } else {
                    //this.state.outputString += `${indent}'**${columnTitle}** ' + \n`;
                    this.state.outputString += `${indent}'' + \n`;
                }
            });
            this.state.outputString += `${indent}'|  \\n' + \n`;
            
            // Create separator row
            this.state.outputString += `${indent}'| ' + \n`;
            component.columns.forEach((column, index) => {
                if (index < colCount - 1) {
                    this.state.outputString += `${indent}'--- | ' + \n`;
                } else {
                    this.state.outputString += `${indent}'--- ' + \n`;
                }
            });
            this.state.outputString += `${indent}'|  \\n' + \n`;
            
            // Create interleaved rows for each component
            for (let i = 0; i < maxComponentCount; i++) {
                // First, create a row for the field labels
                this.state.outputString += `${indent}'| ' + \n`;
                
                component.columns.forEach((column, colIndex) => {
                    const comp = columnComponents[colIndex][i];
                    if (comp) {
                        if (colIndex < colCount - 1) {
                            this.state.outputString += `${indent}'**${comp.label}** | ' + \n`;
                        } else {
                            this.state.outputString += `${indent}'**${comp.label}** ' + \n`;
                        }
                    } else {
                        if (colIndex < colCount - 1) {
                            this.state.outputString += `${indent}' | ' + \n`;
                        } else {
                            this.state.outputString += `${indent}' ' + \n`;
                        }
                    }
                });
                
                this.state.outputString += `${indent}'|  \\n' + \n`;
                
                // Next, create a row for the field values
                this.state.outputString += `${indent}'| ' + \n`;
                
                component.columns.forEach((column, colIndex) => {
                    const comp = columnComponents[colIndex][i];
                    if (comp) {
                        if (comp.type === 'checkbox') {
                            if (colIndex < colCount - 1) {
                                this.state.outputString += `${indent}'[${comp.key}] | ' + \n`;
                            } else {
                                this.state.outputString += `${indent}'[${comp.key}] ' + \n`;
                            }
                        } else {
                            if (colIndex < colCount - 1) {
                                this.state.outputString += `${indent}'[${comp.key}] | ' + \n`;
                            } else {
                                this.state.outputString += `${indent}'[${comp.key}] ' + \n`;
                            }
                        }
                    } else {
                        if (colIndex < colCount - 1) {
                            this.state.outputString += `${indent}' | ' + \n`;
                        } else {
                            this.state.outputString += `${indent}' ' + \n`;
                        }
                    }
                });
                
                this.state.outputString += `${indent}'|  \\n' + \n`;
            }
            
            // Add spacing after the table
            this.state.outputString += `${indent}'  \\n\\n' + \n`;
        } else {
            // Fallback for empty columns component
            this.state.outputString += `${indent}'*Empty columns component*  \\n\\n' + \n`;
        }
    },// Process fieldset container
    processFieldsetField(component) {
        const indent = this.getIndent();
        
        if (component.legend) {
            this.state.outputString += `${indent}'### ${component.legend}  \\n\\n' + \n`;
        }
        
        // Process child components with indentation
        if (component.components && Array.isArray(component.components)) {
            this.state.outputString += `${indent}'' + \n`;
            this.state.indentLevel++;
            this.processComponents(component.components);
            this.state.indentLevel--;
            this.state.outputString += `${indent}'  \\n\\n' + \n`;
        }
    },// Process table layout
    processTableField(component) {
        const indent = this.getIndent();
        
        // Process table rows and cells
        if (component.rows && Array.isArray(component.rows)) {
            // Get the maximum column count
            let maxColumns = 0;
            component.rows.forEach(row => {
                if (row && Array.isArray(row) && row.length > maxColumns) {
                    maxColumns = row.length;
                }
            });
            
            if (maxColumns === 0) return;
            
            // Add a title for the table if available
            if (component.label) {
                this.state.outputString += `${indent}'**${component.label}**  \\n\\n' + \n`;
            }
            
            // Add header row with column names
            this.state.outputString += `${indent}'| ' + \n`;
            for (let i = 0; i < maxColumns; i++) {
                // Try to find column headers by examining the first row's cells for labels
                let headerText = `Column ${i+1}`;
                if (component.rows[0] && component.rows[0][i] && 
                    component.rows[0][i].components && 
                    component.rows[0][i].components[0] && 
                    component.rows[0][i].components[0].label) {
                    headerText = component.rows[0][i].components[0].label;
                }
                this.state.outputString += `${indent}'**${headerText}** | ' + \n`;
            }
            this.state.outputString += `${indent}'  \\n' + \n`;
            
            // Add header separator row
            this.state.outputString += `${indent}'| ' + \n`;
            for (let i = 0; i < maxColumns; i++) {
                this.state.outputString += `${indent}'--- | ' + \n`;
            }
            this.state.outputString += `${indent}'  \\n' + \n`;
            
            // Add data rows - skip first row if it's a header
            const dataRows = component.rows;
            
            dataRows.forEach((row, rowIndex) => {
                this.state.outputString += `${indent}'| ' + \n`;
                
                if (row && Array.isArray(row)) {
                    // Fill each cell in the row
                    for (let i = 0; i < maxColumns; i++) {
                        const cell = i < row.length ? row[i] : null;
                        
                        // Extract cell content
                        let cellContent = '';
                        
                        if (cell && cell.components && Array.isArray(cell.components)) {
                            // For cells with components, use the key or a placeholder
                            const comp = cell.components[0];
                            if (comp && comp.key) {
                                cellContent = `[${comp.key}]`;
                            } else {
                                cellContent = 'Cell data';
                            }
                        } else {
                            cellContent = 'Cell data';
                        }
                        
                        this.state.outputString += `${indent}'${cellContent} | ' + \n`;
                    }
                }
                
                this.state.outputString += `${indent}'  \\n' + \n`;
            });
        }
        
        this.state.outputString += `${indent}'  \\n\\n' + \n`;
    },// Process datagrid component
    processDataGridField(component) {
        const indent = this.getIndent();
        this.state.outputString += `${indent}'**${component.label || component.key}**  \\n\\n' + \n`;
        
        // Create Markdown table
        if (component.components && Array.isArray(component.components)) {
            // Store column keys and labels for later use
            const columns = component.components.map(comp => ({
                key: comp.key,
                label: comp.label || comp.key
            }));
            
            // Add table header row with column labels
            this.state.outputString += `${indent}'| ' + \n`;
            columns.forEach(col => {
                this.state.outputString += `${indent}'**${col.label}** | ' + \n`;
            });
            this.state.outputString += `${indent}'  \\n' + \n`;
            
            // Add header separator row
            this.state.outputString += `${indent}'| ' + \n`;
            columns.forEach(() => {
                this.state.outputString += `${indent}'--- | ' + \n`;
            });
            this.state.outputString += `${indent}'  \\n' + \n`;
            
            // Generate row template using array indexing for each column
            this.state.outputString += `${indent}'{{#each ' + [${component.key}] + '}}  \\n' + \n`;
            this.state.outputString += `${indent}'| ' + \n`;
            
            columns.forEach((col, index) => {
                // Build each column cell with proper field reference for the current row
                this.state.outputString += `${indent}'{{this.' + '${col.key}' + '}} | ' + \n`;
            });
            
            this.state.outputString += `${indent}'  \\n' + \n`;
            this.state.outputString += `${indent}'{{/each}}  \\n' + \n`;
            
            // Fallback message when no data exists
            this.state.outputString += `${indent}'{{^' + [${component.key}] + '}}  \\n' + \n`;
            this.state.outputString += `${indent}'| ' + \n`;
            
            columns.forEach(() => {
                this.state.outputString += `${indent}'*No data* | ' + \n`;
            });
            
            this.state.outputString += `${indent}'  \\n' + \n`;
            this.state.outputString += `${indent}'{{/' + [${component.key}] + '}}  \\n' + \n`;
        }
        
        this.state.outputString += `${indent}'  \\n\\n' + \n`;
    },// Process HTML element
    processHTMLElement(component) {
        const indent = this.getIndent();
        // We'll add a note that this is HTML content
        this.state.outputString += `${indent}'  \\n\\n' + \n`;
        
        // For HTML content, we'll convert some basic things and wrap the rest in backticks
        let content = component.content || '';
        
        // Simple HTML to Markdown conversions with two spaces for line breaks
        content = content
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<br\s*\/?>/gi, '  \\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1  \\n\\n')
            .replace(/<ul>(.*?)<\/ul>/gi, '$1')
            .replace(/<li>(.*?)<\/li>/gi, '* $1  \\n');
        
        // Escape single quotes for string compatibility
        content = content.replace(/'/g, "\\'");
        
        // Add the processed content
        this.state.outputString += `${indent}'${content}  \\n\\n' + \n`;
    },// Process content field
    processContentField(component) {
        const indent = this.getIndent();
        // We'll add a note that this is content
        this.state.outputString += `${indent}'*Content Field*  \\n\\n' + \n`;
        
        // For HTML content, we'll convert some basic things and wrap the rest in backticks
        let content = component.html || '';
        
        // Simple HTML to Markdown conversions with two spaces for line breaks
        content = content
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<br\s*\/?>/gi, '  \\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1  \\n\\n')
            .replace(/<ul>(.*?)<\/ul>/gi, '$1')
            .replace(/<li>(.*?)<\/li>/gi, '* $1  \\n');
        
        // Escape single quotes for string compatibility
        content = content.replace(/'/g, "\\'");
        
        // Add the processed content
        this.state.outputString += `${indent}'${content}  \\n\\n' + \n`;
    },// Generic handler for other component types
    processGenericField(component) {
        const indent = this.getIndent();
        this.state.outputString += `${indent}'**${component.label || component.key}**: ' + \n`;
        this.state.outputString += `${indent}[${component.key}] + '  \\n\\n' + \n`;
    }
};

// File handling functions
function handleFileUpload(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Parse the JSON file
            const formData = JSON.parse(e.target.result);
            
            // Convert to string printout
            processFormData(formData);
        } catch (error) {
            console.error("Error parsing JSON file:", error);
            alert("Error parsing the JSON file. Please make sure it's a valid Form.io JSON file.");
        }
    };
    
    reader.readAsText(file);
}

// Process form data and display results
function processFormData(formData) {
    try {
        // Track performance
        const startTime = performance.now();
        
        // Convert form to string printout
        const stringOutput = StringPrintoutConverter.convertFormToString(formData);
        
        // Calculate conversion time
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        // Display the results
        displayResults(formData, stringOutput, duration);
        
        // Render form preview
        renderFormPreview(formData);
    } catch (error) {
        console.error("Error processing form data:", error);
        alert("Error processing the form data: " + error.message);
    }
}

// Convert string template to pure Markdown
function convertToMarkdown(stringTemplate) {
    // Remove string concatenation symbols and quotes
    let markdownContent = stringTemplate
        // Replace concatenation patterns like: ' + \n
        .replace(/'\s+\+\s+\n/g, '')
        // Remove starting and ending single quotes used as string delimiters
        .replace(/^'/gm, '')
        .replace(/'\s*$/gm, '')
        // Fix escaped characters
        .replace(/\\n/g, '\n')
        // Fix escaped single quotes to preserve them in the output
        .replace(/\\'/g, "'")
        // Handle field references - replace field references [fieldName] with sample data
        .replace(/\[(\w+)\]/g, function(match, fieldName) {
            return `Sample ${fieldName}`;
        })
        // Handle Handlebars template syntax for datagrids
        .replace(/\{\{#each\s+data\}\}/g, '')  // Remove {{#each data}} opening tags
        .replace(/\{\{\/data\}\}/g, '')        // Remove {{/data}} closing tags
        .replace(/\{\{\^data\}\}[\s\S]*?\{\{\/data\}\}/g, '')  // Remove empty data case
        .replace(/\{\{this\.(\w+)\}\}/g, 'Sample $1') // Replace {{this.fieldName}} with "Sample fieldName"        // Convert HTML line breaks to markdown line breaks in table cells
        .replace(/<br>/g, '  \n')
        // Fix table formatting issues
        .replace(/\|\s*\|/g, '| ∅ |')  // Replace empty cells with a placeholder
        .replace(/\|\s*\n\s*\|/g, '|\n|')
        // Fix incorrect table cell endings - ensure all rows end properly
        .replace(/\|(\s*)$/gm, '|$1');// Fix row breaks in tables
    
    // Add sample rows to tables for preview
    const tableRows = markdownContent.split('\n').map(line => line.trim());
    const enhancedLines = [];
    let inTable = false;
    let headerSeparatorFound = false;
    let tableColumns = 0;
    
    for (let i = 0; i < tableRows.length; i++) {
        const line = tableRows[i];
        enhancedLines.push(line);
        
        // Detect table header separator row
        if (line.match(/^\|(\s*---\s*\|)+$/)) {
            headerSeparatorFound = true;
            tableColumns = (line.match(/---/g) || []).length;
            
            // Count how many data rows we already have after the separator
            let existingDataRowCount = 0;
            let j = i + 1;
            while (j < tableRows.length && tableRows[j].startsWith('|') && !tableRows[j].match(/^\|(\s*---\s*\|)+$/)) {
                existingDataRowCount++;
                j++;
            }
            
            // If we don't have at least one sample data row, add one
            if (existingDataRowCount === 0) {
                let sampleRow = '|';
                for (let k = 0; k < tableColumns; k++) {
                    sampleRow += ` Sample data ${k+1} |`;
                }
                enhancedLines.push(sampleRow);
            }
            
            inTable = true;
        }
        
        // End of table detection
        if (inTable && !line.startsWith('|') && line.trim() !== '') {
            inTable = false;
            headerSeparatorFound = false;
        }    }
    
    const result = enhancedLines.join('\n');
    
    // Ensure all single quotes are removed from the final output
    return result.replace(/'/g, '');
}

// Display conversion results
function displayResults(formData, stringOutput, duration) {
    // Update conversion info
    document.querySelector('.conversion-timestamp').textContent = `Converted at: ${new Date().toLocaleString()}`;
    document.querySelector('.conversion-duration').textContent = `Conversion time: ${duration} seconds`;
    document.getElementById('conversion-info').style.display = 'block';
    
    // Update string output
    const outputElement = document.querySelector('#string-output code');
    outputElement.textContent = stringOutput;
    
    // Highlight code
    Prism.highlightElement(outputElement);
    
    // Convert to Markdown and update Markdown preview
    const markdownContent = convertToMarkdown(stringOutput);
    updateMarkdownPreview(markdownContent);
}

// Update the Markdown preview area
function updateMarkdownPreview(markdownContent) {
    const previewElement = document.getElementById('markdown-content');
    if (!previewElement) return;
    
    // Enhance the markdown content with sample data for tables
    const enhancedContent = enhanceMarkdownTables(markdownContent);
      // Instead of removing all single quotes, we'll ensure HTML is properly sanitized
    // Use a less aggressive approach that preserves single quotes in content
    // but prevents them from breaking HTML attributes
    const sanitizedContent = enhancedContent.replace(/'/g, '&apos;');
    
    // Parse and set the markdown content
    previewElement.innerHTML = marked.parse(sanitizedContent);
    
    // Highlight tables for better visibility
    highlightTables(previewElement);
}

// Enhance markdown tables with sample data rows and improve formatting
function enhanceMarkdownTables(markdown) {
    const lines = markdown.split('\n');
    const result = [];
    let inTable = false;
    let tableHeaders = [];
    let sampleRowAdded = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        result.push(line);
        
        // Detect table header row
        if (line.match(/^\|.*\|$/) && !inTable) {
            inTable = true;
            // Extract headers for later use
            tableHeaders = line.split('|')
                .filter(cell => cell.trim())
                .map(cell => cell.trim().replace(/\*\*/g, ''));
        }
        
        // Detect table separator row
        if (inTable && line.match(/^\|(\s*---+\s*\|)+$/)) {
            // Look ahead to see if we have data rows
            let hasDataRows = false;
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].match(/^\|.*\|$/)) {
                    hasDataRows = true;
                    break;
                } else if (lines[j].trim() && !lines[j].match(/^\|.*\|$/)) {
                    // We found non-table content, so we're out of the table
                    break;
                }
            }
            
            // If no data rows found, add sample rows
            if (!hasDataRows) {
                sampleRowAdded = true;
                // Add a couple of sample rows
                for (let k = 0; k < 2; k++) {
                    let sampleRow = '|';
                    tableHeaders.forEach((header, idx) => {
                        sampleRow += ` Sample ${header} ${k+1} |`;
                    });
                    result.push(sampleRow);
                }
            }
        }
        
        // Detect end of table
        if (inTable && !line.match(/^\|.*\|$/) && line.trim() !== '') {
            inTable = false;
            tableHeaders = [];
            sampleRowAdded = false;
        }
    }
      // Clean up markdown content - handle special cases for column layouts
    let joinedResult = result.join('\n');
    
    // Convert any remaining escaped single quotes back to regular single quotes
    joinedResult = joinedResult.replace(/\\'/g, "'");
    
    // Fix nested Sample data references that have been replaced multiple times
    joinedResult = joinedResult.replace(/Sample Sample (\w+)/g, 'Sample $1');
    
    // Add extra line break after tables for better spacing
    joinedResult = joinedResult.replace(/\|\n([^|\n])/g, '|\n\n$1');
    
    // Ensure line breaks work properly within table cells
    joinedResult = joinedResult.replace(/\|([^|]*?)\s{2}\n([^|]*?)\|/g, '|$1<br>$2|');
      // Fix column layouts by ensuring proper table formatting
    joinedResult = joinedResult.replace(/\| *\n/g, '|\n')
                              .replace(/\|([^\|]*?)\|([^\n]*?)$/gm, '|$1|$2');
    
    // Ensure all escaped single quotes are properly converted after table formatting
    joinedResult = joinedResult.replace(/\\'/g, "'");

    // Strips out all single quotes from the string
    joinedResult = joinedResult.replace(/'/g, '');
    
    return joinedResult;
}

// Add visual styling to tables in the preview
function highlightTables(element) {
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
        table.classList.add('table', 'table-striped', 'table-hover', 'table-sm');
        table.style.width = '100%';
        table.style.marginBottom = '1.5rem';
        table.style.tableLayout = 'fixed'; // Equal column widths
        
        // Style header row
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            headerRow.style.backgroundColor = '#f8f9fa';
            headerRow.style.fontWeight = 'bold';
            
            // Style header cells
            const headerCells = headerRow.querySelectorAll('th');
            headerCells.forEach(cell => {
                cell.style.verticalAlign = 'top';
                cell.style.borderBottom = '2px solid #dee2e6';
            });
        }
        
        // Style data cells
        const dataCells = table.querySelectorAll('tbody td');
        dataCells.forEach(cell => {
            cell.style.verticalAlign = 'top';
            cell.style.wordBreak = 'break-word';
        });
    });
}

// Render Form.io preview
function renderFormPreview(formData) {
    const container = document.getElementById('formio-rendered');
    container.innerHTML = '';
    
    try {
        // Parse the Form.io template
        let formTemplate;
        if (typeof formData.FormioTemplate === 'string') {
            formTemplate = JSON.parse(formData.FormioTemplate);
        } else {
            formTemplate = formData.FormioTemplate;
        }
        
        // Render the form
        if (window.Formio) {
            window.Formio.createForm(container, formTemplate).then(form => {
                // Form created successfully
                console.log('Form.io preview rendered successfully');
            }).catch(err => {
                console.error('Error rendering Form.io preview:', err);
                container.innerHTML = '<div class="alert alert-danger">Error rendering form preview</div>';
            });
        } else {
            console.error('Form.io library not loaded');
            container.innerHTML = '<div class="alert alert-danger">Form.io library not loaded</div>';
        }
    } catch (error) {
        console.error('Error rendering form preview:', error);
        container.innerHTML = '<div class="alert alert-danger">Error parsing Form.io template</div>';
    }
}

// Copy string to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Error copying to clipboard:', err);
        alert('Failed to copy to clipboard');
    });
}

// Download string as a file
function downloadString(text, filename) {
    const blob = new Blob([text], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // File upload handler
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', function(e) {
            if (this.files.length > 0) {
                handleFileUpload(this.files[0]);
            }
        });
    }
    
    // Copy button handler
    const copyStringBtn = document.getElementById('copyStringBtn');
    if (copyStringBtn) {
        copyStringBtn.addEventListener('click', function() {
            const stringOutput = document.querySelector('#string-output code').textContent;
            copyToClipboard(stringOutput);
        });
    }
    
    // Download button handler
    const downloadStringBtn = document.getElementById('downloadStringBtn');
    if (downloadStringBtn) {
        downloadStringBtn.addEventListener('click', function() {
            const stringOutput = document.querySelector('#string-output code').textContent;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadString(stringOutput, `formio-string-printout-${timestamp}.js`);
        });
    }
      // Markdown copy button handler
    const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
    if (copyMarkdownBtn) {
        copyMarkdownBtn.addEventListener('click', function() {
            // First convert to markdown
            let markdownOutput = convertToMarkdown(document.querySelector('#string-output code').textContent);
            // Then ensure all single quotes are removed
            markdownOutput = markdownOutput.replace(/'/g, '');
            copyToClipboard(markdownOutput);
        });
    }
    
    // Markdown download button handler
    const downloadMarkdownBtn = document.getElementById('downloadMarkdownBtn');
    if (downloadMarkdownBtn) {
        downloadMarkdownBtn.addEventListener('click', function() {
            const markdownOutput = convertToMarkdown(document.querySelector('#string-output code').textContent);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadString(markdownOutput, `formio-markdown-${timestamp}.md`);
        });
    }
    
    // Initialize Markdown renderer settings
    marked.setOptions({
        breaks: true,
        gfm: true
    });
});