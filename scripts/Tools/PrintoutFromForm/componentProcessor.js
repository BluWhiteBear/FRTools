//#region Imports

import { LAYOUT } from './layoutConfig.js';

import
{
    DevExpressDefinitions,
    DevExpressHelpers
}
from './devexpress-definitions.js';

//#endregion

export class ComponentProcessor
{
    constructor(xmlProcessor)
    {
        this.xmlProcessor = xmlProcessor;
        this.currentY = 0;

        // ? Create measurement div for HTML content
        this.measureDiv = document.createElement('div');
        this.measureDiv.style.position = 'absolute';
        this.measureDiv.style.visibility = 'hidden';
        this.measureDiv.style.fontFamily = LAYOUT.FONT_FIELDOUTPUT;
        this.measureDiv.style.fontSize = '9.75pt';
        document.body.appendChild(this.measureDiv);
    }

    // ? Check if a given component should be hidden
    isHidden(component)
    {
        // ! EARLY EXIT
        // ? Is component valid?
        if (!component) return false;

        // ? Check if component or any of its parents are hidden
        if (component.hidden === true) return true;

        return false;
    }

    // ? Calculate height needed for HTML content
    calculateHtmlHeight(content, width)
    {
        // ? Set width and reset height
        this.measureDiv.style.width = `${width}px`;
        this.measureDiv.style.height = 'auto';

        // ? Convert DevExpress markup tags to HTML for measurement
        let measureContent = content
            .replace(/<size=(\d+)>/g, (_, size) => `<span style="font-size:${size}pt">`)
            .replace(/<\/size>/g, '</span>')
            .replace(/<color=([^>]+)>/g, (_, color) => `<span style="color:${color}">`)
            .replace(/<\/color>/g, '</span>')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // ? Set content and calculate height
        this.measureDiv.innerHTML = measureContent;
        
        // ? Get the actual height including any margins
        const style = window.getComputedStyle(this.measureDiv);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        
        // ? Calculate height with actual margins
        const height = Math.ceil(this.measureDiv.offsetHeight + marginTop + marginBottom);

        // ? Clear content
        this.measureDiv.innerHTML = '';

        // ? Return height, minimum INPUT_HEIGHT for empty content
    // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
    return Math.max(window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35, height);
    }

    // ? Main entry point for processing components
    processComponents(components, containerWidth = (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT), xOffset = 0)
    {
        // ! EARLY EXIT
        // ? Check if components array is valid
        if (!components || components.length === 0) return [];

        const processedNodes = [];
        const gridMarkers = [];  // ? Store grid components for separate processing
        const startingItemNum = this.xmlProcessor.currentItemNum;

        components.forEach(component => {
            // ? Skip hidden components
            if (this.isHidden(component))
            {
                this.xmlProcessor.currentItemNum++;
                return;
            }

            const result = this.processComponent(component, containerWidth, xOffset);

            // ? If this is a grid marker, push to both arrays
            if (result && result.type === 'grid')
            {
                gridMarkers.push(result);
                processedNodes.push(result); // ? Interleave grid marker in output order
            } 
            else 
            {
                const nodesToAdd = Array.isArray(result) ? result : [result];
                processedNodes.push(...nodesToAdd.filter(node => node != null));

                if (nodesToAdd.length > 0)
                {
                    this.xmlProcessor.currentItemNum = Math.max(
                        this.xmlProcessor.currentItemNum,
                        startingItemNum + processedNodes.length
                    );
                }
            }
        });

        // ? Store grid markers in a property that can be accessed by the template generator
        this.gridComponents = gridMarkers;

        return processedNodes;
    }

    // ? Process individual component based on its type
    processComponent(component, containerWidth, xOffset)
    {
        // ? Pass component info to getComponentDef through the window object
        window.currentComponent = component;
        const def = DevExpressHelpers.getComponentDef(component.type);
        window.currentComponent = null;
        
        // ? We're handling grids differently, as they require special table structures
        if (component.type === 'datagrid' || component.type === 'formgrid')
        {
            const columns = component.components || [];
            const visibleColumns = columns.filter(col => col && !this.isHidden(col));

            // ? Extract Y-position from Form.io component if available
            let gridY = 0;
            if (component.hasOwnProperty('y'))
            {
                gridY = parseInt(component.y) || 0;
            } 
            else if (component.hasOwnProperty('LocationFloat'))
            {
                const loc = typeof component.LocationFloat === 'string' ? component.LocationFloat : '';

                if (loc.includes(','))
                {
                    const yPart = loc.split(',')[1];
                    gridY = parseInt(yPart) || 0;
                }
            }

            // ? Create the header table
            const headerTable = this.xmlProcessor.createItemNode(this.xmlProcessor.currentItemNum++, 'XRTable', {
                Name: `${component.key}_headers`,
                SizeF: `${containerWidth},${LAYOUT.LABEL_HEIGHT}`,
                LocationFloat: `${xOffset},${gridY}`,
                Borders: 'All',
                BackColor: 'Gainsboro'
            });

            // ? Create header rows container and row
            const headerRows = this.xmlProcessor.buildNode('Rows', {});
            const headerRow = this.xmlProcessor.createItemNode(1, 'XRTableRow', {
                Weight: '1'
            });

            // ? Create cells container
            const headerCells = this.xmlProcessor.buildNode('Cells', {});

            // ? Process each column to create header cells
            visibleColumns.forEach((column, index) => {
                //console.log('[DEBUG] Creating XRTableCell for field label. Font:', LAYOUT.FONT_FIELDLABEL);
                const cell = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell', {
                    Text: column.label || column.key || '',
                    Weight: '1',
                    Padding: '5,5,5,5,100',
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDLABEL
                });
                headerCells.addChild(cell);
            });

            // ? Build the header structure
            headerRow.addChild(headerCells);
            headerRows.addChild(headerRow);
            headerTable.addChild(headerRows);

            // ? Create the data table for key bindings
            const dataTable = this.xmlProcessor.createItemNode(this.xmlProcessor.currentItemNum++, 'XRTable', {
                Name: `${component.key}_data`,
                // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
                SizeF: `${containerWidth},${window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35}`,
                LocationFloat: `${xOffset},${gridY}`,
                Borders: 'All'
            });

            // ? Create data rows and cells
            const dataRows = this.xmlProcessor.buildNode('Rows', {});
            const dataRow = this.xmlProcessor.createItemNode(1, 'XRTableRow', {
                Weight: '1'
            });
            const dataCells = this.xmlProcessor.buildNode('Cells', {});

            // ? Process each column to create data cells with bindings
            visibleColumns.forEach((column, index) => {
                const cell = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell', {
                    Weight: '1',
                    Padding: '5,5,5,5,100',
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDOUTPUT
                });

                // ? Add data binding for each cell
                const binding = this.xmlProcessor.createExpressionBindings({
                    eventName: 'BeforePrint',
                    propertyName: 'Text',
                    expression: `[${column.key}]`
                });
                cell.addChild(binding);
                dataCells.addChild(cell);
            });

            // ? Build the data structure
            dataRow.addChild(dataCells);
            dataRows.addChild(dataRow);
            dataTable.addChild(dataRows);

            // ? Return the grid marker with both header and data content, and correct Y
            return {
                type: 'grid',
                gridType: component.type,
                key: component.key,
                component: component,
                headerContent: [headerTable],
                dataContent: [dataTable],
                width: containerWidth,
                xOffset: xOffset,
                y: gridY
            };
        }

        const nodes = [];
        
        switch (component.type)
        {
            case 'nestedsubform':
                // ? Save current item number state
                const savedItemNum = this.xmlProcessor.currentItemNum;

                // ? Handle nested subform
                if (def.requiresLabel)
                {
                    const result = this.createLabelNode(component, containerWidth, xOffset);
                    const labelNode = result.node !== undefined ? result.node : result;
                    nodes.push(labelNode);
                    this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
                }

                // ? Process the subreport itself
                nodes.push(this.createSubReportNode(component, containerWidth, xOffset));
                this.currentY += def.defaultHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;

                // ? Restore item number state
                this.xmlProcessor.currentItemNum = savedItemNum + 1; // ? +1 for the subreport itself
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
                // ? Handle regular fields (label + value pair)
                let componentX = xOffset;
                let componentWidth = containerWidth;
                let labelOffset = 0;

                if (def.requiresLabel && component.label && !component.hideLabel)
                {
                    if (component.labelPosition === 'bottom')
                    {
                        // ? For bottom labels, we'll create and position the label after the value component
                        componentX = xOffset;
                        componentWidth = containerWidth;
                    } 
                    else
                    {
                        // ? For all other positions, create label immediately
                        const result = this.createLabelNode(component, containerWidth, xOffset);
                        
                        if (result.node !== undefined)
                        {
                            // ? New format with positioning info
                            nodes.push(result.node);
                            componentX = result.componentX;
                            componentWidth = result.componentWidth;
                            
                            if (component.labelPosition === 'top')
                            {
                                this.currentY += LAYOUT.LABEL_HEIGHT;
                            }
                        } 
                        else
                        {
                            // ? Old format (direct node)
                            nodes.push(result);
                            this.currentY += LAYOUT.LABEL_HEIGHT;
                        }
                    }
                }

                // ? Calculate component height before creating node
                let componentHeight = def.defaultHeight;
                
                // ? Handle dynamic height components
                if ((component.type === 'htmlelement' && component.content) || (component.type === 'content' && component.html))
                {
                    const htmlContent = component.content || component.html;
                    const cleanedHtml = this.xmlProcessor.cleanHtml(htmlContent);
                    componentHeight = this.calculateHtmlHeight(cleanedHtml, containerWidth);
                }
                else if (component.type === 'radio' && def.calculateHeight)
                {
                    componentHeight = def.calculateHeight(component);
                }

                // ? Create the value component first
                const valueNode = this.createValueNode(component, componentWidth, componentX);
                nodes.push(valueNode);
                
                // ? Get value component height for positioning
                const valueHeight = parseFloat(valueNode.attributes.SizeF.split(',')[1]);

                if (def.requiresLabel && component.label && component.labelPosition === 'bottom')
                {
                    // ? For bottom labels, create the label after the value and position it below
                    const labelY = this.currentY + valueHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                    this.currentY = labelY; // ? Temporarily move currentY to where label should go
                    const result = this.createLabelNode(component, containerWidth, xOffset);

                    if (result.node !== undefined)
                    {
                        nodes.push(result.node);

                        // ? Get label height for final positioning
                        const labelHeight = parseFloat(result.node.attributes.SizeF.split(',')[1]);
                        this.currentY += labelHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                    }
                    else
                    {
                        this.currentY = this.currentY + valueHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                    }
                }
                else
                {
                    this.currentY += valueHeight + DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }
        }

        return nodes;
    }

    // ? Process container components like panels, fieldsets, wells
    processContainer(component, containerWidth, xOffset)
    {
        // ? Skip if container is hidden
        if (this.isHidden(component))
        {
            // ? Increment item counter but return empty array
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

        // ? Create Controls node for the container and add it to the container
        const controlsNode = this.xmlProcessor.buildNode('Controls', {});
        containerNode.addChild(controlsNode);

        // ? Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // ? Reset Y position for nested components to be relative to container
        const originalY = this.currentY;
        this.currentY = 0;

        // ? Reset item numbering for container contents (including label)
        this.xmlProcessor.currentItemNum = 0;

        // ? Container insets and styling
        const containerInsets = {
            top: 10,    // ? Top padding
            left: 10,   // ? Left padding
            right: 10   // ? Right padding
        };

        // ? If container has a label and it's not hidden, add it first
        if (component.label && !component.hideLabel)
        {
            // ? Estimate label width needed for the label text
            const labelWidth = this.estimateLabelWidth(component.label);

            // ? Create label with text-based width and proper position (no extra inset for labels)
            const result = this.createLabelNode(component, labelWidth, xOffset);
            const labelNode = result.node !== undefined ? result.node : result;
            controlsNode.addChild(labelNode);
            this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
        }

        // ? Process nested components with adjusted width and offset
        const nestedWidth = containerWidth - (containerInsets.left + containerInsets.right);
        const nestedXOffset = containerInsets.left;

        if (component.components)
        {
            const nestedNodes = this.processComponents(component.components, nestedWidth, nestedXOffset);
            nestedNodes.forEach(node => controlsNode.addChild(node));
        }

        // ? Restore original Y position and item number state
        this.currentY = originalY + this.calculateContainerHeight(component) + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
        this.xmlProcessor.currentItemNum = savedItemNum;

        nodes.push(containerNode);
        return nodes;
    }

    // ? Process columns components
    processColumns(component, containerWidth, xOffset)
    {
        // ? Skip if columns component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const columnDef = DevExpressHelpers.getContainerDef('columns');

        // ? Filter out hidden columns
        const visibleColumns = component.columns.filter(col => !this.isHidden(col));

        // ? Calculate total width units and adjust for any missing widths
        const totalUnits = visibleColumns.reduce((sum, col) => {
            const width = col.width || 0;

            return sum + width;
        }, 0) || 12;
        
        // ? Function to calculate pixel width from column units
        const calculateColumnPixelWidth = (columnWidth) => {
            // ! Default to equal width if no width specified
            if (!columnWidth)
            {
                return containerWidth / visibleColumns.length;
            }

            // ? Calculate width based on proportion of total units (default 12)
            const pixelWidth = (columnWidth / totalUnits) * containerWidth;

            return pixelWidth;
        };

        // ? Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: component.key || `columns${Date.now()}`,
            ...columnDef.attributes,
            SizeF: `${containerWidth},${this.calculateColumnsHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`,
            KeepTogether: true,
            AdjustToContainerWidth: true
        });

        // ? Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // ? Create Rows container (no attributes needed)
        const rowsNode = this.xmlProcessor.buildNode('Rows', {});
        tableNode.addChild(rowsNode);

        // ? Reset item numbering for the row
        this.xmlProcessor.currentItemNum = 0;

        // ? Create row as Item1
        const rowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `columnsRow_${Date.now()}`,
            Weight: '1'
        });
        rowsNode.addChild(rowNode);

        // ? Create Cells container
        const cellsNode = this.xmlProcessor.buildNode('Cells', {});
        rowNode.addChild(cellsNode);

        // ? Reset item numbering for cells
        this.xmlProcessor.currentItemNum = 0;

        // ? Process only visible columns
        let visibleIndex = 0;
        component.columns.forEach((col, index) =>
        {
            // ? Skip hidden columns but maintain item numbering
            if (this.isHidden(col))
            {
                this.xmlProcessor.currentItemNum++;
                return;
            }

            // ? Calculate this column's width based on its units
            const colWidth = calculateColumnPixelWidth(col.width);
            
            // ? Calculate weight - if no width specified, use equal distribution
            const colWeight = col.width ? (col.width / totalUnits) : (1 / visibleColumns.length);
            
            // ? Convert weight to string before passing to createItemNode
            const weightStr = String(colWeight.toFixed(6));
            const widthStr = String(colWidth.toFixed(1));
            
            // ? Create cell with explicit item number (Item1, Item2, etc.)
            const cellNode = this.xmlProcessor.createItemNode(visibleIndex + 1, 'XRTableCell',
            {
                Name: `column_${index + 1}`,
                Weight: weightStr, // ? Pass as string
                WidthF: widthStr, // ? Pass as string
                ...columnDef.cellAttributes
            });
            visibleIndex++;

            // ? Process components within the column
            if (col.components)
            {
                const controlsNode = this.xmlProcessor.buildNode('Controls', {});
                cellNode.addChild(controlsNode);

                // ? Reset item numbering for cell contents
                this.xmlProcessor.currentItemNum = 0;

                const savedY = this.currentY;
                this.currentY = 0; // ? Reset Y for column content

                // ? Use calculated pixel width for components, accounting for padding
                const columnNodes = this.processComponents(col.components, colWidth - 16, 10); // ? 10px padding on each side
                columnNodes.forEach(node => controlsNode.addChild(node));

                this.currentY = savedY; // ? Restore Y position
            }

            cellsNode.addChild(cellNode);
        });

        // ? Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        this.currentY += this.calculateColumnsHeight(component) +
            DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

        nodes.push(tableNode);
        return nodes;
    }

    // ? Estimates width needed for label text
    estimateLabelWidth(text) 
    {
        // ? Base calculation on average character width
        const averageCharWidth = 10;    // ? Pixels per character
        const minWidth = 50;            // ? Minimum width in pixels
        
        // ? Calculate width based on text length
        const estimatedWidth = Math.max(
            minWidth,
            text.length * averageCharWidth
        );
        
        return estimatedWidth;
    }

    // ? Calculate label and component positions based on labelPosition property
    calculateLabelPosition(position, componentWidth, labelWidth, xOffset) {
        // ? Default to top position if not specified
        position = position || 'top';
        const spacing = 10;     // ? Spacing between label and component

        // ? Ensure label width is reasonable
        labelWidth = Math.min(
            labelWidth,
            // ? For side positions, don't let label take more than 40% of total width
            position.startsWith('left-') || position.startsWith('right-') 
                ? Math.min(160, componentWidth * 0.3)  // ? Cap at 160px or 30% of width
                : componentWidth
        );

        switch (position) {
            case 'left-left':
            case 'left-right':
                return {
                    x: xOffset,
                    width: labelWidth,
                    componentX: xOffset + labelWidth + spacing,
                    componentWidth: componentWidth - labelWidth - spacing
                };
            case 'right-left':
            case 'right-right':
                return {
                    x: xOffset + componentWidth - labelWidth - 140, // ! I dislike this magic number being used to adjust the placement of the label, but it works for now
                    width: labelWidth,
                    componentX: xOffset,
                    componentWidth: componentWidth - labelWidth - spacing
                };
            case 'bottom':
            case 'top':
            default:
                return {
                    x: xOffset,
                    width: componentWidth,
                    componentX: xOffset,
                    componentWidth: componentWidth
                };
        }
    }

    // ? Create label node with positioning logic
    createLabelNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef(component.type);
        const isPanel = component.type === 'panel' || component.type === 'fieldset' || component.type === 'well';
        const labelStyle = DevExpressHelpers.getLabelStyle(component.isHeader ? 'header' : (isPanel ? 'sectionHeader' : 'default'));
        const height = component.isHeader ? 50 : LAYOUT.LABEL_HEIGHT;

        // ? If no labelPosition or isHeader, create simple label
        if (!component.labelPosition || component.isHeader)
        {
            return this.xmlProcessor.createItemNode(undefined, 'XRLabel',
            {
                Name: `label_${component.key || `field${Date.now()}`}`,
                Text: component.label || '',
                SizeF: `${width},${height}`,
                LocationFloat: `${xOffset},${this.currentY}`,
                ...labelStyle
            });
        }

        // ? Calculate a reasonable label width based on text length
        const labelText = component.label || '';
        const estimatedLabelWidth = this.estimateLabelWidth(labelText);

        // ? Calculate position for label based on labelPosition
        const position = this.calculateLabelPosition(
            component.labelPosition,
            width,
            estimatedLabelWidth,
            xOffset
        );

        const node = this.xmlProcessor.createItemNode(undefined, 'XRLabel',
        {
            Name: `label_${component.key || `field${Date.now()}`}`,
            Text: component.label || '',
            SizeF: `${position.width},${height}`,
            LocationFloat: `${position.x},${this.currentY}`,
            ...labelStyle
        });

        // ? For normal fields (not headers) with label positioning
        return {
            node: node,
            componentX: position.componentX,
            componentWidth: position.componentWidth
        };
    }

    // ? Create value node for standard components
    createValueNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef(component.type);
        let componentHeight = def.defaultHeight;

        // ? Apply width multiplier if defined
        const finalWidth = DevExpressHelpers.calculateComponentWidth(width, def);

        // ? For radio buttons, create a panel containing multiple checkboxes
        if (component.type === 'radio')
        {
            return this.createRadioButtonsNode(component, finalWidth, xOffset, def);
        }

        // ? For components with HTML content, calculate height based on content
        if ((component.type === 'htmlelement' && component.content) ||
            (component.type === 'content' && component.html))
        {
            const htmlContent = component.content || component.html;
            // ? Clean the HTML before calculating height to match what will be displayed
            const cleanedHtml = this.xmlProcessor.cleanHtml(htmlContent);
            componentHeight = this.calculateHtmlHeight(cleanedHtml, finalWidth);
        }

        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: component.key || `field${Date.now()}`,
            ...def.attributes,
            SizeF: `${finalWidth},${componentHeight}`,
            LocationFloat: `${xOffset},${this.currentY}`,
            Font: LAYOUT.FONT_FIELDOUTPUT
        });

        // ? For components that use the label in the Text property (like checkboxes)
        if (def.useTextAsLabel && component.label)
        {
            node.attributes.Text = this.xmlProcessor.escapeText(component.label);
        }
        // ? For components that use HTML content (content or html property)
        else if ((def.useContentAsText || def.useHtmlAsText) && (component.content || component.html))
        {
            // ? Get the HTML content from either content or html property
            const htmlContent = component.content || component.html;
            // ? Clean HTML tags and convert to DevExpress supported format
            const cleanedHtml = this.xmlProcessor.cleanHtml(htmlContent);
            // ? Set the text without escaping HTML tags (since AllowMarkupText is true)
            node.attributes.Text = cleanedHtml;
        }

        // ? Add expression binding for the component's value (skip for HTML and content elements)
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

    // ? Calculate height of a container based on its components
    calculateContainerHeight(container)
    {
        let height = 0;

        // ? Add label height if container has a label
        if (container.label)
        {
            height += LAYOUT.LABEL_HEIGHT; // ? Label height plus spacing
            height += DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
        }

        // ? Calculate height of visible components only
        if (container.components)
        {
            const containerWidth = (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) - 20; // ? Standard width minus padding
            height += container.components.reduce((total, comp, index) =>
            {
                // ? Skip hidden components in height calculation
                if (this.isHidden(comp))
                {
                    return total;
                }

                const def = DevExpressHelpers.getComponentDef(comp.type);
                let componentHeight = def.defaultHeight;

                // ? Calculate special component heights
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
                    // ? For nested panels, recursively calculate height
                    componentHeight = this.calculateContainerHeight(comp);
                }
                else if (comp.type === 'table' && comp.rows)
                {
                    componentHeight = this.calculateTableHeight(comp);
                }
                else if (comp.type === 'columns' && comp.columns)
                {
                    // ? For columns components, use the columns height calculation
                    componentHeight = this.calculateColumnsHeight(comp);
                }
                else if (comp.type === 'radio' && def.calculateHeight)
                {
                    componentHeight = def.calculateHeight(comp);
                }
                else if (comp.type === 'tabs' && comp.components)
                {
                    // ? For tabs, we need to account for each tab's contents plus spacing
                    componentHeight = comp.components.reduce((tabsHeight, tab) =>
                    {
                        // ? Calculate height of this tab (including its label if present)
                        const tabHeight = this.calculateContainerHeight(tab);
                        // ? Add spacing between tabs
                        return tabsHeight + tabHeight + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
                    }, 0);
                }

                // ? Add component height plus label height if needed
                return total + componentHeight + (def.requiresLabel ? LAYOUT.LABEL_HEIGHT : 0) +
                    DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
            }, 0);
        }

        // ? Add padding at top and bottom of container
        return height + (DevExpressDefinitions.commonAttributes.spacing.sectionSpacing * 2);
    }

    // ! Placeholder SubReport Creation
    // ? Create subreport node
    createSubReportNode(component, width, xOffset)
    {
        // ! Temporarily disable nested subforms due to issues. Create the subreport label like normal,
        // ! then skip creating the actual subreport node; instead create a label with placeholder text "REPLACE ME"

        const placeholderNode = this.xmlProcessor.createItemNode(undefined, 'XRLabel',
        {
            Name: `placeholder_${component.key || Date.now()}`,
            Text: 'REPLACE ME WITH SUBREPORT',
            SizeF: `${width},${LAYOUT.LABEL_HEIGHT}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Early return 
        return placeholderNode;
    }

    // ! REAL SubReport Creation (Disabled due to issues)
    // ? Create subreport node
    /*
    createSubReportNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef('nestedsubform');

        // ? Create the subreport node
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `subreport_${component.key || Date.now()}`,
            ...def.attributes,
            SizeF: `${width},${def.defaultHeight}`,
            LocationFloat: `${xOffset},${this.currentY}`,
        });

        // ? Create ReportSource node with required structure
        const reportSource = this.xmlProcessor.buildNode('ReportSource',
        {
            Ref: (this.xmlProcessor.currentRef++).toString(),
            ControlType: 'DevExpress.XtraReports.UI.XtraReport, DevExpress.XtraReports.v23.2, Version=23.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a',
            PageWidth: '850',
            PageHeight: '1100',
            Version: '23.2',
            Font: 'Arial, 9pt'
        });

        // ? Add bands structure without a Ref attribute
        const bandsNode = this.xmlProcessor.buildNode('Bands', null, [
            this.xmlProcessor.buildNode('Item1',
            {
                Ref: (this.xmlProcessor.currentRef++).toString(),
                ControlType: 'TopMarginBand'
            }, null, true),
            this.xmlProcessor.buildNode('Item2',
            {
                Ref: (this.xmlProcessor.currentRef++).toString(),
                ControlType: 'DetailBand'
            }, null, true),
            this.xmlProcessor.buildNode('Item3',
            {
                Ref: (this.xmlProcessor.currentRef++).toString(),
                ControlType: 'BottomMarginBand'
            }, null, true)
        ]);

        reportSource.addChild(bandsNode);
        node.addChild(reportSource);

        return node;
    }
    */

    // ? Create radio buttons container with individual radio buttons
    createRadioButtonsNode(component, width, xOffset, def)
    {
        // ? Create container panel
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `radioPanel_${component.key || `field${Date.now()}`}`,
            ...def.attributes,
            Text: !component.hideLabel ? this.xmlProcessor.escapeText(component.label || '') : '',
            SizeF: `${width},${def.calculateHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Create Controls container
        const controlsNode = this.xmlProcessor.buildNode('Controls', {});
        node.addChild(controlsNode);

        // ? Save and reset item numbering for the buttons
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        const isInline = component.inline === true;
        
        // ? Create a checkbox for each radio option
        let optionY = 0;
        let optionX = 0;
        const buttonSpacing = window.LAYOUT.INPUT_HEIGHT;
        
        if (component.values && Array.isArray(component.values))
        {
            component.values.forEach((option, index) =>
            {
                // ? Calculate position based on layout
                const isInline = component.inline === true;
                
                // ? For inline layout, calculate equal widths and spacing
                const totalWidth = width;
                const totalOptions = component.values.length;
                const equalWidth = Math.floor(totalWidth / totalOptions);
                const spacing = Math.floor(totalWidth - (equalWidth * totalOptions)) / (totalOptions - 1);
                
                const buttonX = isInline ? (index * (equalWidth + spacing)) : 0;
                const buttonY = isInline ? 0 : optionY;
                const buttonWidth = isInline ? equalWidth : width;

                const buttonNode = this.xmlProcessor.createItemNode(index + 1, def.child.controlType,
                {
                    Name: `radio_${component.key}_${index + 1}`,
                    ...def.child.attributes,
                    Text: this.xmlProcessor.escapeText(option.label),
                    // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
                    SizeF: `${buttonWidth},${window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35}`,
                    LocationFloat: `${buttonX},${buttonY}`
                });

                // ? Add expression binding for the checkbox state
                const expressionBindings = this.xmlProcessor.createExpressionBindings(
                {
                    eventName: 'BeforePrint',
                    propertyName: 'CheckBoxState',
                    expression: def.child.expressionTransform(component.key, option.value)
                });
                buttonNode.addChild(expressionBindings);

                controlsNode.addChild(buttonNode);
                
                // ? Update position for next button
                if (isInline) {
                    optionX += buttonWidth + buttonSpacing;
                } else {
                    // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
                    optionY += window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35;
                }
            });
        }

        // ? Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return node;
    }

    // ? Process datagrid components
    processDataGrid(component, containerWidth, xOffset)
    {
        // ? Skip if datagrid component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        // ? Return a special marker object instead of generating nodes
        // ! This tells the parent process that this grid's content will be handled separately
        return {
            type: 'grid',
            gridType: 'datagrid',
            key: component.key,
            component: component,
            width: containerWidth,
            xOffset: xOffset
        };
    }

    // ? Process formgrid components
    processFormGrid(component, containerWidth, xOffset)
    {
        // ? Skip if formgrid component is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const def = DevExpressHelpers.getComponentDef(component.type || 'formgrid');

        // ? First create the label if required
        if (def.requiresLabel)
        {
            nodes.push(this.createLabelNode(component, containerWidth, xOffset));
            this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
        }

        // ? For formgrids, we get field information from the Form Fields property
        const fields = component.formFields || [];

        // ? If no fields found, return early
        if (!fields.length)
        {
            console.warn(`No fields found in formgrid component ${component.key || 'unknown'}`);
            return nodes;
        }

        // ? Create header table
        const headerTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_headers` || `formgrid_headers_${Date.now()}`,
            ...def.headerTable.attributes,
            SizeF: `${containerWidth},${LAYOUT.HEADER_HEIGHT}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Create header rows container 
        const headerRowsNode = this.xmlProcessor.buildNode('Rows', {});
        headerTableNode.addChild(headerRowsNode);

        // ? Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;
        this.xmlProcessor.currentItemNum = 0;

        // ? Create header row
        const headerRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_headerRow` || `formgrid_headerRow_${Date.now()}`,
            ...def.headerTable.rowAttributes
        });
        headerRowsNode.addChild(headerRowNode);

        // ? Create header cells container
        const headerCellsNode = this.xmlProcessor.buildNode('Cells', {});
        headerRowNode.addChild(headerCellsNode);

        // ? Reset item numbering for header cells
        this.xmlProcessor.currentItemNum = 0;

        // ? Filter out button fields first
        const validFields = fields.filter(field => field.type !== 'button');

        // ? Create header cells with field labels
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
        this.currentY += LAYOUT.LABEL_HEIGHT; // ? Just move down by the height of the header row

        // ? Increment the item number for the data table to ensure uniqueness
        this.xmlProcessor.currentItemNum = headerTableItemNum + 1;

        // ? Create data table
        const dataTableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: `${component.key}_data` || `formgrid_data_${Date.now()}`,
            ...def.keysTable.attributes,
            SizeF: `${containerWidth},${LAYOUT.LABEL_HEIGHT}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Create data rows container
        const dataRowsNode = this.xmlProcessor.buildNode('Rows', {});
        dataTableNode.addChild(dataRowsNode);

        // ? Create data row
        const dataRowNode = this.xmlProcessor.createItemNode(1, 'XRTableRow',
        {
            Name: `${component.key}_dataRow` || `formgrid_dataRow_${Date.now()}`,
            ...def.keysTable.rowAttributes
        });
        dataRowsNode.addChild(dataRowNode);

        // ? Create data cells container
        const dataCellsNode = this.xmlProcessor.buildNode('Cells', {});
        dataRowNode.addChild(dataCellsNode);

        // ? Reset item numbering for data cells
        this.xmlProcessor.currentItemNum = 0;

        // ? Create data cells with field values
        validFields.forEach((field, index) =>
        {
            const cellNode = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell',
            {
                Name: `data_${field.key}`,
                Weight: (1 / validFields.length).toString(),
                ...def.keysTable.cellAttributes
            });

            // ? Add expression binding for the data field
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
        this.currentY += LAYOUT.LABEL_HEIGHT + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

        // ? Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return nodes;
    }

    // ? Process table components
    processTable(component, containerWidth, xOffset)
    {
        // ? Skip if table is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const tableDef = DevExpressHelpers.getContainerDef('table');

        // ? Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, tableDef.controlType,
        {
            Name: component.key || `table${Date.now()}`,
            ...tableDef.attributes,
            SizeF: `${containerWidth},${this.calculateTableHeight(component)}`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // ? Create Rows container
        const rowsNode = this.xmlProcessor.buildNode('Rows', {});
        tableNode.addChild(rowsNode);

        // ? Reset item numbering for rows
        this.xmlProcessor.currentItemNum = 0;

        // ? Process each row in the table
        component.rows.forEach((row, rowIndex) =>
        {
            // ? Create row node
            const rowNode = this.xmlProcessor.createItemNode(rowIndex + 1, 'XRTableRow',
            {
                Name: `tableRow_${rowIndex + 1}`,
                ...tableDef.rowAttributes
            });
            rowsNode.addChild(rowNode);

            // ? Create Cells container
            const cellsNode = this.xmlProcessor.buildNode('Cells',
            {});
            rowNode.addChild(cellsNode);

            // ? Reset item numbering for cells
            this.xmlProcessor.currentItemNum = 0;

            // ? Process each cell in the row
            row.forEach((cell, colIndex) =>
            {
                // ? Create cell node
                const cellNode = this.xmlProcessor.createItemNode(colIndex + 1, 'XRTableCell',
                {
                    Name: `cell_${rowIndex + 1}_${colIndex + 1}`,
                    ...tableDef.cellAttributes,
                    Weight: (1 / row.length).toString() // ? Equal width distribution
                });

                // ? Process components within the cell
                if (cell.components && cell.components.length > 0)
                {
                    const controlsNode = this.xmlProcessor.buildNode('Controls',
                    {});
                    cellNode.addChild(controlsNode);

                    // ? Reset item numbering for cell contents
                    this.xmlProcessor.currentItemNum = 0;

                    const savedY = this.currentY;
                    this.currentY = 0; // ? Reset Y for cell content

                    const cellWidth = (containerWidth / row.length) - 16;
                    const cellNodes = this.processComponents(cell.components, cellWidth, 8);
                    cellNodes.forEach(node => controlsNode.addChild(node));

                    this.currentY = savedY; // ? Restore Y position
                }

                cellsNode.addChild(cellNode);
            });
        });

        // ? Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        // ? Update vertical position
        this.currentY += this.calculateTableHeight(component) +
            DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

        nodes.push(tableNode);
        return nodes;
    }

    // ? Process tabs components
    processTabs(component, containerWidth, xOffset)
    {
        // ? Skip if tabs container is hidden
        if (this.isHidden(component))
        {
            this.xmlProcessor.currentItemNum++;
            return [];
        }

        const nodes = [];
        const tabsDef = DevExpressHelpers.getContainerDef('tabs');

        // ? Process each tab as a separate panel
        component.components.forEach((tab, index) =>
        {
            // ? Increment item number for each tab
            this.xmlProcessor.currentItemNum++;

            // ? Create panel for this tab
            const panelNode = this.xmlProcessor.createItemNode(this.xmlProcessor.currentItemNum, tabsDef.controlType,
            {
                Name: `tab_${tab.key || index + 1}`,
                ...tabsDef.attributes,
                SizeF: `${containerWidth},${this.calculateContainerHeight(tab)}`,
                LocationFloat: `${xOffset},${this.currentY}`
            });

            // ? Create Controls node for the panel
            const controlsNode = this.xmlProcessor.buildNode('Controls',
            {});
            panelNode.addChild(controlsNode);

            // ? Save current Y position and item number
            const savedY = this.currentY;
            const savedPanelItemNum = this.xmlProcessor.currentItemNum;

            // ? Reset Y position and item numbering for tab contents
            this.currentY = 0;
            this.xmlProcessor.currentItemNum = 0;

            // ? Add tab label if it exists
            if (tab.label)
            {
                const labelNode = this.createLabelNode(
                {
                    label: tab.label,
                    key: `${tab.key || `tab${index + 1}`}_label`
                }, containerWidth - 10, 5);
                controlsNode.addChild(labelNode);
                this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
            }

            // ? Process components in this tab
            if (tab.components)
            {
                const tabNodes = this.processComponents(tab.components, containerWidth - 20, 10);
                tabNodes.forEach(node => controlsNode.addChild(node));
            }

            // ? Restore item numbering for the panel
            this.xmlProcessor.currentItemNum = savedPanelItemNum;

            // ? Update current Y position for next tab
            this.currentY = savedY + this.calculateContainerHeight(tab) +
                DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;

            nodes.push(panelNode);
        });

        return nodes;
    }

    // ? Calculate height needed for table component
    calculateTableHeight(tableComponent)
    {
        // ? For tables, we need to calculate the maximum height needed for each row
        let totalHeight = 0;

        // ? Calculate each row's height
        tableComponent.rows.forEach(row =>
        {
            let rowHeight = LAYOUT.LABEL_HEIGHT; // ? Minimum row height

            // ? Find the maximum height needed by any cell in this row
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
                        // ? Approximate cell width for HTML height calculation
                        componentHeight = this.calculateHtmlHeight(comp.content, (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) / row.length);
                    }

                    return total + componentHeight + (def.requiresLabel ? LAYOUT.LABEL_HEIGHT : 0) +
                        DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }, 0);

                rowHeight = Math.max(rowHeight, cellHeight);
            });

            totalHeight += rowHeight;
        });

        // ? Add padding for top and bottom, but only once since tables are always inside another container
        return totalHeight + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
    }

    // ? Calculate height needed for columns component
    calculateColumnsHeight(columnsComponent)
    {
        let maxHeight = 0;
        const visibleColumns = columnsComponent.columns.filter(col => !this.isHidden(col));
        const columnWidth = ((LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) - 16) / (visibleColumns.length || 1); // ? Standard width minus padding, divided by visible column count

        visibleColumns.forEach(col =>
        {
            let colHeight = 0;
            if (col.components)
            {
                colHeight = col.components.reduce((total, comp) =>
                {
                    // ? Skip hidden components in height calculation
                    if (this.isHidden(comp))
                    {
                        return total;
                    }

                    const def = DevExpressHelpers.getComponentDef(comp.type);
                    let componentHeight = def.defaultHeight;

                    // ? Calculate actual height for HTML elements
                    if (comp.type === 'htmlelement' && comp.content)
                    {
                        componentHeight = this.calculateHtmlHeight(comp.content, columnWidth - 16);
                    }

                    // ? Add component height plus label height if needed
                    return total + componentHeight + (def.requiresLabel ? LAYOUT.LABEL_HEIGHT : 0) +
                        DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
                }, 0);
            }
            maxHeight = Math.max(maxHeight, colHeight);
        });

        // ? Add padding at top and bottom, but only once since columns are always inside another container
        return maxHeight + DevExpressDefinitions.commonAttributes.spacing.sectionSpacing;
    }
}