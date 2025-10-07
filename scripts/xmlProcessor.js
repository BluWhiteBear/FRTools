class XMLNode
{
    constructor(type, attributes = {}, children = null, selfClosing = false)
    {
        this.type = type;
        this.attributes = {
            ...attributes
        };
        this.children = children ? [...children] : [];
        this.ref = null;
        this.needsRef = false;
        this.selfClosing = selfClosing;
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
            'Extensions', 'Parameters',
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
        this.hasBeenValidated = false; // Track if we've already validated
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
    buildNode(type, attributes = {}, children = [], selfClosing = false)
    {
        const node = new XMLNode(type, attributes, children, selfClosing);
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
    generateXML(node, indent = 0, isRoot = true)
    {
        if (!node || !node.type)
        {
            console.error('Invalid node:', node);
            return '';
        }

        // Validate and repair before generating if enabled and only at the root level
        if (isRoot && this.validateOnGenerate && !this.hasBeenValidated) {
            const repairResult = XMLValidator.validateAndRepair(node);
            this.hasBeenValidated = true; // Mark as validated to prevent recursive validation
            
            // Log original issues if any were found
            if (repairResult.originalIssues.hasIssues) {
                console.warn('Found XML structure issues:');
                
                // Log the original issues
                if (repairResult.originalIssues.sequentialIssues.length > 0) {
                    console.warn('Sequential numbering issues found:');
                    repairResult.originalIssues.sequentialIssues.forEach(issue => console.warn('- ' + issue));
                }
                if (repairResult.originalIssues.containerIssues.length > 0) {
                    console.warn('Container item numbering issues found:');
                    repairResult.originalIssues.containerIssues.forEach(issue => console.warn('- ' + issue));
                }
                
                // Log what was fixed
                if (repairResult.changes.length > 0) {
                    console.info('\nApplied fixes:');
                    repairResult.changes.forEach(change => 
                        console.info(`- In ${change.context}: Renamed ${change.oldValue} to ${change.newValue} (${change.itemType} "${change.itemName}")`)
                    );

                    if (repairResult.fixedIssues.sequential.length > 0) {
                        console.info('\nFixed sequential numbering issues:');
                        repairResult.fixedIssues.sequential.forEach(issue => console.info('- ' + issue));
                    }
                    if (repairResult.fixedIssues.container.length > 0) {
                        console.info('\nFixed container numbering issues:');
                        repairResult.fixedIssues.container.forEach(issue => console.info('- ' + issue));
                    }
                }
                
                // Log any remaining unfixed issues
                const hasUnfixedSequential = repairResult.remainingIssues.sequentialIssues.length > 0;
                const hasUnfixedContainer = repairResult.remainingIssues.containerIssues.length > 0;
                
                if (hasUnfixedSequential || hasUnfixedContainer) {
                    console.error('\nSome issues could not be fixed:');
                    if (hasUnfixedSequential) {
                        console.error('Remaining sequential numbering issues:');
                        repairResult.remainingIssues.sequentialIssues.forEach(issue => console.error('- ' + issue));
                    }
                    if (hasUnfixedContainer) {
                        console.error('Remaining container numbering issues:');
                        repairResult.remainingIssues.containerIssues.forEach(issue => console.error('- ' + issue));
                    }
                } else if (!repairResult.success) {
                    console.info('\nAll detected issues were fixed successfully.');
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
        if (node.selfClosing || (!this.requiresClosingTag(node.type) && (!node.children || node.children.length === 0)))
        {
            xml += ' />\n';
        }
        else
        {
            if (node.children && node.children.length > 0) {
                xml += '>\n';
                // Process children
                node.children.forEach(child =>
                {
                    const childXml = this.generateXML(child, indent + 1, false); // Pass false for non-root nodes
                    xml += childXml;
                });
                xml += `${indentStr}</${node.type}>\n`;
            } else {
                xml += `></${node.type}>\n`;
            }
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