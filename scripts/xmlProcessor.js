// XML Node Structure
class XMLNode {
    constructor(type, attributes = {}, children = []) {
        this.type = type;
        this.attributes = { ...attributes };
        this.children = [...children];
        this.ref = null;
        this.needsRef = false;
    }

    addChild(child) {
        this.children.push(child);
    }

    setNeedsRef(needs) {
        this.needsRef = needs;
        return this;
    }

    // Helper method to determine if this node type typically needs a ref
    static needsRef(type) {
        // List of node types that typically need refs in DevExpress XML
        const refTypes = [
            'XtraReportsLayoutSerializer',
            'Item1', 'Item2', 'Item3', 'Item4',  // Common item patterns
            'Extensions', 'Parameters', 'Bands',
            'TopMarginBand', 'PageHeaderBand', 'DetailBand', 'BottomMarginBand',
            'StylePriority', 'ExpressionBindings', 'GlyphOptions'
        ];
        return refTypes.includes(type);
    }
}

class XMLProcessor {
    constructor() {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    reset() {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    getNextItemNum() {
        return ++this.currentItemNum;
    }

    // First pass: Build the XML structure
    buildNode(type, attributes = {}, children = []) {
        const node = new XMLNode(type, attributes, children);
        node.setNeedsRef(XMLNode.needsRef(type));
        return node;
    }

    // Second pass: Assign references sequentially
    assignReferences(node) {
        // Assign ref if needed
        if (node.needsRef) {
            node.attributes.Ref = this.currentRef++;
        }

        // Process all children recursively
        node.children.forEach(child => this.assignReferences(child));
    }

    // Final pass: Convert to XML string with proper formatting
    generateXML(node, indent = 0) {
        const indentStr = '  '.repeat(indent);
        let xml = '';

        // Debug logging for node generation
        console.log(`Generating XML for node: ${node.type}`, {
            attributes: node.attributes,
            childCount: node.children.length,
            ref: node.attributes.Ref
        });

        // Opening tag
        xml += `${indentStr}<${node.type}`;

        // Add attributes
        Object.entries(node.attributes).forEach(([key, value]) => {
            if (value !== undefined) {  // Only add defined attributes
                xml += ` ${key}="${value}"`;
            }
        });

        if (node.children.length === 0) {
            xml += ' />\n';
        } else {
            xml += '>\n';
            // Process children
            node.children.forEach(child => {
                xml += this.generateXML(child, indent + 1);
            });
            // Closing tag
            xml += `${indentStr}</${node.type}>\n`;
        }

        return xml;
    }

    // Helper method to create a complete item node (common in DevExpress XML)
    createItemNode(itemNum, controlType, attributes = {}) {
        // If itemNum is undefined or null (but not 0), get the next sequential number
        const actualItemNum = (itemNum === undefined || itemNum === null) ? this.getNextItemNum() : itemNum;
        return this.buildNode(`Item${actualItemNum}`, {
            ControlType: controlType,
            ...attributes
        }).setNeedsRef(true);
    }

    // Helper to create a style priority node
    createStylePriorityNode(attributes = {}) {
        return this.buildNode('StylePriority', attributes).setNeedsRef(true);
    }

    // Helper to create an expression bindings container
    createExpressionBindings(...bindings) {
        const container = this.buildNode('ExpressionBindings', {});
        
        // Reset item numbering for expression bindings
        const savedItemNum = this.currentItemNum;
        this.currentItemNum = 0;
        
        bindings.forEach(binding => {
            const bindingNode = this.createItemNode(undefined, null, {
                EventName: binding.eventName,
                PropertyName: binding.propertyName,
                Expression: binding.expression
            });
            container.addChild(bindingNode);
        });
        
        // Restore item numbering
        this.currentItemNum = savedItemNum;
        
        return container;
    }
}

export {
    XMLNode,
    XMLProcessor
};
