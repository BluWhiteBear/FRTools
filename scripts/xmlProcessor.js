//#region Imports

import { XMLValidator } from './xmlValidator.js';

//#endregion

//#region Helpers

class XMLNode
{
    // ? Represents a node in the XML structure
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

    // ? Adds a child node to the current node
    addChild(child)
    {
        this.children.push(child);
    }

    // ? Marks whether this node needs a Ref attribute
    // ? Returns the node object
    setNeedsRef(needs)
    {
        this.needsRef = needs;

        return this;
    }

    // ? Determines if a node type needs a Ref attribute
    // ? Returns boolean - true if it needs a Ref, false otherwise
    static needsRef(type)
    {
        // ? List of Node types that require Ref attributes
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

//#endregion

//#region Main Processor

class XMLProcessor
{
    // ? Handles the processing of XML data
    constructor()
    {
        this.currentRef = 0;
        this.currentItemNum = 0;
        this.validateOnGenerate = true;     // ? Should we validate on generate
        this.hasBeenValidated = false;      // ? Track if we've already validated
    }

    // ? Escapes special XML characters in text content
    // ? Returns the escaped text as a string
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

    // ? Cleans HTML content for DevExpress markup compatibility
    // ? Whitelists allowed tags and transforms unsupported tags to supported equivalents
    cleanHtml(html) {
        if (!html) return '';

        // First unescape any already escaped HTML
        html = html.replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&apos;/g, "'");

        // Define tag mappings for replacements
        const headerSizes = {
            h1: '14',
            h2: '12',
            h3: '11',
            h4: '10',
            h5: '9',
            h6: '8'
        };

        // Allow list of tags that can pass through as-is
        const allowedTags = ['b', 'i', 'u', 's', 'r', 'br', 'href', 'strong', 'em'];
        
        // First pass: Convert style-based colors to DevExpress color tags
        html = html.replace(/<([^>]+)style=["'](?:[^"']*?;)*?\s*color:\s*([^;"']+)(?:;[^"']*)?["'][^>]*>/gi, (match, tag, color) => {
            return `<color=${color}>`;
        });

        // Remove any remaining style attributes
        html = html.replace(/\s+style=["'][^"']*["']/gi, '');

        // Convert common HTML equivalents
        html = html.replace(/<strong>/gi, '<b>')
                  .replace(/<\/strong>/gi, '</b>')
                  .replace(/<em>/gi, '<i>')
                  .replace(/<\/em>/gi, '</i>');

        // Second pass: Convert header tags to size tags
        html = html.replace(/<(h[1-6])>/gi, (match, tag) => {
            return `<size=${headerSizes[tag.toLowerCase()]}>`;
        });
        html = html.replace(/<\/(h[1-6])>/gi, '</size>');

        // Third pass: Remove all unallowed tags while preserving their content
        const tagPattern = /<\/?([^>\s]+)[^>]*>/g;
        html = html.replace(tagPattern, (match, tag) => {
            tag = tag.toLowerCase();
            if (allowedTags.includes(tag)) {
                return match;
            }
            // For closing tags of transformed elements (like </p> after a color transform)
            if (match.startsWith('</')) {
                if (tag === 'p' && html.includes('<color=')) {
                    return '</color>';
                }
                return '';
            }
            return '';
        });

        // Clean up any doubled spaces and trim
        html = html.replace(/\s+/g, ' ').trim();

        return html;
    }

    // ? Escapes special XML characters in attribute values (specifically for HTML display)
    // ? Returns the escaped text as a string
    escapeHtml(text)
    {
        if (!text) return '';

        return text
            .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // ? Resets the internal state for processing a new XML structure
    reset()
    {
        this.currentRef = 0;
        this.currentItemNum = 0;
    }

    // ? Determines if a node type requires a closing tag
    // ? Returns boolean - true if it requires a closing tag, false otherwise
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

    // ? Increments and returns the next item number
    // ? Returns the next item number as an integer
    getNextItemNum()
    {
        return ++this.currentItemNum;
    }

    // ? First pass: Build the XML structure
    // ? Returns the created XMLNode as an object
    buildNode(type, attributes = {}, children = [], selfClosing = false)
    {
        const node = new XMLNode(type, attributes, children, selfClosing);
        node.setNeedsRef(XMLNode.needsRef(type));

        return node;
    }

    // ? Second pass: Assign references sequentially
    assignReferences(node)
    {
        // ? Assign ref count if needed
        if (node.needsRef)
        {
            node.attributes.Ref = this.currentRef++;
        }

        // ? Recursively process all children elements
        node.children.forEach(child => this.assignReferences(child));
    }

    // ? Final pass: Convert to XML string with proper formatting
    // ? Returns the generated XML as a string
    generateXML(node, indent = 0, isRoot = true)
    {
        if (!node || !node.type)
        {
            console.error('Invalid node:', node);
            return '';
        }

        // ? Validate and repair before generating if enabled and only at the root level
        if (isRoot && this.validateOnGenerate && !this.hasBeenValidated) {
            const repairResult = XMLValidator.validateAndRepair(node);
            this.hasBeenValidated = true; // ? Mark as validated to prevent recursive validation
            
            // ? Log original issues if any were found
            if (repairResult.originalIssues.hasIssues) {
                // ? Log XML structure issues that were found and repaired
                if (repairResult.changes.length > 0) {
                    console.warn('Found XML structure issues!');
                    console.warn('Applied fixes:');
                    repairResult.changes.forEach(change =>
                        console.warn(`- In ${change.context}: Renamed ${change.oldValue} to ${change.newValue} (${change.itemType} "${change.itemName}")`)
                    );
                }
                
                // ? Log any remaining unfixed issues
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

        // ? Opening tag
        xml += `${indentStr}<${node.type}`;

        // ? Add attributes
        Object.entries(node.attributes ||
        {}).forEach(([key, value]) =>
        {
            if (value !== undefined && value !== null)
            {
                xml += ` ${key}="${this.escapeText(String(value))}"`;
            }
        });

        // ? Handle self-closing vs normal tags
        if (node.selfClosing || (!this.requiresClosingTag(node.type) && (!node.children || node.children.length === 0)))
        {
            xml += ' />\n';
        }
        else
        {
            if (node.children && node.children.length > 0) {
                xml += '>\n';
                // ? Process children
                node.children.forEach(child =>
                {
                    const childXml = this.generateXML(child, indent + 1, false); // ! Pass false for non-root nodes
                    xml += childXml;
                });
                xml += `${indentStr}</${node.type}>\n`;
            } else {
                xml += `></${node.type}>\n`;
            }
        }

        return xml;
    }

    // ? Creates an Item node with a sequential item number
    // ? Returns the created Item XMLNode as an object
    createItemNode(itemNum, controlType, attributes = {})
    {
        const actualItemNum = (itemNum === undefined || itemNum === null) ? this.getNextItemNum() : itemNum;

        return this.buildNode(`Item${actualItemNum}`,
        {
            ControlType: controlType,
            ...attributes
        }).setNeedsRef(true);
    }

    // ? Creates a StylePriority node
    // ? Returns the created StylePriority XMLNode as an object
    createStylePriorityNode(attributes = {})
    {
        return this.buildNode('StylePriority', attributes).setNeedsRef(true);
    }

    // ? Creates an ExpressionBindings node with given bindings
    // ? Returns the created ExpressionBindings XMLNode as an object
    createExpressionBindings(...bindings)
    {
        const container = this.buildNode('ExpressionBindings',
        {});

        // ? Reset item numbering for expression bindings
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

        // ? Restore item numbering
        this.currentItemNum = savedItemNum;

        return container;
    }
}

//#endregion

//#region Exports

export
{
    XMLNode,
    XMLProcessor
};

//#endregion