import { COMPONENT_MAPPINGS, getComponentMapping, isRepeatingComponent } from './componentMappings.js';

// Form.io stores children in components, columns, and table rows. Keep traversal
// in one place so layout fields are not omitted from the datasource schema.
export function childComponents(component) {
    return [
        ...(component.components || []),
        ...(Array.isArray(component.columns) ? component.columns : []).flatMap(column => column.components || []),
        ...(Array.isArray(component.rows) ? component.rows : []).flatMap(row => row.flatMap(cell => cell.components || []))
    ];
}

export const GRID_TYPES = new Set(Object.keys(COMPONENT_MAPPINGS).filter(isRepeatingComponent));

export function gridColumns(component) {
    const fields = [];
    function visit(column) {
        if (!column || column.hidden) return;
        const mapping = getComponentMapping(column.type);
        if (mapping?.layout) { childComponents(column).forEach(visit); return; }
        if (column.key && column.input !== false && mapping?.dataField !== false && mapping?.renderer !== 'skip' && !isRepeatingComponent(column.type)) fields.push(column);
    }
    (component.components || []).forEach(visit);
    return fields;
}

export function collectLeafInputFields(components, excludeGrids = true) {
    const fields = new Map();
    function visit(component) {
        if (!component || (excludeGrids && (GRID_TYPES.has(component.type) || component.IsFormGrid))) return;
        childComponents(component).forEach(visit);
        if (!component.key || component.input !== true || getComponentMapping(component.type)?.dataField === false) return;
        const type = getComponentMapping(component.type)?.dataType || 'String';
        if (!fields.has(component.key)) fields.set(component.key, { name: component.key, type });
    }
    (components || []).forEach(visit);
    return [...fields.values()];
}

// Accept both standard Form.io schemas and the existing application export.
// Work on a copy: repeated conversion must not change the uploaded form.
export function normalizeFormExport(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('Expected a Form.io form JSON object.');
    }
    const data = JSON.parse(JSON.stringify(input));
    let template = data.FormioTemplate ?? data;
    if (typeof template === 'string') {
        try { template = JSON.parse(template); }
        catch { throw new Error('FormioTemplate contains invalid JSON.'); }
    }
    if (!template || !Array.isArray(template.components)) {
        throw new Error('The form must contain a components array.');
    }
    function validate(components, path) {
        components.forEach((component, index) => {
            const location = `${path}[${index}]`;
            if (!component || typeof component !== 'object' || Array.isArray(component)) {
                throw new Error(`Invalid component at ${location}.`);
            }
            const childrenKeys = ['components'];
            if (component.type === 'columns') childrenKeys.push('columns');
            if (component.type === 'table') childrenKeys.push('rows');
            for (const key of childrenKeys) {
                if (component[key] !== undefined && !Array.isArray(component[key])) {
                    throw new Error(`${location}.${key} must be an array.`);
                }
            }
            if (Array.isArray(component.columns)) validate(component.columns, `${location}.columns`);
            if (Array.isArray(component.rows)) component.rows.forEach((row, rowIndex) => {
                if (!Array.isArray(row)) throw new Error(`${location}.rows[${rowIndex}] must be an array.`);
                validate(row, `${location}.rows[${rowIndex}]`);
            });
            if (component.components) validate(component.components, `${location}.components`);
        });
    }
    validate(template.components, 'components');
    function normalize(component) {
        if (COMPONENT_MAPPINGS[component.type]?.alias) component.type = COMPONENT_MAPPINGS[component.type].alias;
        childComponents(component).forEach(normalize);
    }
    template.components.forEach(normalize);
    return {
        ...data,
        FormName: data.FormName || template.title || template.name || data.Name || 'Simple Report',
        DepartmentName: data.DepartmentName || 'FormIO',
        DepartmentGuid: data.DepartmentGuid || data.DeparmentGuid,
        FormioTemplate: template
    };
}

export function getColumnWidths(columns, width) {
    const units = columns.map(column => {
        const value = Number(column.width);
        return Number.isFinite(value) && value > 0 ? value : 6;
    });
    const total = units.reduce((sum, value) => sum + value, 0);
    return units.map(value => width * value / total);
}
