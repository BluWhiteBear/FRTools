import { reportProcedureName } from './gridModel.js';
import { collectLeafInputFields } from './formSchema.js';

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

//#region ComponentStorage Helpers

// Base64 encoding/decoding utilities for UTF-8 strings
function utf8ToBase64(str)
{
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, b => String.fromCodePoint(b)).join('');
    return btoa(binString);
}

// Builds the XML string for a SQL datasource based on the provided name, stored procedure name, and fields.
function buildSqlDataSourceXml(dsName, procName, fields)
{
    let xml = `<SqlDataSource Name="${escapeXml(dsName)}">`;
    xml += `<Connection Name="UniData" ConnectionString="" />`;
    xml += `<Query Type="StoredProcQuery" Name="${escapeXml(procName)}">`;
    xml += `<Parameter Name="@FormDataGUID" Type="DevExpress.DataAccess.Expression">(System.Guid)(?FormDataGUID )</Parameter>`;
    xml += `<Parameter Name="@OwnerObjectGUID" Type="DevExpress.DataAccess.Expression">(System.Guid)(?ObjectGUID )</Parameter>`;
    xml += `<ProcName>${escapeXml(procName)}</ProcName>`;
    xml += `</Query>`;
    xml += `<ResultSchema>`;
    xml += `<DataSet Name="${escapeXml(dsName)}">`;
    xml += `<View Name="${escapeXml(procName)}">`;
    
    // System fields (always present)
    const systemFields = [
        { name: '__ID', type: 'Int32' },
        { name: '__OwnerObjectGuid', type: 'Guid' },
        { name: '__FormInstanceGUID', type: 'Guid' },
        { name: '__FormGUID', type: 'Guid' },
        { name: '__FormGroupName', type: 'String' },
        { name: '__FormGroupFolder', type: 'Guid' },
        { name: '__InstanceName', type: 'String' },
        { name: '__Created', type: 'DateTime' },
        { name: '__Modified', type: 'DateTime' },
        { name: '__Locked', type: 'Boolean' },
        { name: '__LockLevel', type: 'Int32' },
        { name: '__LockedBy', type: 'Guid' },
        { name: '__LockedTime', type: 'DateTime' },
        { name: '__Referrer', type: 'Guid' },
        { name: '__FormVersion', type: 'Int32' },
        { name: '__CreatedBy', type: 'Guid' },
        { name: '__ModifiedBy', type: 'Guid' }
    ];
    
    // Add system fields
    systemFields.forEach(field => {
        xml += `<Field Name="${escapeXml(field.name)}" Type="${field.type}" />`;
    });
    
    // System fields are already present in the result schema.
    const systemNames = new Set(systemFields.map(field => field.name));
    fields.filter(field => !systemNames.has(field.name)).forEach(field => {
        xml += `<Field Name="${escapeXml(field.name)}" Type="${field.type}" />`;
    });
    
    xml += `</View>`;
    xml += `</DataSet>`;
    xml += `</ResultSchema>`;
    xml += `<ConnectionOptions CloseConnection="true" />`;
    xml += `</SqlDataSource>`;
    
    return xml;
}

// Builds the ComponentStorage XML node with one main datasource (Item1) and additional datasources for each grid component found in the form.
export function buildComponentStorage(formioData, processor, grids = [])
{
    const deptName = formioData?.DepartmentName || 'Unknown';
    const formName = formioData?.FormName || 'Unknown';
    
    // Collect fields from main form (excluding grids)
    const mainFields = collectLeafInputFields(formioData?.FormioTemplate?.components || [], true);
    
    // Build main datasource (Item1)
    const mainProcName = reportProcedureName(formioData);
    const mainSqlXml = buildSqlDataSourceXml('sqlDataSource1', mainProcName, mainFields);
    const mainBase64 = utf8ToBase64(mainSqlXml);
    
    // Initialize items array with main datasource as Item1
    const items = [
        processor.createItemNode(1, undefined, {
            Ref: "0",
            ObjectType: "DevExpress.DataAccess.Sql.SqlDataSource,DevExpress.DataAccess.v23.2",
            Name: "sqlDataSource1",
            Base64: mainBase64
        })
    ];
    
    // Find and process grid components (DataGrid + FormGrid) for Item2+
    // Grids are defined under FormioTemplate in the uploaded payload.
    
    grids.forEach((grid, idx) => {
        const gridKey = grid.key || `grid${idx}`;
        const gridProcName = reportProcedureName(formioData, gridKey);
        
        // Add grid-specific extra system fields
        const gridExtraSystemFields = [
            { name: 'FormInstanceGUID', type: 'Guid' },
            { name: 'GridEntryUID', type: 'Guid' },
            { name: 'ParentEntryUID', type: 'Guid' },
            { name: 'RowGUID', type: 'Guid' },
            { name: 'Active', type: 'String' }
        ];
        
        // Add grid component fields
        const gridComponents = grid.components || [];
        const gridSpecificFields = collectLeafInputFields(gridComponents, true);
        
        const gridSqlXml = buildSqlDataSourceXmlForGrid('sqlDataSource' + (idx + 2), gridProcName, [], gridExtraSystemFields, gridSpecificFields);
        const gridBase64 = utf8ToBase64(gridSqlXml);
        
        items.push(processor.createItemNode(idx + 2, undefined, {
            Ref: `${idx + 325}`, // Ref values: Item2 has Ref="325", Item3 has Ref="?", etc.
            ObjectType: "DevExpress.DataAccess.Sql.SqlDataSource,DevExpress.DataAccess.v23.2",
            Name: `sqlDataSource${idx + 2}`,
            Base64: gridBase64
        }));
    });
    
    // Build the ComponentStorage node
    const componentStorage = processor.buildNode('ComponentStorage', {}, items);
    
    return componentStorage;
}

// Builds the inner SqlDataSource XML string for a grid datasource, including main form fields, grid-specific fields, and extra system fields for grids.
function buildSqlDataSourceXmlForGrid(dsName, procName, mainFields, gridSystemFields, gridFields) {
    const fields = new Map([...mainFields, ...gridSystemFields, ...gridFields].map(field => [field.name, field]));
    return buildSqlDataSourceXml(dsName, procName, [...fields.values()]);
}
