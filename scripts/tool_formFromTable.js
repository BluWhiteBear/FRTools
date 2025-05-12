document.getElementById('generateFormBtn').addEventListener('click', generateFormioJson);
document.getElementById('copyJsonBtn').addEventListener('click', copyJson);
document.getElementById('downloadJsonBtn').addEventListener('click', downloadJson);
document.getElementById('sqlInput').addEventListener('input', autoPopulateFromTableName);

let formioJson = null;

function generateFormioJson() {
    const sqlInput = document.getElementById('sqlInput').value;
    let formName = document.getElementById('formName').value;
    let departmentName = document.getElementById('departmentName').value;
    const departmentGuid = document.getElementById('departmentGuid').value || crypto.randomUUID();

    try {
        // Extract table name and columns from SQL
        const tableMatch = sqlInput.match(/(?:CREATE|ALTER)\s+TABLE\s+(\[dbo\]\.\[[^\]]+\]|\[[\w\s\.-]+\]|\w+\.\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : '';
        const cleanTableName = tableName.replace(/[\[\]]/g, '').replace('dbo.', '');
        
        // Try to extract department and form names from table name
        if (tableName && !formName && !departmentName) {
            const cleanTableName = tableName.replace(/[\[\]]/g, '').replace('dbo.', '');
            if (cleanTableName.startsWith('ct_')) {
                const parts = cleanTableName.split('_');
                if (parts.length >= 3) {
                    // Remove 'ct_' prefix and get department name
                    departmentName = parts[1];
                    // Get everything after department as form name
                    formName = parts.slice(2).join('_');
                    
                    // Update input fields
                    document.getElementById('formName').value = formName;
                    document.getElementById('departmentName').value = departmentName;
                }
            }
        }

        // Use provided values or defaults
        formName = formName || 'New Form';
        departmentName = departmentName || 'Default Department';
        
        // Extract column definitions
        const columnMatches = sqlInput.matchAll(/\[([^\]]+)\]\s+([^,\n]+)/g);
        const columns = Array.from(columnMatches, match => {
            // Table field blacklist
            if (match[1].includes(cleanTableName) || match[1].startsWith('__')) return null;
            
            return {
                name: match[1],
                type: match[2].trim().split(/\s+/)[0].toUpperCase()
            };
        }).filter(Boolean); // Remove null entries

        // Create Form.io components from columns
        const components = columns.map(column => {
            const component = {
                label: column.name,
                key: column.name,
                type: mapSqlTypeToFormio(column.type, column.name),
                input: true
            };
        
            // Add type-specific properties
            switch(component.type) {
                case 'textfield':
                    if (column.type.includes('VARCHAR')) {
                        const maxLength = column.type.match(/\((\d+)\)/);
                        if (maxLength) component.validate = { maxLength: parseInt(maxLength[1]) };
                    }
                    break;
                case 'textarea':
                    component.rows = 3;
                    component.autoExpand = true;
                    break;
                case 'number':
                    if (column.type.includes('DECIMAL')) {
                        const precision = column.type.match(/\((\d+),(\d+)\)/);
                        if (precision) component.decimalLimit = parseInt(precision[2]);
                    }
                    break;
            }
        
            return component;
        });

        // Create Form.io JSON structure
        formioJson = {
            FormViewId: Math.floor(Date.now() / 1000),
            Name: formName || 'New Form',
            FormName: formName || 'New Form',
            FormType: 2,
            DepartmentName: departmentName || 'Default Department',
            FormDefinitionGuid: crypto.randomUUID(),
            DeparmentGuid: departmentGuid,
            Html: "",
            Script: "",
            CSS: "",
            FormioTemplate: JSON.stringify({
                display: 'form',
                components: [{
                    type: 'panel',
                    title: 'Form Fields',
                    key: 'mainPanel',
                    components: components,
                    input: false,
                    tableView: false
                }],
                Grid: {}
            }),
            Source: 1,
            SourceName: "DirectToSQL",
            TableName: tableName,
            ExposedToUnicentric: false,
            ExposedToPortal: false,
            FormProps: "",
            CloseOnSave: false,
            Hidden: false,
            RelativePathFolderName: null,
            ClientSideScript: "",
            ServerSideScript: "",
            FormIOTemplateBackup: "",
            IsMinimizeTemplate: false,
            FormScripts: "",
            ScriptType: 1
        };

        // Display output
        const outputDiv = document.getElementById('output-wrapper');
        const jsonOutput = document.getElementById('jsonOutput');
        jsonOutput.innerHTML = `<code class="language-json">${JSON.stringify(formioJson, null, 2)}</code>`;
        outputDiv.style.display = 'block';

        // Enable and show preview
        //document.querySelector('#preview-tab').classList.remove('disabled');
        
        // Parse template and render preview
        const formioTemplate = JSON.parse(formioJson.FormioTemplate);
        //renderFormio(formioTemplate);

        Prism.highlightAll();

    } catch (error) {
        console.error('Error generating Form.io JSON:', error);
    }
}

function autoPopulateFromTableName(event) {
    const sqlInput = event.target.value;
    const tableMatch = sqlInput.match(/(?:CREATE|ALTER)\s+TABLE\s+(\[dbo\]\.\[[^\]]+\]|\[[\w\s\.-]+\]|\w+\.\w+)/i);
    
    if (tableMatch) {
        const tableName = tableMatch[1];
        const cleanTableName = tableName.replace(/[\[\]]/g, '').replace('dbo.', '');
        
        if (cleanTableName.startsWith('ct_')) {
            const parts = cleanTableName.split('_');
            if (parts.length >= 3) {
                // Remove 'ct_' prefix and get department name
                const departmentName = parts[1];
                // Get everything after department as form name
                const formName = parts.slice(2).join('_');
                
                // Update input fields
                document.getElementById('formName').value = formName;
                document.getElementById('departmentName').value = departmentName;
            }
        }
    }
}

function mapSqlTypeToFormio(sqlType) {
    sqlType = sqlType.toUpperCase();
    if (sqlType.includes('VARCHAR') || sqlType.includes('CHAR')) return 'textfield';
    if (sqlType.includes('TEXT')) return 'textarea';
    if (sqlType.includes('INT') || sqlType.includes('DECIMAL') || sqlType.includes('NUMERIC')) return 'number';
    if (sqlType.includes('DATE') || sqlType.includes('TIME')) return 'datetime';
    if (sqlType === 'BIT') return 'checkbox';
    return 'textfield';
}

async function copyJson() {
    try {
        await navigator.clipboard.writeText(JSON.stringify(formioJson, null, 2));
        const btn = document.getElementById('copyJsonBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('btn-success');
        setTimeout(() => {
            btn.textContent = 'Copy JSON';
            btn.classList.remove('btn-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function downloadJson() {
    if (!formioJson) return;

    const fileName = `${formioJson.DepartmentName}_${formioJson.FormName}-FORM.json`;
    const blob = new Blob([JSON.stringify(formioJson, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\s+/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function mapSqlTypeToFormio(sqlType, columnName) {
    sqlType = sqlType.toUpperCase();
    
    // Special handling for VARCHAR fields
    if (sqlType.includes('VARCHAR')) {
        // Check column naming convention
        if (columnName.toLowerCase().startsWith('txta')) {
            return 'textarea';
        }
        
        // Check for VARCHAR(MAX)
        if (sqlType.includes('(MAX)')) {
            return 'textarea';
        }
        
        return 'textfield';
    }
    
    // Rest of the type mappings
    if (sqlType.includes('TEXT') || sqlType.includes('NTEXT')) return 'textarea';
    if (sqlType.includes('INT') || sqlType.includes('DECIMAL') || sqlType.includes('NUMERIC')) return 'number';
    if (sqlType.includes('DATE') || sqlType.includes('TIME')) return 'datetime';
    if (sqlType === 'BIT') return 'checkbox';
    return 'textfield';
}