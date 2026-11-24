import { layoutInsets } from './reportLayout.js';
import { getComponentMapping, bindingProperty } from './componentMappings.js';
import { getColumnWidths, gridColumns } from './formSchema.js';
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
    constructor(xmlProcessor, warnings = [])
    {
        this.xmlProcessor = xmlProcessor;
        this.warnings = warnings;
        this.currentY = 0;

        // ? Create measurement div for HTML content
        this.measureDiv = document.createElement('div');
        this.measureDiv.style.position = 'absolute';
        this.measureDiv.style.visibility = 'hidden';
        this.measureDiv.style.fontFamily = LAYOUT.FONT_FIELDOUTPUT.split(',')[0];
        this.measureDiv.style.fontSize = LAYOUT.FONT_FIELDOUTPUT.split(',')[1].trim();
        this.measureDiv.style.fontWeight = LAYOUT.FONT_FIELDOUTPUT.includes('Bold') ? 'bold' : 'normal';

    }

    dispose() { this.measureDiv.remove(); }

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
        if (!this.measureDiv.isConnected) document.body.appendChild(this.measureDiv);
        // Report units are hundredths of an inch; browser measurements are CSS pixels.
        const pixelsPerUnit = 96 / 100;
        // ? Set width and reset height
        this.measureDiv.style.width = `${width * pixelsPerUnit}px`;
        this.measureDiv.style.height = 'auto';

        // ? Convert DevExpress markup tags to HTML for measurement
        let measureContent = content
            .replace(/<size=(\d+)>/g, (_, size) => `<span style="font-size:${size}pt">`)
            .replace(/<\/size>/g, '</span>')
            .replace(/<color=([^>]+)>/g, (_, color) => `<span style="color:${color}">`)
            .replace(/<\/color>/g, '</span>');

        // ? Set content and calculate height
        this.measureDiv.innerHTML = measureContent;
        
        // ? Get the actual height including any margins
        const style = window.getComputedStyle(this.measureDiv);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        
        // ? Calculate height with actual margins
        const height = Math.ceil((this.measureDiv.offsetHeight + marginTop + marginBottom) / pixelsPerUnit);

        // ? Clear content
        this.measureDiv.innerHTML = '';

        // ? Return height, minimum INPUT_HEIGHT for empty content
        return Math.max(LAYOUT.INPUT_HEIGHT, height);
    }

    // ? Main entry point for processing components
    processComponents(components, containerWidth = (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT), xOffset = 0)
    {
        // ! EARLY EXIT
        // ? Check if components array is valid
        if (!components || components.length === 0) return [];

        const processedNodes = [];
        const gridMarkers = [];  // ? Store grid components for separate processing
        const nestedFormMarkers = []; // ? Store nested form components for separate processing
        const startingItemNum = this.xmlProcessor.currentItemNum;
        let hasPrevious = false;

        components.forEach(component => {
            if (!component || getComponentMapping(component.type)?.renderer === 'skip') return;

            // ? Skip hidden components
            if (this.isHidden(component)) {
                this.xmlProcessor.currentItemNum++;
                return;
            }

            const beforeY = this.currentY;
            if (hasPrevious) this.currentY += LAYOUT.VERTICAL_SPACING;
            const result = this.processComponent(component, containerWidth, xOffset);
            const visualNodes = (Array.isArray(result) ? result : [result]).filter(node => node?.attributes?.SizeF && Number(node.attributes.SizeF.split(',')[1]) > 0);
            if (visualNodes.length) {
                this.currentY = Math.max(...visualNodes.map(node => Number(node.attributes.LocationFloat.split(',')[1]) + Number(node.attributes.SizeF.split(',')[1])));
                hasPrevious = true;
            } else {
                this.currentY = beforeY;
                if (result?.type === 'grid' || result?.type === 'nestedsubform') hasPrevious = false;
            }

            // ? If this is a grid marker, push to both arrays
            if (result && result.type === 'grid') 
            {
                gridMarkers.push(result);
                processedNodes.push(result); // ? Interleave grid marker in output order
            } 
            else if (result && result.type === 'nestedsubform')
            {
                nestedFormMarkers.push(result);
                processedNodes.push(result); // ? Interleave nested subform marker in output order
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

        this.nestedFormComponents = nestedFormMarkers;

        return processedNodes;
    }

    // ? Process individual component based on its type
    processComponent(component, containerWidth, xOffset)
    {
        // ? Pass component info to getComponentDef through the window object
        const def = DevExpressHelpers.getComponentDef(component.type, component, this.warnings);

        // ? Handle nestedsubform components as markers
        if (getComponentMapping(component.type)?.renderer === 'subreport') {
            return {
                type: 'nestedsubform',
                key: component.key,
                content: component.components || []
            };
        }

        // ? We're handling grids differently, as they require special table structures
        if (getComponentMapping(component.type)?.renderer === 'grid')
        {
            const visibleColumns = gridColumns(component);
            if (!visibleColumns.length) return [];

            // Grid controls are local to newly created report bands.
            const gridY = 0;

            // ? Create the header table
            const headerTable = this.xmlProcessor.createItemNode(this.xmlProcessor.currentItemNum++, 'XRTable', {
                Name: `${component.key}_headers`,
                SizeF: `${containerWidth},${LAYOUT.LABEL_HEIGHT}`,
                LocationFloat: `${xOffset},${gridY}`,
                ...def.headerTable.attributes
            });

            // ? Create header rows container and row
            const headerRows = this.xmlProcessor.buildNode('Rows', {});
            const headerRow = this.xmlProcessor.createItemNode(1, 'XRTableRow', {
                ...def.headerTable.rowAttributes
            });

            // ? Create cells container
            const headerCells = this.xmlProcessor.buildNode('Cells', {});

            // ? Process each column to create header cells
            visibleColumns.forEach((column, index) => {
                //console.log('[DEBUG] Creating XRTableCell for field label. Font:', LAYOUT.FONT_FIELDLABEL);
                const cell = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell', {
                    Text: column.label || column.key || '',
                    Weight: '1',
                    ...def.headerTable.cellAttributes,
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
                ...def.keysTable.attributes
            });

            // ? Create data rows and cells
            const dataRows = this.xmlProcessor.buildNode('Rows', {});
            const dataRow = this.xmlProcessor.createItemNode(1, 'XRTableRow', {
                ...def.keysTable.rowAttributes
            });
            const dataCells = this.xmlProcessor.buildNode('Cells', {});

            // ? Process each column to create data cells with bindings
            visibleColumns.forEach((column, index) => {
                const cell = this.xmlProcessor.createItemNode(index + 1, 'XRTableCell', {
                    Weight: '1',
                    ...def.keysTable.cellAttributes,
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
        
        switch (getComponentMapping(component.type)?.renderer)
        {
            case 'container':
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
                                this.currentY += LAYOUT.LABEL_HEIGHT + LAYOUT.LABEL_VALUE_GAP;
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

                // ? Create the value component first
                const valueNode = this.createValueNode(component, componentWidth, componentX);
                nodes.push(valueNode);
                
                // ? Get value component height for positioning
                const valueHeight = parseFloat(valueNode.attributes.SizeF.split(',')[1]);

                if (def.requiresLabel && component.label && !component.hideLabel && component.labelPosition === 'bottom')
                {
                    // ? For bottom labels, create the label after the value and position it below
                    const labelY = this.currentY + valueHeight + LAYOUT.LABEL_VALUE_GAP;
                    this.currentY = labelY; // ? Temporarily move currentY to where label should go
                    const result = this.createLabelNode(component, containerWidth, xOffset);

                    if (result.node !== undefined)
                    {
                        nodes.push(result.node);

                        // ? Get label height for final positioning
                        const labelHeight = parseFloat(result.node.attributes.SizeF.split(',')[1]);
                        this.currentY += labelHeight;
                    }
                    else
                    {
                        this.currentY = this.currentY + valueHeight + LAYOUT.VERTICAL_SPACING;
                    }
                }
                else
                {
                    this.currentY += valueHeight;
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
        const containerDef = DevExpressHelpers.getContainerDef(getComponentMapping(component.type)?.layout || component.type);
        const heading = component.title || component.legend || component.label;
        const containerNode = this.xmlProcessor.createItemNode(undefined, containerDef.controlType,
        {
            Name: component.key || `${component.type}${Date.now()}`,
            ...containerDef.attributes,
            SizeF: `${containerWidth},0`,
            LocationFloat: `${xOffset},${this.currentY}`
        });

        // ? Create Controls node for the container and add it to the container
        const controlsNode = this.xmlProcessor.buildNode('Controls', {});
        containerNode.addChild(controlsNode);

        // ? Save current item number state
        const savedItemNum = this.xmlProcessor.currentItemNum;

        // ? Reset Y position for nested components to be relative to container
        const originalY = this.currentY;
        const insets = layoutInsets(containerDef, containerWidth);
        this.currentY = insets.top;

        // ? Reset item numbering for container contents (including label)
        this.xmlProcessor.currentItemNum = 0;

        // ? If container has a label and it's not hidden, add it first
        if (heading && !component.hideLabel)
        {
            // ? Estimate label width needed for the label text
            const labelWidth = this.estimateLabelWidth(heading);

            // ? Create label with text-based width and proper position (no extra inset for labels)
            const result = this.createLabelNode({ ...component, label: heading }, Math.min(labelWidth, containerWidth - insets.left - insets.right), insets.left);
            const labelNode = result.node !== undefined ? result.node : result;
            controlsNode.addChild(labelNode);
            this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
        }

        // ? Process nested components with adjusted width and offset
        const nestedWidth = Math.max(1, containerWidth - insets.left - insets.right);
        const nestedXOffset = insets.left;

        if (component.components)
        {
            const nestedNodes = this.processComponents(component.components, nestedWidth, nestedXOffset);
            nestedNodes.forEach(node => controlsNode.addChild(node));
        }

        // ? Restore original Y position and item number state
        if (!controlsNode.children.length) {
            this.currentY = originalY;
            this.xmlProcessor.currentItemNum = savedItemNum;
            return [];
        }
        const renderedHeight = this.currentY + insets.bottom;
        containerNode.attributes.SizeF = `${containerWidth},${renderedHeight}`;
        this.currentY = originalY + renderedHeight;
        this.xmlProcessor.currentItemNum = savedItemNum;

        // console.log('[processContainer] createItemNode', {
        //     currentRef: this.xmlProcessor.currentRef,
        //     Name: component.key || `${component.type}${Date.now()}`
        // });

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

        if (!visibleColumns.length) return [];
        const widths = getColumnWidths(visibleColumns, containerWidth);
        let renderedHeight = 0;

        // ? Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, 'XRTable',
        {
            Name: component.key || `columns${Date.now()}`,
            ...columnDef.attributes,
            SizeF: `${containerWidth},0`,
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
            const colWidth = widths[visibleIndex];
            
            // ? Calculate weight - if no width specified, use equal distribution
            const colWeight = colWidth / containerWidth;
            
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
                const insets = layoutInsets(columnDef, colWidth);
                this.currentY = insets.top;

                // ? Use calculated pixel width for components, accounting for padding
                const columnNodes = this.processComponents(col.components, Math.max(1, colWidth - insets.left - insets.right), insets.left); // ? 10px padding on each side
                columnNodes.forEach(node => controlsNode.addChild(node));

                renderedHeight = Math.max(renderedHeight, this.currentY + insets.bottom);
                this.currentY = savedY; // ? Restore Y position
            }

            cellsNode.addChild(cellNode);
        });

        // ? Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        tableNode.attributes.SizeF = `${containerWidth},${renderedHeight}`;
        this.currentY += renderedHeight;

        // console.log('[processColumns] createItemNode', {
        //     currentRef: this.xmlProcessor.currentRef,
        //     Name: component.key || `columns${Date.now()}`
        // });

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
        const spacing = LAYOUT.LABEL_HORIZONTAL_GAP;     // ? Spacing between label and component

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
                    x: xOffset + componentWidth - labelWidth,
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
        const isPanel = getComponentMapping(component.type)?.renderer === 'container';
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
        if (def.child)
        {
            return this.createRadioButtonsNode(component, finalWidth, xOffset, def);
        }

        // ? For components with HTML content, calculate height based on content
        if ((def.useContentAsText || def.useHtmlAsText) && (component.content || component.html))
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
            node.attributes.Text = component.label;
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
                propertyName: bindingProperty(def.controlType),
                expression: def.expression ? def.expression(component.key) : `[${component.key}]`
            });
            node.addChild(expressionBindings);
        }

        // console.log('[createValueNode] createItemNode', {
        //     currentRef: this.xmlProcessor.currentRef,
        //     Name: component.key || `field${Date.now()}`
        // });

        return node;
    }

    // ? Create subreport node
    createSubReportNode(component, width, xOffset)
    {
        const def = DevExpressHelpers.getComponentDef('nestedsubform');

        // ? Create the subreport node
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `subreport_${component.key || component.Name || Date.now()}`,
            ...def.attributes,
            SizeF: `${width},${def.defaultHeight}`,
            LocationFloat: `0,0`, // Ensure the subreport is at the top-left corner of it's band
        });

        // ? Create ReportSource node with required structure
        const reportSource = this.xmlProcessor.buildNode('ReportSource',
        {
              ControlType: 'DevExpress.XtraReports.UI.XtraReport, DevExpress.XtraReports.v23.2, Version=23.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a',
            PageWidth: '850',
            PageHeight: '1100',
            Version: '23.2',
            Font: 'Arial, 9pt'
        });

        // ? Add bands structure
        const bandsNode = this.xmlProcessor.buildNode('Bands', null, [
            this.xmlProcessor.buildNode('Item1',
            {
                ControlType: 'TopMarginBand'
            }, null, true),
            this.xmlProcessor.buildNode('Item2',
            {
                ControlType: 'DetailBand'
            }, null, true),
            this.xmlProcessor.buildNode('Item3',
            {
                ControlType: 'BottomMarginBand'
            }, null, true)
        ]);

        reportSource.addChild(bandsNode);
        node.addChild(reportSource);

        return node;
    }

    // ? Create radio buttons container with individual radio buttons
    createRadioButtonsNode(component, width, xOffset, def)
    {
        // ? Create container panel
        const node = this.xmlProcessor.createItemNode(undefined, def.controlType,
        {
            Name: `radioPanel_${component.key || `field${Date.now()}`}`,
            ...def.attributes,
            Text: !component.hideLabel ? (component.label || '') : '',
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
                const spacing = totalOptions > 1 ? (totalWidth - equalWidth * totalOptions) / (totalOptions - 1) : 0;
                
                const buttonX = isInline ? (index * (equalWidth + spacing)) : 0;
                const buttonY = isInline ? 0 : optionY;
                const buttonWidth = isInline ? equalWidth : width;

                const buttonNode = this.xmlProcessor.createItemNode(index + 1, def.child.controlType,
                {
                    Name: `radio_${component.key}_${index + 1}`,
                    ...def.child.attributes,
                    Text: option.label,
                    // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
                    SizeF: `${buttonWidth},${window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35}`,
                    LocationFloat: `${buttonX},${buttonY}`,
                    Font: LAYOUT.FONT_FIELDOUTPUT
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
                if (isInline)
                {
                    optionX += buttonWidth + buttonSpacing;
                } 
                else
                {
                    // Always use the latest value from window.LAYOUT.INPUT_HEIGHT
                    optionY += window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 35;
                }
            });
        }

        // ? Restore original item number
        this.xmlProcessor.currentItemNum = savedItemNum;

        return node;
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
        let renderedHeight = 0;
        const tableDef = DevExpressHelpers.getContainerDef('table');

        // ? Create table node
        const tableNode = this.xmlProcessor.createItemNode(undefined, tableDef.controlType,
        {
            Name: component.key || `table${Date.now()}`,
            ...tableDef.attributes,
            SizeF: `${containerWidth},0`,
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
        (component.rows || []).forEach((row, rowIndex) =>
        {
            let rowHeight = LAYOUT.INPUT_HEIGHT;
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
                    const insets = layoutInsets(tableDef, containerWidth / row.length);
                    this.currentY = insets.top;

                    const cellWidth = Math.max(1, containerWidth / row.length - insets.left - insets.right);
                    const cellNodes = this.processComponents(cell.components, cellWidth, insets.left);
                    cellNodes.forEach(node => controlsNode.addChild(node));

                    rowHeight = Math.max(rowHeight, this.currentY + insets.bottom);
                    this.currentY = savedY; // ? Restore Y position
                }

                cellsNode.addChild(cellNode);
            });
            rowNode.attributes.Weight = String(rowHeight);
            renderedHeight += rowHeight;
        });

        // ? Restore original item number state
        this.xmlProcessor.currentItemNum = savedItemNum;

        // ? Update vertical position
        tableNode.attributes.SizeF = `${containerWidth},${renderedHeight}`;
        this.currentY += renderedHeight;

        // console.log('[processTable] createItemNode', {
        //     currentRef: this.xmlProcessor.currentRef,
        //     Name: component.key || `table${Date.now()}`
        // });

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
        component.components.filter(tab => !this.isHidden(tab)).forEach((tab, index) =>
        {
            // ? Increment item number for each tab
            this.xmlProcessor.currentItemNum++;

            // ? Create panel for this tab
            const panelNode = this.xmlProcessor.createItemNode(this.xmlProcessor.currentItemNum, tabsDef.controlType,
            {
                Name: `tab_${tab.key || index + 1}`,
                ...tabsDef.attributes,
                SizeF: `${containerWidth},0`,
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
            const insets = layoutInsets(tabsDef, containerWidth);
            this.currentY = insets.top;
            this.xmlProcessor.currentItemNum = 0;

            // ? Add tab label if it exists
            if (tab.label)
            {
                const labelNode = this.createLabelNode(
                {
                    label: tab.label,
                    key: `${tab.key || `tab${index + 1}`}_label`
                }, Math.max(1, containerWidth - insets.left - insets.right), insets.left);
                controlsNode.addChild(labelNode);
                this.currentY += LAYOUT.LABEL_HEIGHT; // ? Label height
            }

            // ? Process components in this tab
            if (tab.components)
            {
                const tabNodes = this.processComponents(tab.components, Math.max(1, containerWidth - insets.left - insets.right), insets.left);
                tabNodes.forEach(node => controlsNode.addChild(node));
            }

            // ? Restore item numbering for the panel
            this.xmlProcessor.currentItemNum = savedPanelItemNum;

            // ? Update current Y position for next tab
            const renderedHeight = this.currentY + insets.bottom;
            panelNode.attributes.SizeF = `${containerWidth},${renderedHeight}`;
            this.currentY = savedY + renderedHeight + LAYOUT.VERTICAL_SPACING;

            nodes.push(panelNode);
        });

        return nodes;
    }

}
