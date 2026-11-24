export class XMLValidator 
{
    // References identify objects, not positions. Sparse explicit IDs are valid.
    static validateRefNumbers(root) {
        const refs = new Set(), links = [], issues = [];
        function visit(node) {
            const attrs = node.attributes || {};
            if (attrs.Ref !== undefined) {
                const id = String(attrs.Ref);
                if (!/^\d+$/.test(id)) issues.push('Invalid Ref number: ' + id);
                else if (refs.has(id)) issues.push('Duplicate Ref number: ' + id);
                refs.add(id);
            }
            Object.values(attrs).forEach(value => {
                const match = /^#Ref-(\d+)$/.exec(String(value));
                if (match) links.push(match[1]);
            });
            (node.children || []).forEach(visit);
        }
        visit(root);
        links.forEach(id => { if (!refs.has(id)) issues.push('Missing Ref target: ' + id); });
        return { issues, nextRef: refs.size };
    }


    static validateSequentialItemNumbers(node, context = '') {
        const issues = [];
        const items = (node.children || []).filter(child => /^Item\d+$/.test(child.type));
        items.forEach((child, index) => {
            if (child.type !== 'Item' + (index + 1)) issues.push(context + node.type + ': expected Item' + (index + 1) + ', found ' + child.type);
        });
        (node.children || []).forEach(child => issues.push(...this.validateSequentialItemNumbers(child, context + node.type + ' > ')));
        return issues;
    }

    static validateContainerItems(node) {
        return this.validateSequentialItemNumbers(node);
    }

    static validateAll(root) {
        const sequentialIssues = this.validateSequentialItemNumbers(root);
        const refIssues = this.validateRefNumbers(root).issues;
        return { sequentialIssues, containerIssues: [], refIssues,
            hasIssues: sequentialIssues.length > 0 || refIssues.length > 0 };
    }

    static repairItemNumbers(node) {
        const changes = [];
        let index = 0;
        for (const child of node.children || []) {
            if (/^Item\d+$/.test(child.type)) {
                const newType = 'Item' + (++index);
                if (child.type !== newType) {
                    changes.push({ context: node.type, oldValue: child.type, newValue: newType,
                        itemType: child.attributes?.ControlType, itemName: child.attributes?.Name });
                    child.type = newType;
                }
            }
            changes.push(...this.repairItemNumbers(child));
        }
        return changes;
    }

    // Renumber collection entries in document order. Never rewrite object refs:
    // datasource and parameter bindings must continue to point to the same object.
    static validateAndRepair(rootNode) {
        const originalIssues = this.validateAll(rootNode);
        const changes = this.repairItemNumbers(rootNode);
        const remainingIssues = this.validateAll(rootNode);
        return { originalIssues, changes, remainingIssues,
            success: !remainingIssues.hasIssues };
    }
}
