import { getComponentMapping } from './componentMappings.js';
import { childComponents } from './formSchema.js';

export const ComponentCleaner = {
    cleanComponent(comp) {
        if (!comp) return comp;
        const cleaned = { ...comp };
        for (const property of ['conditional', 'customConditional', 'serverScript', 'clientScript']) delete cleaned[property];
        if (comp.components) cleaned.components = comp.components.map(child => this.cleanComponent(child));
        if (Array.isArray(comp.columns)) cleaned.columns = comp.columns.map(column => this.cleanComponent(column));
        if (Array.isArray(comp.rows)) cleaned.rows = comp.rows.map(row => row.map(cell => this.cleanComponent(cell)));
        return cleaned;
    },

    // Repeating data needs its own report band. Flatten only affected layout
    // wrappers; leave unrelated panels, columns, tables, and tabs intact.
    hoistGridsAndSubforms(formJson, warnings = []) {
        const isRepeating = type => ['grid', 'subreport'].includes(getComponentMapping(type)?.renderer);
        const isLayout = type => !!getComponentMapping(type)?.layout || type === 'container';
        function containsRepeating(component) {
            if (component.hidden) return false;
            return isRepeating(component.type) || childComponents(component).some(containsRepeating);
        }
        function flatten(components) {
            return components.flatMap(component => {
                if (component.hidden || !isLayout(component.type) || !childComponents(component).some(containsRepeating)) {
                    return [component];
                }
                warnings.push({ type: 'flattened_layout', message: 'A repeating grid or subform was moved out of its parent layout.',
                    component: { type: component.type, key: component.key || '[unnamed]', label: component.title || component.label || '[unnamed]' } });
                const children = flatten(childComponents(component));
                if (getComponentMapping(component.type)?.renderer !== 'container') return children;
                // A panel cannot contain a report band. Split its ordinary content
                // around repeating sections instead of discarding the panel entirely.
                const sections = [];
                let pending = [], part = 0;
                function flush(force = false) {
                    if (!pending.length && !force) return;
                    sections.push({ ...component, key: `${component.key || 'section'}__part${++part}`,
                        hideLabel: part > 1 || component.hideLabel, components: pending });
                    pending = [];
                }
                for (const child of children) {
                    if (isRepeating(child.type)) {
                        const headingOnly = part === 0 && !component.hideLabel &&
                            !!(component.title || component.legend || component.label);
                        flush(headingOnly);
                        sections.push(child);
                    }
                    else pending.push(child);
                }
                flush();
                return sections;
            });
        }
        formJson.components = flatten(formJson.components);
        return formJson;
    }
};
