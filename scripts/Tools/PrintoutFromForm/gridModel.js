import { childComponents, gridColumns } from './formSchema.js';
import { getComponentMapping } from './componentMappings.js';

// FormGrid is an application-specific variant of a Form.io DataGrid.
export function gridKind(component) {
    return component.type === 'formgrid' || component.IsFormGrid === true ? 'formgrid' : 'datagrid';
}

export function collectGrids(form) {
    const grids = [], keys = new Set();
    function visit(component) {
        if (!component || component.hidden) return;
        if (getComponentMapping(component.type)?.renderer === 'grid') {
            if (!gridColumns(component).length) return;
            if (!component.key) throw new Error('Printable grids require a component key.');
            if (keys.has(component.key)) throw new Error(`Duplicate printable grid key: ${component.key}`);
            keys.add(component.key);
            const buttons = [];
            function findButtons(node) {
                if (node.type === 'button' && node.key === 'btn_view' && node.Form_DBTable) buttons.push(node);
                childComponents(node).forEach(findButtons);
            }
            findButtons(component);
            grids.push({ ...component, type: gridKind(component),
                dialogFormTable: component.dialogFormTable || buttons[0]?.Form_DBTable || null });
            return; // Nested repeating records do not share this grid's row context.
        }
        if (getComponentMapping(component.type)?.renderer === 'subreport') return;
        childComponents(component).forEach(visit);
    }
    visit(form.FormioTemplate || form);
    return grids;
}

export function reportProcedureName(form, gridKey = null) {
    // Use the same name for SQL declarations, query schemas, and band bindings.
    const prefix = `cstm_${form.DepartmentName || 'FormIO'}_${form.FormName || 'Simple Report'}`;
    return gridKey === null ? `${prefix}_Printout` : `${prefix}_${gridKey}`;
}

export function quoteSqlIdentifier(value) {
    return `[${String(value).replace(/]/g, ']]')}]`;
}
