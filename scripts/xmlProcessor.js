class XMLNode
{
    constructor(type, attributes = {}, children = [])
    {
        this.type = type;
        this.attributes = {
            ...attributes
        };
        this.children = [...children];
        this.ref = null;
        this.needsRef = false;
    }

    addChild(child)
    {
        this.children.push(child);
    }

    setNeedsRef(needs)
    {
        this.needsRef = needs;

        return this;
    }

    static needsRef(type)
    {
        // List of Node types that require Ref attributes
        const refTypes = [
            'XtraReportsLayoutSerializer',
            'Item1', 'Item2', 'Item3', 'Item4',
            'Extensions', 'Parameters', 'Bands',
            'TopMarginBand', 'PageHeaderBand', 'DetailBand', 'BottomMarginBand',
            'StylePriority', 'GlyphOptions'
        ];

        return refTypes.includes(type);
    }
}

import { XMLValidator } from './xmlValidator.js';

class XMLProcessor
{
    constructor()
    {
        this.currentRef = 0;
        this.currentItemNum = 0;
        this.validateOnGenerate = true; // Enable validation by default
    }

    escapeText(text)
    {
        if (!text) return '';

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    escapeHtml(text)
    {
        if (!text) return '';

        return text
            .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    reset()
    {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    requiresClosingTag(type)
    {
        // List of node types that require closing tags
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

    getNextItemNum()
    {
        return ++this.currentItemNum;
    }

    // First pass: Build the XML structure
    buildNode(type, attributes = {}, children = [])
    {
        const node = new XMLNode(type, attributes, children);
        node.setNeedsRef(XMLNode.needsRef(type));

        return node;
    }

    // Second pass: Assign references sequentially
    assignReferences(node)
    {
        // Assign ref count if needed
        if (node.needsRef)
        {
            node.attributes.Ref = this.currentRef++;
        }

        // Recursively process all children elements
        node.children.forEach(child => this.assignReferences(child));
    }

    // Final pass: Convert to XML string with proper formatting
    generateXML(node, indent = 0)
    {
        if (!node || !node.type)
        {
            console.error('Invalid node:', node);
            return '';
        }

        // Validate before generating if enabled
        if (this.validateOnGenerate) {
            const validationResult = XMLValidator.validateAll(node);
            if (validationResult.hasIssues) {
                console.warn('XML Validation Issues:');
                if (validationResult.sequentialIssues.length > 0) {
                    console.warn('Sequential numbering issues:');
                    validationResult.sequentialIssues.forEach(issue => console.warn('- ' + issue));
                }
                if (validationResult.containerIssues.length > 0) {
                    console.warn('Container item numbering issues:');
                    validationResult.containerIssues.forEach(issue => console.warn('- ' + issue));
                }
            }
        }

        const indentStr = '  '.repeat(indent);
        let xml = '';

        // Opening tag
        xml += `${indentStr}<${node.type}`;

        // Add attributes
        Object.entries(node.attributes ||
        {}).forEach(([key, value]) =>
        {
            if (value !== undefined && value !== null)
            {
                xml += ` ${key}="${this.escapeText(String(value))}"`;
            }
        });

        // Handle self-closing vs normal tags
        if (!this.requiresClosingTag(node.type) && (!node.children || node.children.length === 0))
        {
            xml += ' />\n';
        }
        else
        {
            xml += '>\n';
            // Process children
            if (node.children && node.children.length > 0)
            {
                node.children.forEach(child =>
                {
                    const childXml = this.generateXML(child, indent + 1);
                    xml += childXml;
                });
            }
            xml += `${indentStr}</${node.type}>\n`;
        }

        return xml;
    }

    createItemNode(itemNum, controlType, attributes = {})
    {
        const actualItemNum = (itemNum === undefined || itemNum === null) ? this.getNextItemNum() : itemNum;

        return this.buildNode(`Item${actualItemNum}`,
        {
            ControlType: controlType,
            ...attributes
        }).setNeedsRef(true);
    }

    createStylePriorityNode(attributes = {})
    {
        return this.buildNode('StylePriority', attributes).setNeedsRef(true);
    }

    createExpressionBindings(...bindings)
    {
        const container = this.buildNode('ExpressionBindings',
        {});

        // Reset item numbering for expression bindings
        const savedItemNum = this.currentItemNum;
        this.currentItemNum = 0;

        bindings.forEach(binding =>
        {
            const bindingNode = this.createItemNode(undefined, null,
            {
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

export
{
    XMLNode,
    XMLProcessor
};