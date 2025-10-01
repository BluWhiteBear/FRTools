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
            // Root and structural elements
            'XtraReportsLayoutSerializer',
            'Extensions', 'Parameters', 'Bands',
            'TopMarginBand', 'PageHeaderBand', 'DetailBand', 'BottomMarginBand',
            'StylePriority', 'ExpressionBindings', 'GlyphOptions',
            
            // Item patterns (used in collections)
            'Item1', 'Item2', 'Item3', 'Item4',
            
            // DevExpress Controls
            'XRLabel', 'XRCheckBox', 'XRRichText',
            'XRTable', 'XRTableRow', 'XRTableCell',
            'XRPanel', 'XRSubreport', 'XRPictureBox',
            'Controls', 'Rows', 'Cells'
        ];
        return refTypes.includes(type);
    }
}

class XMLProcessor {
    constructor() {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    escapeText(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    escapeHtml(text) {
        if (!text) return '';
        // Only escape quotes and ampersands, preserve HTML tags
        return text
            .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')  // Escape & but not if it's part of an entity
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    reset() {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    requiresClosingTag(type) {
        // These elements must always have closing tags in DevExpress XML
        const requireClosing = [
            'XtraReportsLayoutSerializer',
            'Extensions',
            'Parameters',
            'Bands',
            'Controls',
            'Item1', 'Item2', 'Item3', 'Item4',
            'TopMarginBand',
            'PageHeaderBand',
            'DetailBand',
            'BottomMarginBand',
            'XRLabel',
            'XRPictureBox',
            'XRRichText',
            'XRTable',
            'XRTableRow',
            'XRTableCell'
        ];
        return requireClosing.includes(type);
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

    // Import validator
    async importValidator() {
        if (!this.validator) {
            const {validator} = await import('./validator.js');
            this.validator = validator;
        }
        return this.validator;
    }
    
    // Validates that all Ref attributes are correct and sequential
    async validateReferences(xml) {
        try {
            const validator = await this.importValidator();
            const results = validator.validateDevExpressXml(xml);
            
            // Convert validation results to the expected format
            const errors = results
                .filter(r => r.startsWith('ERROR'))
                .map(error => ({
                    message: error.replace('ERROR: ', ''),
                    element: error.includes('element') ? error.split('element')[1].trim() : undefined
                }));
            
            const totalRefs = results
                .find(r => r.startsWith('INFO: Found'))
                ?.match(/\d+/)?.[0] || 0;
            
            return {
                isValid: !results.some(r => r.startsWith('ERROR')),
                errors,
                totalRefs: parseInt(totalRefs),
                details: results
            };
        } catch (error) {
            console.error('Validation error:', error);
            return {
                isValid: false,
                errors: [{message: error.message}],
                totalRefs: 0,
                details: [`ERROR: ${error.message}`]
            };
        }
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
        if (!node || !node.type) {
            console.error('Invalid node:', node);
            return '';
        }

        const indentStr = '  '.repeat(indent);
        let xml = '';

        try {
            // Opening tag
            xml += `${indentStr}<${node.type}`;

            // Add attributes
            Object.entries(node.attributes || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    xml += ` ${key}="${this.escapeText(String(value))}"`;
                }
            });

            // Handle self-closing vs normal tags
            if (!this.requiresClosingTag(node.type) && (!node.children || node.children.length === 0)) {
                xml += ' />\n';
            } else {
                xml += '>\n';
                // Process children
                (node.children || []).forEach(child => {
                    const childXml = this.generateXML(child, indent + 1);
                    xml += childXml;
                });
                xml += `${indentStr}</${node.type}>\n`;
            }

            return xml;
        } catch (error) {
            console.error(`Error generating XML for node ${node.type}:`, error);
            throw error;
        }

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
