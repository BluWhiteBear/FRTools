import
{
    DevExpressDefinitions,
    DevExpressHelpers
}
from './devexpress-definitions.js';

export class ComponentProcessor
{
    constructor(xmlProcessor)
    {
        this.xmlProcessor = xmlProcessor;
        this.currentY = 0;

        // Create measurement div for HTML content
        this.measureDiv = document.createElement('div');
        this.measureDiv.style.position = 'absolute';
        this.measureDiv.style.visibility = 'hidden';
        this.measureDiv.style.fontFamily = 'Times New Roman';
        this.measureDiv.style.fontSize = '9.75pt';
        document.body.appendChild(this.measureDiv);
    }

    isHidden(component)
    {
        // Check if component or any of its parents are hidden
        if (!component) return false;
        if (component.hidden === true) return true;
        return false;
    }

    calculateHtmlHeight(content, width)
    {
        // Set width and reset height
        this.measureDiv.style.width = `${width}px`;
        this.measureDiv.style.height = 'auto';

        // Set content and calculate height
        this.measureDiv.innerHTML = content;
        const height = Math.ceil(this.measureDiv.offsetHeight);

        // Clear content
        this.measureDiv.innerHTML = '';

        // Return height with some padding for safety
        return Math.max(25, height + 10);
    }

    // Main entry point for processing components
    processComponents(components, containerWidth = 650, xOffset = 0)
    {
        if (!components || components.length === 0) return [];

        const processedNodes = [];

        components.forEach(component =>
        {
            // Skip hidden components
            if (this.isHidden(component))
            {
                // Skip this component but increment item counter to maintain sequence
                this.xmlProcessor.currentItemNum++;
                return;
            }

            const nodes = this.processComponent(component, containerWidth, xOffset);
            processedNodes.push(...nodes);
        });

        return processedNodes;
    }

    processComponent(component, containerWidth, xOffset)
    {
        // Pass component info to getComponentDef through the window object
        window.currentComponent = component;
        const def = DevExpressHelpers.getComponentDef(component.type);
        window.currentComponent = null;
        const nodes = [];

        switch (component.type)
        {
            case 'nestedsubform':
                // Save current item number state
                const savedItemNum = this.xmlProcessor.currentItemNum;

                // Handle nested subform
                if (def.requiresLabel)
                {
                    nodes.push(this.createLabelNode(component, containerWidth, xOffset));
                    this.currentY += 25; // Label height
                }

                // Process the subreport itself
                nodes.push(this.createSubReportNode(component, containerWidth, xOffset));
                this.currentY += def.defaultHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;

                // Restore item number state
                this.xmlProcessor.currentItemNum = savedItemNum + 1; // +1 for the subreport itself
                break;

            case 'panel':
            case 'fieldset':
            case 'well':
                nodes.push(...this.processContainer(component, containerWidth, xOffset));
                break;

            case 'columns':
                nodes.push(...this.processColumns(component, containerWidth, xOffset));
                break;

            case 'table':
                nodes.push(...this.processTable(component, containerWidth, xOffset));
                break;

            case 'tabs':
                nodes.push(...this.processTabs(component, containerWidth, xOffset));
                break;

            case 'datagrid':
                nodes.push(...this.processDataGrid(component, containerWidth, xOffset));
                break;

            case 'formgrid':
                nodes.push(...this.processFormGrid(component, containerWidth, xOffset));
                break;

            default:
                // Handle regular fields (label + value pair)
                if (def.requiresLabel)
                {
                    nodes.push(this.createLabelNode(component, containerWidth, xOffset));
                    this.currentY += 25; // Label height
                }

                // Calculate component height before creating node
                let componentHeight = def.defaultHeight;
                if (component.type === 'htmlelement' && component.content)
                {
                    componentHeight = this.calculateHtmlHeight(component.content, containerWidth);
                }
                else if (component.type === 'radio' && def.calculateHeight)
                {
                    componentHeight = def.calculateHeight(component);
                }

                nodes.push(this.createValueNode(component, containerWidth, xOffset));
                this.currentY += componentHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
        }

        return nodes;
    }

    processContainer(component, containerWidth, xOffset)
    {
        // Skip if container is hidden
        if (this.isHidden(component))
        {
            // Increment item counter but return empty array
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const containerDef = DevExpressHelpers.getContainerDef(component.type);
        const containerNode = this.xmlProcessor.createItemNode(undefined, containerDef.controlType,
        {
            Name: component.key || `${component.type}${Date.now()}`,
            ...containerDef.attributes,
            SizeF: `${containerWidth},${this.calculateContainerHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create Controls node for the container and add it to the container
        const controlsNode = this.xmlProcessor.buildNode('Controls',
        {});
        containerNode.addChild(controlsNode);

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // Reset Y position for nested components to be relative to container
        const originalY = this.currentY;
        this.currentY = 0;

        // If container has a label, add it first
        if (component.label)
        {
            const labelNode = this.createLabelNode(component, containerWidth - 10, xOffset + 5);
            controlsNode.addChild(labelNode);
            this.currentY += 25; // Label height
        }

        // Process nested components with adjusted width and offset
        const nestedWidth = containerWidth - 20; // Padding for nested components
        const nestedXOffset = 10; // Make X offset relative to container

        if (component.components)
        {
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

    processColumns(component, containerWidth, xOffset)
    {
        // Skip if columns component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const columnDef = DevExpressHelpers.getContainerDef('columns');

        // Filter out hidden columns and adjust width calculation
        const visibleColumns = component.columns.filter(col => !this.isHidden(col));
        const columnWidth = containerWidth / (visibleColumns.length || 1);

        // Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: component.key || `columns${Date.now()}`,
            ...columnDef.attributes,
            SizeF: `${containerWidth},${this.calculateColumnsHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`,
            KeepTogether: true
        });

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // Create Rows container (no attributes needed)
        const rowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        tableNode.addChild(rowsNode);

        // Reset item numbering for the row
        this.xmlProcessor.currentItemNum = 0;

        // Create row as Item1
        const rowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `columnsRow_${Date.now()}`
        });
        rowsNode.addChild(rowNode);

        // Create Cells container
        const cellsNode = this.xmlProcessor.buildNode('Cells',
        {});
        rowNode.addChild(cellsNode);

        // Reset item numbering for cells
        this.xmlProcessor.currentItemNum = 0;

        // Process only visible columns
        let visibleIndex = 0;
        component.columns.forEach((col, index) =>
        {
            // Skip hidden columns but maintain item numbering
            if (this.isHidden(col))
            {
                this.xmlProcessor.currentItemNum++;
                return;
            }

            // Create cell with explicit item number (Item1, Item2, etc.)
            const cellNode = this.xmlProcessor.createItemNode(visibleIndex + 1, 'XRTableCell',
            {
                Name: `column_${index + 1}`,
                Weight: (1 / visibleColumns.length).toString(), // Equal width distribution for visible columns
                ...columnDef.cellAttributes
            });
            visibleIndex++;

            // Process components within the column
            if (col.components)
            {
                const controlsNode = this.xmlProcessor.buildNode('Controls',
                {});
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

    createLabelNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef(component.type);
        // Use header style for main section headers, default style for field labels
        const labelStyle = DevExpressHelpers.getLabelStyle(component.isHeader ? 'header' : 'default');
        // Apply width multiplier if defined for the component
        const finalWidth = DevExpressHelpers.calculateComponentWidth(width, def);
        
        // Adjust height for header style
        const height = component.isHeader ? 35 : 25;

        return this.xmlProcessor.createItemNode(undefined, 'XRLabel',
        {
            Name: `label_${component.key || `field${Date.now()}`}`,
            Text: component.label || '',
            SizeF: `${finalWidth},${height}`,
            LocationFloat: `${xOffset},${this.currentY}`,
            ...labelStyle
        });
    }

    createValueNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef(component.type);
        let componentHeight = def.defaultHeight;

        // Apply width multiplier if defined
        const finalWidth = DevExpressHelpers.calculateComponentWidth(width, def);

        // For radio buttons, create a panel containing multiple checkboxes
        if (component.type === 'radio')
        {
            return this.createRadioButtonsNode(component, finalWidth, xOffset, def);
        }

        // For HTML elements, calculate height based on content
        if (component.type === 'htmlelement' && component.content)
        {
            componentHeight = this.calculateHtmlHeight(component.content, finalWidth);
        }

        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: component.key || `field${Date.now()}`,
            ...def.attributes,
            SizeF: `${finalWidth},${componentHeight}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // For components that use the label in the Text property (like checkboxes)
        if (def.useTextAsLabel && component.label)
        {
            node.attributes.Text = this.xmlProcessor.escapeText(component.label);
        }
        // For components that use content as Text (like HTML elements)
        else if (def.useContentAsText && component.content)
        {
            // Use special HTML escaping for HTML content to preserve tags
            node.attributes.Text = this.xmlProcessor.escapeHtml(component.content);
        }
        // For Form.io content components that use the html property
        else if (def.useHtmlAsText && component.html)
        {
            // Use special HTML escaping for HTML content to preserve tags
            node.attributes.Text = this.xmlProcessor.escapeHtml(component.html);
        }

        // Add expression binding for the component's value (skip for HTML and content elements)
        if (component.key && !def.useContentAsText && !def.useHtmlAsText)
        {
            const expressionBindings = this.xmlProcessor.createExpressionBindings(
            {
                eventName: 'BeforePrint',
                propertyName: def.controlType === 'XRCheckBox' ? 'CheckBoxState' : (def.controlType === 'XRPictureBox' ? 'ImageSource' : 'Text'),
                expression: def.expression ? def.expression(component.key) : `[${component.key}]`
            });
            node.addChild(expressionBindings);
        }

        return node;
    }

    calculateContainerHeight(container)
    {
        let height = 0;

        // Add label height if container has a label
        if (container.label)
        {
            height += 25; // Label height plus spacing
            height += DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
        }

        // Calculate height of visible components only
        if (container.components)
        {
            const containerWidth = 650 - 20; // Standard width minus padding
            height += container.components.reduce((total, comp, index) =>
            {
                // Skip hidden components in height calculation
                if (this.isHidden(comp))
                {
                    return total;
                }

                const def = DevExpressHelpers.getComponentDef(comp.type);
                let componentHeight = def.defaultHeight;

                // Calculate special component heights
                if (comp.type === 'htmlelement' && comp.content)
                {
                    componentHeight = this.calculateHtmlHeight(comp.content, containerWidth);
                }
                else if (comp.type === 'content' && comp.html)
                {
                    componentHeight = this.calculateHtmlHeight(comp.html, containerWidth);
                }
                else if (comp.type === 'panel' || comp.type === 'fieldset')
                {
                    // For nested panels, recursively calculate height
                    componentHeight = this.calculateContainerHeight(comp);
                }
                else if (comp.type === 'table' && comp.rows)
                {
                    componentHeight = this.calculateTableHeight(comp);
                }
                else if (comp.type === 'radio' && def.calculateHeight)
                {
                    componentHeight = def.calculateHeight(comp);
                }
                else if (comp.type === 'tabs' && comp.components)
                {
                    // For tabs, we need to account for each tab's contents plus spacing
                    componentHeight = comp.components.reduce((tabsHeight, tab) =>
                    {
                        // Calculate height of this tab (including its label if present)
                        const tabHeight = this.calculateContainerHeight(tab);
                        // Add spacing between tabs
                        return tabsHeight + tabHeight + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
                    }, 0);
                }

                // Add component height plus label height if needed
                return total + componentHeight + (def.requiresLabel ? 25 : 0) +
                    DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
            }, 0);
        }

        // Add padding at top and bottom of container
        return height + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }

    createSubReportNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef('nestedsubform');

        // Create the subreport node
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `subreport_${component.key || Date.now()}`,
            ...def.attributes,
            SizeF: `${width},${def.defaultHeight}`,
            LocationFloat: `${xOffset},${this.currentY}`,
        });

        // Add reference parameter binding for the form GUID
        const parameterBindings = this.xmlProcessor.buildNode('ParameterBindings',
        {}, [
            this.xmlProcessor.buildNode('Item1',
            {
                Name: 'FormDataGUID',
                Parameter: '#Ref-100' // Reference to the FormDataGUID parameter
            }),
            this.xmlProcessor.buildNode('Item2',
            {
                Name: 'ObjectGUID',
                Parameter: '#Ref-101' // Reference to the ObjectGUID parameter
            })
        ]);
        node.addChild(parameterBindings);

        // Add ReportSourceUrl parameter if provided in form.io definition
        if (component.formPath)
        {
            node.attributes.ReportSourceUrl = component.formPath;
        }

        return node;
    }

    createRadioButtonsNode(component, width, xOffset, def)
    {
        // Create container panel
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `radioPanel_${component.key || `field${Date.now()}`}`,
            ...def.attributes,
            SizeF: `${width},${def.calculateHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create Controls container
        const controlsNode = this.xmlProcessor.buildNode('Controls',
        {});
        node.addChild(controlsNode);

        // Save and reset item numbering for the buttons
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        // Create a checkbox for each radio option
        let optionY = 0;
        if (component.values && Array.isArray(component.values))
        {
            component.values.forEach((option, index) =>
            {
                const buttonNode = this.xmlProcessor.createItemNode(index + 1, def.child.controlType,
                {
                    Name: `radio_${component.key}_${index + 1}`,
                    ...def.child.attributes,
                    Text: this.xmlProcessor.escapeText(option.label),
                    SizeF: `${width},25`,
                    LocationFloat: `0,${optionY}`
                });

                // Add expression binding for the checkbox state
                const expressionBindings = this.xmlProcessor.createExpressionBindings(
                {
                    eventName: 'BeforePrint',
                    propertyName: 'CheckBoxState',
                    expression: def.child.expressionTransform(component.key, option.value)
                });
                buttonNode.addChild(expressionBindings);

                controlsNode.addChild(buttonNode);
                optionY += 25;
            });
        }

        // Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return node;
    }

    processDataGrid(component, containerWidth, xOffset)
    {
        // Skip if datagrid component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const def = DevExpressHelpers.getComponentDef(component.type);

        // First create the label if required
        if (def.requiresLabel)
        {
            nodes.push(this.createLabelNode(component, containerWidth, xOffset));
            this.currentY += 25; // Label height
        }

        // Get columns from either components array or columns property
        const columns = component.components || component.columns || [];

        // Filter out hidden columns and ensure they are valid
        const visibleColumns = columns.filter(col => col && !this.isHidden(col));

        // If no valid columns found, return early
        if (!visibleColumns.length)
        {
            console.warn(`No visible columns found in datagrid component ${component.key || 'unknown'}`);
            return nodes;
        }

        // Create header table
        const headerTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_headers` || `datagrid_headers_${Date.now()}`,
            ...def.headerTable.attributes,
            SizeF: `${containerWidth},25`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create header rows container
        const headerRowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        headerTableNode.addChild(headerRowsNode);

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        // Create header row
        const headerRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_headerRow` || `datagrid_headerRow_${Date.now()}`,
            ...def.headerTable.rowAttributes
        });
        headerRowsNode.addChild(headerRowNode);

        // Create header cells container
        const headerCellsNode = this.xmlProcessor.buildNode('Cells',
        {});
        headerRowNode.addChild(headerCellsNode);

        // Reset item numbering for header cells
        this.xmlProcessor.currentItemNum = 0;

        // Create header cells with column labels
        visibleColumns.forEach((col, index) =>
        {
            // Handle both direct properties and nested component properties
            const key = col.key || col.component?.key || `col_${index}`;
            const label = col.label || col.title || col.component?.label || key;

            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell',
            {
                Name: `header_${key}`,
                Text: label,
                Weight: (1 / visibleColumns.length).toString(),
                ...def.headerTable.cellAttributes
            });
            headerCellsNode.addChild(cellNode);
        });

        const headerTableItemNum = this.xmlProcessor.currentItemNum;
        nodes.push(headerTableNode);
        this.currentY += 25; // Just move down by the height of the header row

        // Increment the item number for the keys table to ensure uniqueness
        this.xmlProcessor.currentItemNum = headerTableItemNum + 1;

        // Create keys table
        const keysTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_keys` || `datagrid_keys_${Date.now()}`,
            ...def.keysTable.attributes,
            SizeF: `${containerWidth},25`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create keys rows container
        const keysRowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        keysTableNode.addChild(keysRowsNode);

        // Create keys row
        const keysRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_keysRow` || `datagrid_keysRow_${Date.now()}`,
            ...def.keysTable.rowAttributes
        });
        keysRowsNode.addChild(keysRowNode);

        // Create keys cells container
        const keysCellsNode = this.xmlProcessor.buildNode('Cells',
        {});
        keysRowNode.addChild(keysCellsNode);

        // Reset item numbering for key cells
        this.xmlProcessor.currentItemNum = 0;

        // Create key cells with field keys
        visibleColumns.forEach((col, index) =>
        {
            // Handle both direct properties and nested component properties
            const key = col.key || col.component?.key || `col_${index}`;

            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell',
            {
                Name: `key_${key}`,
                Weight: (1 / visibleColumns.length).toString(),
                ...def.keysTable.cellAttributes
            });

            // Add expression binding for the data field
            const expressionBindings = this.xmlProcessor.createExpressionBindings(
            {
                eventName: 'BeforePrint',
                propertyName: 'Text',
                expression: `[${key}]`
            });
            cellNode.addChild(expressionBindings);

            keysCellsNode.addChild(cellNode);
        });

        nodes.push(keysTableNode);
        this.currentY += 25 + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing; // Use section spacing after the entire datagrid

        // Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return nodes;
    }

    processTable(component, containerWidth, xOffset)
    {
        // Skip if table is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const tableDef = DevExpressHelpers.getContainerDef('table');

        // Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, tableDef.controlType,
        {
            Name: component.key || `table${Date.now()}`,
            ...tableDef.attributes,
            SizeF: `${containerWidth},${this.calculateTableHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // Create Rows container
        const rowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        tableNode.addChild(rowsNode);

        // Reset item numbering for rows
        this.xmlProcessor.currentItemNum = 0;

        // Process each row in the table
        component.rows.forEach((row, rowIndex) =>
        {
            // Create row node
            const rowNode = this.xmlProcessor.createItemNode(rowIndex + 1, 'XRTableRow',
            {
                Name: `tableRow_${rowIndex + 1}`,
                ...tableDef.rowAttributes
            });
            rowsNode.addChild(rowNode);

            // Create Cells container
            const cellsNode = this.xmlProcessor.buildNode('Cells',
            {});
            rowNode.addChild(cellsNode);

            // Reset item numbering for cells
            this.xmlProcessor.currentItemNum = 0;

            // Process each cell in the row
            row.forEach((cell, colIndex) =>
            {
                // Create cell node
                const cellNode = this.xmlProcessor.createItemNode(colIndex + 1, 'XRTableCell',
                {
                    Name: `cell_${rowIndex + 1}_${colIndex + 1}`,
                    ...tableDef.cellAttributes,
                    Weight: (1 / row.length).toString() // Equal width distribution
                });

                // Process components within the cell
                if (cell.components && cell.components.length > 0)
                {
                    const controlsNode = this.xmlProcessor.buildNode('Controls',
                    {});
                    cellNode.addChild(controlsNode);

                    // Reset item numbering for cell contents
                    this.xmlProcessor.currentItemNum = 0;

                    const savedY = this.currentY;
                    this.currentY = 0; // Reset Y for cell content

                    const cellWidth = (containerWidth / row.length) - 16;
                    const cellNodes = this.processComponents(cell.components, cellWidth, 8);
                    cellNodes.forEach(node => controlsNode.addChild(node));

                    this.currentY = savedY; // Restore Y position
                }

                cellsNode.addChild(cellNode);
            });
        });

        // Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        // Update vertical position
        this.currentY += this.calculateTableHeight(component) +
            DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

        nodes.push(tableNode);
        return nodes;
    }

    processTabs(component, containerWidth, xOffset)
    {
        // Skip if tabs container is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const tabsDef = DevExpressHelpers.getContainerDef('tabs');

        // Save and reset item numbering
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        // Process each tab as a separate panel
        component.components.forEach((tab, index) =>
        {
            // Create panel for this tab
            const panelNode = this.xmlProcessor.createItemNode(index + 1, tabsDef.controlType,
            {
                Name: `tab_${tab.key || index + 1}`,
                ...tabsDef.attributes,
                SizeF: `${containerWidth},${this.calculateContainerHeight(tab)}`,
                LocationFloat: `${xOffset},${this.currentY}`
            });

            // Create Controls node for the panel
            const controlsNode = this.xmlProcessor.buildNode('Controls',
            {});
            panelNode.addChild(controlsNode);

            // Save current Y position and item number
            const savedY = this.currentY;
            const savedPanelItemNum = this.xmlProcessor.currentItemNum;

            // Reset Y position for tab contents
            this.currentY = 0;
            this.xmlProcessor.currentItemNum = 0;

            // Add tab label if it exists
            if (tab.label)
            {
                const labelNode = this.createLabelNode(
                {
                    label: tab.label,
                    key: `${tab.key || `tab${index + 1}`}_label`
                }, containerWidth - 10, 5);
                controlsNode.addChild(labelNode);
                this.currentY += 25; // Label height
            }

            // Process components in this tab
            if (tab.components)
            {
                const tabNodes = this.processComponents(tab.components, containerWidth - 20, 10);
                tabNodes.forEach(node => controlsNode.addChild(node));
            }

            // Restore item numbering for the panel
            this.xmlProcessor.currentItemNum = savedPanelItemNum;

            // Update current Y position for next tab
            this.currentY = savedY + this.calculateContainerHeight(tab) +
                DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

            nodes.push(panelNode);
        });

        // Restore original item numbering
        this.xmlProcessor.currentItemNum = savedItemNum + component.components.length;

        return nodes;
    }

    calculateTableHeight(tableComponent)
    {
        // For tables, we need to calculate the maximum height needed for each row
        let totalHeight = 0;

        // Calculate each row's height
        tableComponent.rows.forEach(row =>
        {
            let rowHeight = 25; // Minimum row height

            // Find the maximum height needed by any cell in this row
            row.forEach(cell =>
            {
                if (!cell.components) return;

                let cellHeight = cell.components.reduce((total, comp) =>
                {
                    if (this.isHidden(comp)) return total;

                    const def = DevExpressHelpers.getComponentDef(comp.type);
                    let componentHeight = def.defaultHeight;

                    if (comp.type === 'htmlelement' && comp.content)
                    {
                        // Approximate cell width for HTML height calculation
                        componentHeight = this.calculateHtmlHeight(comp.content, 650 / row.length);
                    }

                    return total + componentHeight + (def.requiresLabel ? 25 : 0) +
                        DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }, 0);

                rowHeight = Math.max(rowHeight, cellHeight);
            });

            totalHeight += rowHeight;
        });

        // Add padding for top and bottom
        return totalHeight + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }

    calculateColumnsHeight(columnsComponent)
    {
        let maxHeight = 0;
        const visibleColumns = columnsComponent.columns.filter(col => !this.isHidden(col));
        const columnWidth = (650 - 16) / (visibleColumns.length || 1); // Standard width minus padding, divided by visible column count

        visibleColumns.forEach(col =>
        {
            let colHeight = 0;
            if (col.components)
            {
                colHeight = col.components.reduce((total, comp) =>
                {
                    // Skip hidden components in height calculation
                    if (this.isHidden(comp))
                    {
                        return total;
                    }

                    const def = DevExpressHelpers.getComponentDef(comp.type);
                    let componentHeight = def.defaultHeight;

                    // Calculate actual height for HTML elements
                    if (comp.type === 'htmlelement' && comp.content)
                    {
                        componentHeight = this.calculateHtmlHeight(comp.content, columnWidth - 16);
                    }

                    // Add component height plus label height if needed
                    return total + componentHeight + (def.requiresLabel ? 25 : 0) +
                        DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }, 0);
            }
            maxHeight = Math.max(maxHeight, colHeight);
        });

        // Add padding at top and bottom
        return maxHeight + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }

    processFormGrid(component, containerWidth, xOffset)
    {
        // Skip if formgrid component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const def = DevExpressHelpers.getComponentDef(component.type || 'formgrid');

        // First create the label if required
        if (def.requiresLabel)
        {
            nodes.push(this.createLabelNode(component, containerWidth, xOffset));
            this.currentY += 25; // Label height
        }

        // For formgrids, we get field information from the Form Fields property
        const fields = component.formFields || [];

        // If no fields found, return early
        if (!fields.length)
        {
            console.warn(`No fields found in formgrid component ${component.key || 'unknown'}`);
            return nodes;
        }

        // Create header table
        const headerTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_headers` || `formgrid_headers_${Date.now()}`,
            ...def.headerTable.attributes,
            SizeF: `${containerWidth},25`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create header rows container 
        const headerRowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        headerTableNode.addChild(headerRowsNode);

        // Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        // Create header row
        const headerRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_headerRow` || `formgrid_headerRow_${Date.now()}`,
            ...def.headerTable.rowAttributes
        });
        headerRowsNode.addChild(headerRowNode);

        // Create header cells container
        const headerCellsNode = this.xmlProcessor.buildNode('Cells',
        {});
        headerRowNode.addChild(headerCellsNode);

        // Reset item numbering for header cells
        this.xmlProcessor.currentItemNum = 0;

        // Filter out button fields first
        const validFields = fields.filter(field => field.type !== 'button');

        // Create header cells with field labels
        validFields.forEach((field, index) =>
        {
            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell',
            {
                Name: `header_${field.key}`,
                Text: field.label || field.key,
                Weight: (1 / validFields.length).toString(),
                ...def.headerTable.cellAttributes
            });
            headerCellsNode.addChild(cellNode);
        });

        const headerTableItemNum = this.xmlProcessor.currentItemNum;
        nodes.push(headerTableNode);
        this.currentY += 25; // Just move down by the height of the header row

        // Increment the item number for the data table to ensure uniqueness
        this.xmlProcessor.currentItemNum = headerTableItemNum + 1;

        // Create data table
        const dataTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_data` || `formgrid_data_${Date.now()}`,
            ...def.keysTable.attributes,
            SizeF: `${containerWidth},25`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // Create data rows container
        const dataRowsNode = this.xmlProcessor.buildNode('Rows',
        {});
        dataTableNode.addChild(dataRowsNode);

        // Create data row
        const dataRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_dataRow` || `formgrid_dataRow_${Date.now()}`,
            ...def.keysTable.rowAttributes
        });
        dataRowsNode.addChild(dataRowNode);

        // Create data cells container
        const dataCellsNode = this.xmlProcessor.buildNode('Cells',
        {});
        dataRowNode.addChild(dataCellsNode);

        // Reset item numbering for data cells
        this.xmlProcessor.currentItemNum = 0;

        // Create data cells with field values
        validFields.forEach((field, index) =>
        {
            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell',
            {
                Name: `data_${field.key}`,
                Weight: (1 / validFields.length).toString(),
                ...def.keysTable.cellAttributes
            });

            // Add expression binding for the data field
            const expressionBindings = this.xmlProcessor.createExpressionBindings(
            {
                eventName: 'BeforePrint',
                propertyName: 'Text',
                expression: `[${field.key}]`
            });
            cellNode.addChild(expressionBindings);

            dataCellsNode.addChild(cellNode);
        });

        nodes.push(dataTableNode);
        this.currentY += 25 + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

        // Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return nodes;
    }
}