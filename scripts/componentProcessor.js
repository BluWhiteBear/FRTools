import { DevExpressDefinitions, DevExpressHelpers } from './devexpress-definitions.js';

export class ComponentProcessor {
    constructor(xmlProcessor) {
        this.xmlProcessor = xmlProcessor;
        this.currentY = 0;
    }

    // Main entry point for processing components
    processComponents(components, containerWidth = 650, xOffset = 0) {
        if (!components || components.length === 0) return [];

        const processedNodes = [];
        
        components.forEach(component => {
            const nodes = this.processComponent(component, containerWidth, xOffset);
            processedNodes.push(...nodes);
        });

        return processedNodes;
    }

    processComponent(component, containerWidth, xOffset) {
        const def = DevExpressHelpers.getComponentDef(component.type);
        const nodes = [];

        switch(component.type) {
            case 'panel':
            case 'fieldset':
                nodes.push(...this.processContainer(component, containerWidth, xOffset));
                break;
            
            case 'columns':
                nodes.push(...this.processColumns(component, containerWidth, xOffset));
                break;
                
            default:
                // Handle regular fields (label + value pair)
                if (def.requiresLabel) {
                    nodes.push(this.createLabelNode(component, containerWidth, xOffset));
                    this.currentY += 25; // Label height
                }
                nodes.push(this.createValueNode(component, containerWidth, xOffset));
                this.currentY += def.defaultHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
        }

        return nodes;
    }

    processContainer(component, containerWidth, xOffset) {
        const nodes = [];
        const containerDef = DevExpressHelpers.getContainerDef(component.type);
        const containerNode = this.xmlProcessor.createItemNode(undefined, containerDef.controlType, {
            Name: component.key || `${component.type}${Date.now()}`,
            ...containerDef.attributes,
            SizeF: `${containerWidth},${this.calculateContainerHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create Controls node for the container and add it to the container
        const controlsNode = this.xmlProcessor.buildNode('Controls', {});
        containerNode.addChild(controlsNode);
        
        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // Reset Y position for nested components to be relative to container
        const originalY = this.currentY;
        this.currentY = 0;

        // If container has a label, add it first
        if (component.label) {
            const labelNode = this.createLabelNode(component, containerWidth - 10, xOffset + 5);
            controlsNode.addChild(labelNode);
            this.currentY += 25; // Label height
        }

        // Process nested components with adjusted width and offset
        const nestedWidth = containerWidth - 20; // Padding for nested components
        const nestedXOffset = 10; // Make X offset relative to container
        
        if (component.components) {
            // Reset item numbering for nested components
            this.xmlProcessor.currentItemNum = 0;
            const nestedNodes = this.processComponents(component.components, nestedWidth, nestedXOffset);
            nestedNodes.forEach(node => controlsNode.addChild(node));
        }

        // Restore original Y position and item number state
        this.currentY = originalY + this.calculateContainerHeight(component) + 
                       DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
        this.xmlProcessor.currentItemNum = savedItemNum;

        nodes.push(containerNode);
        return nodes;
    }

    processColumns(component, containerWidth, xOffset) {
        const nodes = [];
        const columnDef = DevExpressHelpers.getContainerDef('columns');
        
        // Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable', {
            Name: component.key || `columns${Date.now()}`,
            ...columnDef.attributes,
            SizeF: `${containerWidth},${this.calculateColumnsHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`,
            KeepTogether: true
        });

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // Create Rows container (no attributes needed)
        const rowsNode = this.xmlProcessor.buildNode('Rows', {});
        tableNode.addChild(rowsNode);
        
        // Reset item numbering for the row
        this.xmlProcessor.currentItemNum = 0;

        // Create row as Item1
        const rowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow', {
            Name: `columnsRow_${Date.now()}`
        });
        rowsNode.addChild(rowNode);

        // Create Cells container
        const cellsNode = this.xmlProcessor.buildNode('Cells', {});
        rowNode.addChild(cellsNode);

        // Reset item numbering for cells
        this.xmlProcessor.currentItemNum = 0;

        // Process each column
        const columnWidth = containerWidth / component.columns.length;
        component.columns.forEach((col, index) => {
            // Create cell with explicit item number (Item1, Item2, etc.)
            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell', {
                Name: `column_${index + 1}`,
                Weight: (1 / component.columns.length).toString(), // Equal width distribution
                ...columnDef.cellAttributes
            });

            // Process components within the column
            if (col.components) {
                const controlsNode = this.xmlProcessor.buildNode('Controls', {});
                cellNode.addChild(controlsNode);

                // Reset item numbering for cell contents
                this.xmlProcessor.currentItemNum = 0;
                
                const savedY = this.currentY;
                this.currentY = 0; // Reset Y for column content
                
                const columnNodes = this.processComponents(col.components, columnWidth - 16, 8);
                columnNodes.forEach(node => controlsNode.addChild(node));
                
                this.currentY = savedY; // Restore Y position
            }

            cellsNode.addChild(cellNode);
        });

        // Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        this.currentY += this.calculateColumnsHeight(component) + 
                        DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
        
        nodes.push(tableNode);
        return nodes;
    }

    createLabelNode(component, width, xOffset) {
        const labelStyle = DevExpressHelpers.getLabelStyle();
        return this.xmlProcessor.createItemNode(undefined, 'XRLabel', {
            Name: `label_${component.key || `field${Date.now()}`}`,
            Text: component.label || '',
            SizeF: `${width},25`,
            LocationFloat: `${xOffset},${this.currentY}`,
            ...labelStyle
        });
    }

    createValueNode(component, width, xOffset) {
        const def = DevExpressHelpers.getComponentDef(component.type);
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType, {
            Name: component.key || `field${Date.now()}`,
            ...def.attributes,
            SizeF: `${width},${def.defaultHeight}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // For components that use the label in the Text property (like checkboxes)
        if (def.useTextAsLabel && component.label) {
            node.attributes.Text = component.label;
        }

        // Add expression binding for the component's value
        if (component.key) {
            const expressionBindings = this.xmlProcessor.createExpressionBindings({
                eventName: 'BeforePrint',
                propertyName: def.controlType === 'XRCheckBox' ? 'CheckBoxState' : 'Text',
                expression: `[${component.key}]`
            });
            node.addChild(expressionBindings);
        }

        return node;
    }

    calculateContainerHeight(container) {
        let height = 0;
        if (container.label) {
            height += 25; // Label height
        }
        if (container.components) {
            height += container.components.reduce((total, comp) => {
                const def = DevExpressHelpers.getComponentDef(comp.type);
                return total + def.defaultHeight + (def.requiresLabel ? 25 : 0) + 
                       DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
            }, 0);
        }
        return height + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }

    calculateColumnsHeight(columnsComponent) {
        let maxHeight = 0;
        columnsComponent.columns.forEach(col => {
            let colHeight = 0;
            if (col.components) {
                colHeight = col.components.reduce((total, comp) => {
                    const def = DevExpressHelpers.getComponentDef(comp.type);
                    return total + def.defaultHeight + (def.requiresLabel ? 25 : 0) + 
                           DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }, 0);
            }
            maxHeight = Math.max(maxHeight, colHeight);
        });
        return maxHeight + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }
}
