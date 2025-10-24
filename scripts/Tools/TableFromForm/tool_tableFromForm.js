document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
document.getElementById('copySqlBtn').addEventListener('click', copySQL);
document.getElementById('statementType').addEventListener('change', generateSQL);
['textfield', 'textarea', 'select', 'number', 'datetime', 'checkbox'].forEach(type => {
    const checkbox = document.getElementById(type);
    if (checkbox) {
        checkbox.addEventListener('change', generateSQL);
    }
});

let formioData = null;

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const startTime = performance.now();
            const startDate = new Date();

            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timeZoneAbbr = moment.tz(timeZone).zoneAbbr();

            formioData = JSON.parse(e.target.result);
            document.getElementById('output-wrapper').style.display = 'block';

            // Generate SQL immediately after loading
            generateSQL();

            const endTime = performance.now();
            const duration = endTime - startTime;

            updateConversionInfo(startDate, timeZoneAbbr, duration);
        } catch (error) {
            handleError(error);
        }
    };
    reader.readAsText(file);
}

function generateSQL() {
    if (!formioData?.FormioTemplate) return;

    // Parse the FormioTemplate string to get components
    let template;
    try {
        template = typeof formioData.FormioTemplate === 'string' ?
            JSON.parse(formioData.FormioTemplate) : formioData.FormioTemplate;

        // Handle both old and new formats
        if (!template.components) {
            if (template.Grid) {
                template = {
                    display: 'form',
                    components: template.components || []
                };
            } else {
                throw new Error('Invalid FormioTemplate structure');
            }
        }

        console.log('Template structure:', template);

    } catch (error) {
        console.error('Error parsing FormioTemplate:', error);
        return;
    }

    const tableName = formioData.TableName || '[dbo].[DefaultTable]';
    const selectedTypes = getSelectedComponentTypes();
    const statementType = document.getElementById('statementType').value;
    const INDENT = '    ';

    // Helper function to add system columns
    function addSystemColumns(cols) {
        cols.push(
            `${INDENT}[__id] [int] IDENTITY(1,1) NOT NULL`,
            `${INDENT}[__ownerobjectguid] [uniqueidentifier] NOT NULL`,
            `${INDENT}[__forminstanceguid] [uniqueidentifier] NOT NULL`,
            `${INDENT}[__formgroupname] [varchar](255) NULL`,
            `${INDENT}[__formgroupfolder] [uniqueidentifier] NULL`,
            `${INDENT}[__instancename] [varchar](255) NULL`,
            `${INDENT}[__created] [datetime] NOT NULL`,
            `${INDENT}[__modified] [datetime] NOT NULL`,
            `${INDENT}[__locked] [bit] NULL`,
            `${INDENT}[__locklevel] [int] NULL`,
            `${INDENT}[__lockedtime] [datetime] NULL`,
            `${INDENT}[__referrer] [uniqueidentifier] NULL`,
            `${INDENT}[__formguid] [uniqueidentifier] NULL`,
            `${INDENT}[__lockedby] [uniqueidentifier] NULL`,
            `${INDENT}[__createdby] [uniqueidentifier] NULL`,
            `${INDENT}[__modifiedby] [uniqueidentifier] NULL`
        );
    }

    // Helper function to recursively process components
    function processComponents(components) {
        const columns = [];
        const processedKeys = new Set(); // Track processed component keys

        if (!Array.isArray(components)) {
            console.error('Components is not an array:', components);
            return columns;
        }

        components.forEach(component => {
            // Skip components inside formgrids and datagrids
            if (component.type === 'formgrid' || component.type === 'datagrid') {
                console.log(`Skipping ${component.type} components:`, component.key);
                return;
            }

            // Handle container types (panels, fieldsets, etc)
            if (component.components) {
                columns.push(...processComponents(component.components));
            } else if (selectedTypes.includes(component.type)) {
                // Skip if we've already processed this component key
                if (processedKeys.has(component.key)) {
                    console.warn(`Skipping duplicate component key: ${component.key}`);
                    return;
                }

                let sqlType;
                console.log(`Processing component: ${component.key} of type ${component.type}`); // Debug log

                switch (component.type) {
                    case 'textfield':
                        sqlType = `VARCHAR(${component.validate?.maxLength || 255})`;
                        break;
                    case 'textarea':
                        sqlType = 'VARCHAR(MAX)';
                        break;
                    case 'number':
                        sqlType = component.decimalLimit ?
                            `DECIMAL(18,${component.decimalLimit})` : 'INT';
                        break;
                    case 'datetime':
                        sqlType = 'DATETIME';
                        break;
                    case 'checkbox':
                        sqlType = 'BIT';
                        break;
                    case 'select':
                        sqlType = 'VARCHAR(100)';
                        break;
                    default:
                        console.warn('Unhandled component type:', component.type);
                        sqlType = 'VARCHAR(255)'; // Default type
                        break;
                }

                processedKeys.add(component.key);
                console.log(`Adding column: ${component.key} (${component.type}) as ${sqlType}`);

                if (statementType === 'create') {
                    columns.push(`${INDENT}[${component.key}] ${sqlType} NULL`);
                } else {
                    columns.push(`${INDENT}ADD [${component.key}] ${sqlType} NULL`);
                }
            }
        });

        return columns;
    }

    // Process all components recursively
    const columns = [];
    if (statementType === 'create') {
        addSystemColumns(columns);
    }
    columns.push(...processComponents(template.components));

    // Generate SQL statement
    let sql = '';
    if (columns.length > 0) {
        if (statementType === 'create') {
            sql = `CREATE TABLE ${tableName} (\n${columns.join(',\n')}\n);\nGO\n\n`;
        } else {
            sql = `ALTER TABLE ${tableName}\n${columns.join(',\n')};\nGO\n\n`;
        }
    }

    const outputDiv = document.getElementById('outputSQL');
    const sqlOutput = document.getElementById('sqlOutput');
    sqlOutput.innerHTML = `<code class="language-sql">${sql}</code>`;
    outputDiv.style.display = 'block';

    Prism.highlightAll();
}

function getSelectedComponentTypes() {
    const selectedTypes = ['textfield', 'textarea', 'select', 'number', 'datetime', 'checkbox']
        .filter(type => {
            const element = document.getElementById(type);
            const isChecked = element?.checked;
            console.log(`Component type ${type}: element exists? ${!!element}, checked? ${isChecked}`);
            return isChecked;
        });

    console.log('Selected component types:', selectedTypes);
    return selectedTypes;
}

async function copySQL() {
    try {
        const sql = document.getElementById('sqlOutput').textContent;
        await navigator.clipboard.writeText(sql);
        const btn = document.getElementById('copySqlBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('btn-success');
        setTimeout(() => {
            btn.textContent = 'Copy SQL';
            btn.classList.remove('btn-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function updateConversionInfo(startDate, timeZoneAbbr, duration) {
    const conversionInfo = document.getElementById('conversion-info');
    const timestamp = conversionInfo.querySelector('.conversion-timestamp');
    const durationEl = conversionInfo.querySelector('.conversion-duration');

    conversionInfo.className = 'alert alert-success mb-4';
    timestamp.textContent = `File loaded on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()} (${timeZoneAbbr})`;
    durationEl.textContent = `Load took ${duration.toFixed(2)}ms (${(duration/1000).toFixed(3)} seconds)`;
    conversionInfo.style.display = 'block';
}

function handleError(error) {
    const conversionInfo = document.getElementById('conversion-info');
    conversionInfo.className = 'alert alert-danger mb-4';

    const timestamp = conversionInfo.querySelector('.conversion-timestamp');
    const durationEl = conversionInfo.querySelector('.conversion-duration');

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZoneAbbr = moment.tz(timeZone).zoneAbbr();
    const currentDate = new Date();

    timestamp.textContent = `Error occurred on ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()} (${timeZoneAbbr})`;
    durationEl.textContent = `Error: ${error.message}`;
    conversionInfo.style.display = 'block';
}