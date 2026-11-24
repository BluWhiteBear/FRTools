import { collection, expressionIssue } from './reportModel.js';

// Inspect embedded schema metadata only. Never connect to a database or execute
// a stored procedure just because a report was opened in the viewer.
export function analyzeDataSources(model, Parser = globalThis.DOMParser) {
    const issues = [], sources = new Map();
    const add = (severity, code, message, node) => issues.push({ severity, code, message, nodeId: node.id, name: node.attrs.Name || node.type });
    for (const source of collection(model.root, 'ComponentStorage')) {
        if (!source.attrs.ObjectType?.includes('DataSource')) continue;
        if (!source.attrs.Base64) { add('info', 'SCHEMA_UNAVAILABLE', 'Datasource schema is unavailable; its query and fields cannot be checked locally.', source); continue; }
        try {
            const xml = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(source.attrs.Base64.replace(/\s/g, '')), char => char.charCodeAt(0)));
            if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD/entity declaration');
            const doc = new Parser().parseFromString(xml, 'application/xml');
            if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid XML');
            const views = new Map();
            for (const view of doc.getElementsByTagName('View')) {
                const fields = new Set();
                for (const field of view.getElementsByTagName('Field')) {
                    const name = field.getAttribute('Name');
                    if (fields.has(name)) add('warning', 'DUPLICATE_FIELD', `Datasource view ${view.getAttribute('Name')} defines ${name} more than once.`, source);
                    fields.add(name);
                }
                views.set(view.getAttribute('Name'), fields);
            }
            sources.set(source.attrs.Ref, views);
        } catch (error) { add('error', 'DATASOURCE_XML', `Embedded datasource XML could not be read: ${error.message}`, source); }
    }
    const parameters = new Set(collection(model.root, 'Parameters').map(parameter => parameter.attrs.Name));
    const calculated = new Set(collection(model.root, 'CalculatedFields').map(field => field.attrs.Name));
    function context(node) {
        let source, member;
        for (let current = node; current; current = current.parent) {
            if (member === undefined && current.attrs.DataMember !== undefined) member = current.attrs.DataMember;
            if (current.attrs.DataSource !== undefined) { source = current.attrs.DataSource; break; }
        }
        return { source: source?.replace(/^#Ref-/, ''), member };
    }
    function visit(node) {
        if (node.attrs.DataMember && node.attrs.DataSource) {
            const { source, member } = context(node);
            const views = sources.get(source);
            if (views?.size && !views.has(member)) add('error', 'DATA_MEMBER', `DataMember ${member} is absent from the embedded datasource schema.`, node);
        }
        for (const binding of collection(node, 'ExpressionBindings')) {
            const expression = binding.attrs.Expression;
            if (!expression || expressionIssue(expression)) continue;
            const text = expression.replace(/'(?:''|[^'])*'/g, "''");
            const { source, member } = context(node);
            const fields = sources.get(source)?.get(member);
            for (const match of text.matchAll(/\[([\w. -]+)\]/g)) {
                const name = match[1];
                if (fields && !fields.has(name) && !calculated.has(name) && !name.includes('.')) add('warning', 'UNKNOWN_FIELD', `Field ${name} is absent from the bound query schema.`, node);
            }
            for (const match of text.matchAll(/\?([A-Za-z_]\w*)/g)) if (!parameters.has(match[1])) add('warning', 'UNKNOWN_PARAMETER', `Parameter ${match[1]} is not defined.`, node);
        }
        node.children.forEach(visit);
    }
    visit(model.root);
    if (sources.size) add('info', 'DATASOURCE_RUNTIME', 'Embedded schemas were checked. Database connectivity, query results, joins and credentials have not been verified.', model.root);
    return issues;
}
