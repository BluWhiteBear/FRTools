import { LAYOUT } from "./layoutConfig.js";

export const DevExpressDefinitions = {
    // Component Support Status:
    /*
        ! === Basic Fields ===
        Textfield: Single-line text input | FULLY SUPPORTED
        Textarea: Multi-line text input | FULLY SUPPORTED
        Number: Numeric input | FULLY SUPPORTED
        Checkbox: Boolean input | FULLY SUPPORTED
        Select: Dropdown/Select/Combobox input | FULLY SUPPORTED
        Radio: Radio button group input | FULLY SUPPORTED
        Button: Button input | NOT SUPPORTED

        ! === Advanced Fields ===
        Nested Form: Subform/nested form input | NOT SUPPORTED
        Email: Email input | FULLY SUPPORTED
        URL: URL input | FULLY SUPPORTED
        Phone Number: Phone number input | FULLY SUPPORTED
        Address: Address input | FULLY SUPPORTED
        Date/Time: Date/time picker input | FULLY SUPPORTED
        Day: Date input | FULLY SUPPORTED
        Time: Time input | FULLY SUPPORTED'
        Currency: Currency input | FULLY SUPPORTED
        Signature: Signature input | PARTIALLY SUPPORTED

        ! === Layout Components ===
        HTML Element: Static HTML content | FULLY SUPPORTED
        Content: Static text content | NOT SUPPORTED
        Columns: Multi-column layout | FULLY SUPPORTED
        Fieldset: Grouping container | FULLY SUPPORTED
        Panel: Collapsible/expandable container | FULLY SUPPORTED
        Table: Tabular layout | FULLY SUPPORTED
        Tabs: Tabbed container | FULLY SUPPORTED
        Well: Simple container with border | FULLY SUPPORTED

        ! === Data Components ===
        Form Grid: Grid of Dialog forms | PARTIALLY SUPPORTED
        Hidden: ???? | NOT SUPPORTED
        Container: ???? | NOT SUPPORTED
        Data Map: ???? | NOT SUPPORTED
        Data Grid: Grid of data from external table | PARTIALLY SUPPORTED
        Edit Grid: ???? | NOT SUPPORTED
        Tree: ???? | NOT SUPPORTED
    */
    
    // Component Property Definitions:
    /*
        ! === Text & Label ===
        controlType: The DevExpress control type to use (e.g., XRLabel, XRCheckBox)
        requiresLabel: Whether a separate label component is needed above the field component
        useContentAsText: For HTML elements, use the content property as the Text attribute
        useTextAsLabel: For checkboxes, use the Text attribute as the label
        TextAlignment: Standard text alignment options (MiddleLeft, MiddleCenter, etc.)
        Font: Standard font format 'FontName, Sizept, style=Style'
        Multiline: Whether text can span multiple lines
        AllowMarkupText: Whether HTML/markup content is allowed in text

        ! === Sizing & Layout ===
        defaultHeight: Default height in pixels for the component
        widthMultiplier: Optional multiplier (0-1) to adjust the final width of the component
        calculateHeight: For containers, function to calculate height based on children and spacing
        Padding: Standard padding format 'left,top,right,bottom,dpi'
        AnchorHorizontal: For tables, how the table anchors horizontally (Left, Right, Both)
        AnchorVertical: For tables, how the table anchors vertically (Top, Bottom, Both)
        Weight: For table rows/cells, relative weight for sizing (0.5 = Equal Width Columns)
        CanShrink: Whether container can shrink to fit content
        SizeF: Size format for components
        LocationFloat: Position coordinates

        ! === Appearance ===
        Borders: Standard border options (None, Bottom, All, etc.)
        GlyphOptions: For checkboxes, options for the checkbox glyph
            Size: For glyphs, size in pixels 'width,height'
        Sizing: For images, how to size the content (e.g., ZoomImage)

        ! === Data & Expressions ===
        attributes: Default attributes to apply to the component
        expression: Function to generate the ExpressionBindings for data fields

        ! === Table/Container Specific ===
        rowAttributes: For tables, default attributes for rows
        cellAttributes: For tables, default attributes for cells
    */
    
    
    // ? Data Field Component Definitions
    componentTypes: 
    {
        // ! === Basic Fields ===
        textfield: {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            }
        },

        textarea: {
            controlType: 'XRLabel',
            get defaultHeight() { return (window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5) * 2; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'BottomLeft',
                Multiline: 'true',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            }
        },

        number: {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            }
        },

        checkbox: {
            controlType: 'XRCheckBox',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 1.0,
            requiresLabel: false,
            attributes: {
                Padding: '2,2,0,0,100',
                GlyphOptions: {
                    Size: '13,13'
                }
            },
            useTextAsLabel: true,
            expression: (key) => `IIF([${key}] == 'true', True, False)`
        },

        select: {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },

        radio: {
            controlType: 'XRPanel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            requiresLabel: true,
            calculateHeight: (options) => {
                if (options.inline === true) {
                    return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5;
                }
                return (options.values.length * (window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5));
            },
            attributes: {
                TextAlignment: 'MiddleLeft',
                Padding: '2,2,0,0,100',
                CanShrink: 'true'
            },
            child: {
                controlType: 'XRCheckBox',
                get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
                widthMultiplier: 1.0,
                requiresLabel: false,
                attributes: {
                    Padding: '2,2,0,0,100',
                    GlyphOptions: {
                        Size: '13,13'
                    }
                },
                useTextAsLabel: true,
                expressionTransform: (key, value) => `IIF([${key}] == '${value}', True, False)`
            }
        },

        button: // ! Not supported in reports
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            requiresLabel: false,
            attributes: 
            {
                Visible: 'false', // ! Buttons aren't rendered in reports, so we hide them. We still need a placeholder.
            }
        },

        // ! === Advanced Fields ===
        fileupload: // ! Not supported in reports
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            requiresLabel: false,
            attributes: 
            {
                Visible: 'false', // ! File upload controls aren't rendered in reports, so we hide them. We still need a placeholder.
            }
        },

        nestedsubform: 
        {
            controlType: 'XRSubreport',
            defaultHeight: 50,
            requiresLabel: true,
            attributes: 
            {
                ReportSourceUrl: "",
                SizeF: (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) + ",50"
            }
        },

        email: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },

        url: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },

        phoneNumber: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },

        address: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.75,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Multiline: 'true',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },

        datetime: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.5,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `FormatString('{0:MM/dd/yyyy hh:mm tt}', [${key}])`
        },

        day: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.5,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `FormatString('{0:MM/dd/yyyy}', [${key}])`
        },

        time: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.5,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `FormatString('{0:hh:mm tt}', [${key}])`
        },

        currency: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            widthMultiplier: 0.25,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `FormatString('{0:C}', [${key}])`
        },

        signature: 
        {
            controlType: 'XRPictureBox',
            defaultHeight: 100,
            widthMultiplier: 0.5,
            requiresLabel: true,
            attributes: 
            {
                Sizing: 'ZoomImage',
                Padding: '2,2,0,0,100'
            },
            expression: key => `[${key}]`
        },

        // ! === Layout Components ===
        htmlelement: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            requiresLabel: false,
            attributes: 
            {
                TextAlignment: 'TopLeft',
                Borders: 'None',
                Padding: '2,2,0,0,100',
                Multiline: 'false',
                AllowMarkupText: 'true'
            },
            useContentAsText: true
        },

        content: 
        {
            controlType: 'XRLabel',
            get defaultHeight() { return window.LAYOUT && window.LAYOUT.INPUT_HEIGHT ? window.LAYOUT.INPUT_HEIGHT : 5; },
            requiresLabel: false,
            attributes: 
            {
                TextAlignment: 'TopLeft',
                Borders: 'None',
                Padding: '2,2,0,0,100',
                Multiline: 'false',
                AllowMarkupText: 'true'
            },
            useContentAsText: true
        },

        // ! === Data Components ===
        datagrid: 
        {
            controlType: 'XRLabel',
            defaultHeight: 50,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Padding: '2,2,0,0,100'
            },

            headerTable: // Contains the column labels
            {
                controlType: 'XRTable',
                attributes: 
                {
                    Borders: 'All',
                    BackColor: 'Gainsboro',
                    Padding: '2,2,0,0,100'
                },
                rowAttributes: 
                {
                    Weight: '1',
                    BackColor: 'Gainsboro'
                },
                cellAttributes: 
                {
                    Padding: '5,5,5,5,100',
                    Borders: 'All',
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDLABEL
                }
            },

            keysTable: // Contains the field keys for data binding
            {
                controlType: 'XRTable',
                attributes: 
                {
                    Borders: 'All',
                    Padding: '2,2,0,0,100'
                },
                rowAttributes: 
                {
                    Weight: '1'
                },
                cellAttributes: 
                {
                    Padding: '5,5,5,5,100',
                    Borders: 'All',
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDOUTPUT
                }
            }
        },

        formgrid: 
        {
            controlType: 'XRLabel',
            defaultHeight: 50,
            requiresLabel: true,
            attributes: 
            {
                TextAlignment: 'MiddleLeft',
                Padding: '2,2,0,0,100'
            },

            headerTable: // Contains the column labels
            {
                controlType: 'XRTable',
                attributes: 
                {
                    Borders: 'All',
                    BackColor: 'Gainsboro',
                    Padding: '2,2,0,0,100'
                },
                rowAttributes: 
                {
                    Weight: '1',
                    BackColor: 'Gainsboro'
                },
                cellAttributes: 
                {
                    Padding: '5,5,5,5,100',
                    Borders: 'All', 
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDLABEL
                }
            },

            keysTable: // Contains the field keys for data binding
            {
                controlType: 'XRTable',
                attributes: 
                {
                    Borders: 'All',
                    Padding: '2,2,0,0,100'
                },
                rowAttributes: 
                {
                    Weight: '1'
                },
                cellAttributes: 
                {
                    Padding: '5,5,5,5,100',
                    Borders: 'All',
                    TextAlignment: 'MiddleLeft',
                    Font: LAYOUT.FONT_FIELDOUTPUT
                }
            }
        },
    },

    // ? Container Component Definitions
    containerTypes: 
    {
        fieldset: 
        {
            controlType: 'XRPanel',
            attributes: 
            {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, comp) => total + (comp.defaultHeight || window.LAYOUT.INPUT_HEIGHT) + spacing, 0);
            }
        },

        panel:
        {
            controlType: 'XRPanel',
            attributes: 
            {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                if (!components) return 0;

                return components.reduce((total, comp) => {
                    let height = comp.defaultHeight || window.LAYOUT.INPUT_HEIGHT;

                    if (comp.type === 'panel' || comp.type === 'fieldset')
                    {
                        height += spacing * 2;
                    }

                    return total + height + spacing;
                }, 0);
            }
        },

        well: 
        {
            controlType: 'XRPanel',
            attributes: 
            {
                CanShrink: 'true',
                Borders: 'All',
                BorderWidth: '1',
                Padding: '10,10,10,10,100'
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, comp) => total + (comp.defaultHeight || window.LAYOUT.INPUT_HEIGHT) + spacing, 0);
            }
        },

        tabs: 
        {
            controlType: 'XRPanel',
            attributes:
            {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, tabComponents) => {
                    const tabHeight = tabComponents.reduce((tabTotal, comp) => tabTotal + (comp.defaultHeight || window.LAYOUT.INPUT_HEIGHT) + spacing, 0);

                    return total + tabHeight + spacing;
                }, 0);
            }
        },

        columns: 
        {
            controlType: 'XRTable',
            attributes: 
            {
                AnchorHorizontal: 'Both',
                AnchorVertical: 'Top',
                Padding: '0,0,0,0,96'
            },
            rowAttributes: 
            {
                Weight: '1'
            },
            cellAttributes: 
            {
                Padding: '8,8,8,8,96',
                Borders: 'None',
                TextAlignment: 'TopLeft'
            }
        },

        table: {
            controlType: 'XRTable',
            attributes: 
            {
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            rowAttributes: 
            {
                Weight: '1'
            },
            cellAttributes: 
            {
                Padding: '5,5,0,0,100',
                Borders: 'None',
                TextAlignment: 'MiddleLeft'
            }
        }
    },

    // ? Predefined styles that can be referenced by components
    styles: 
    {
        labels: {
            default: // Used on field labels unless overridden
            {
                Font: LAYOUT.FONT_FIELDLABEL,
                TextAlignment: 'MiddleLeft',
                Borders: 'None',
                Padding: '2,0,0,0,100'
            },

            header: // Used on Report Header
            {
                Font: LAYOUT.FONT_REPORTHEADER,
                TextAlignment: 'MiddleCenter',
                Padding: '2,2,0,0,100'
            },

            sectionHeader:  // Used on Panel headers
            {
                Font: LAYOUT.FONT_SECTIONHEADER,
                TextAlignment: 'MiddleLeft',
                Padding: '2,0,0,0,100'
            }
        }
    },

    // ? Predefined attribute combinations
    commonAttributes:
    {
        spacing: 
        {
            labelSpacing: 2,
            get componentSpacing() {
                return LAYOUT.VERTICAL_SPACING;
            },
            sectionSpacing: 15
        },

        borders: 
        {
            none: 'None',
            bottom: 'Bottom',
            all: 'All',
            leftRightBottom: 'Left, Right, Bottom'
        },

        alignment: 
        {
            middleLeft: 'MiddleLeft',
            middleCenter: 'MiddleCenter',
            middleRight: 'MiddleRight',
            topLeft: 'TopLeft',
            topCenter: 'TopCenter'
        }
    },

    // ? XML Templates for each component type
    templates: {
        // ! === Fields ===
        textfield: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRLabel" 
                Name="${context.escapeXml(component.key || `textfield${itemNum}`)}"
                Text="${context.escapeXml(!component.hideLabel ? (component.label || '') : '')}"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100">
                <ExpressionBindings>
                    <Item1 Ref="${context.getNextRef()}" EventName="BeforePrint" 
                        PropertyName="Text" 
                        Expression="${context.getTypeCastedFieldExpression(component)}" />
                </ExpressionBindings>
                <StylePriority UseTextAlignment="true" />
                </Item${itemNum}>`
        },

        htmlelement: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRLabel" 
                Name="${context.escapeXml(component.key || `html${itemNum}`)}"
                Text="${context.escapeXml(context.cleanHtml(component.content))}"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100"
                AllowMarkupText="true"/>`
        },

        richtext: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => {
                // Clean initial content if available
                if (component.content) {
                    component.content = context.cleanHtml(component.content);
                }
                
                return `
                <Item${itemNum} ControlType="XRRichText" 
                Name="${context.escapeXml(component.key || `richText${itemNum}`)}"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT * 2}"
                LocationFloat="${xOffset},${currentY}"
                Font="${LAYOUT.FONT_FIELDOUTPUT}"
                Padding="2,2,0,0,100">
                <ExpressionBindings>
                    <Item1 Ref="${context.getNextRef()}" EventName="BeforePrint" 
                        PropertyName="Html" Expression="[${component.key}]" />
                </ExpressionBindings>
                </Item${itemNum}>`
            }
        },

        checkbox: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRCheckBox" 
                Name="${context.escapeXml(component.key || `checkbox${itemNum}`)}"
                Text="${context.escapeXml(!component.hideLabel ? (component.label || '') : '')}"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100"
                Borders="None">
                <GlyphOptions Ref="${context.getNextRef()}" Size="13,13"/>
                <ExpressionBindings>
                    <Item1 Ref="${context.getNextRef()}" EventName="BeforePrint" 
                        PropertyName="CheckState" 
                        Expression="IIF(ISNULL([${context.escapeXml(component.key)}], False), False, ToBoolean([${context.escapeXml(component.key)}]))" />
                </ExpressionBindings>
                <StylePriority Ref="${context.getNextRef()}" UseBorders="false" UseTextAlignment="true" />
                </Item${itemNum}>`
        },

        datetime: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRLabel" 
                Name="${context.escapeXml(component.key || `date${itemNum}`)}"
                Text="FormatDateTime(ToDateTime([${context.escapeXml(component.key)}]), 'g')"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                TextAlignment="MiddleLeft"
                Padding="2,2,0,0,100">
                <StylePriority Ref="${context.getNextRef()}" UseTextAlignment="false" />
                </Item${itemNum}>`
        },

        picturebox: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => {
                const def = DevExpressHelpers.getComponentDef(component.type);
                const exprBindings = def.expressionBindings?.map((binding, i) => `
                    <Item${i + 1} Ref="${context.getNextRef()}" 
                        EventName="${binding.eventName}" 
                        PropertyName="${binding.propertyName}" 
                        Expression="${binding.expression(component.key)}" />`).join('\n          ') || '';
                
                return `<Item${itemNum} ControlType="XRPictureBox" 
                    Name="${context.escapeXml(component.key || `picture${itemNum}`)}"
                    SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                    LocationFloat="${xOffset},${currentY}"
                    Padding="2,2,0,0,100"
                    Sizing="ZoomImage">
                    <ExpressionBindings>
                        ${exprBindings}
                    </ExpressionBindings>
                    </Item${itemNum}>`;
            }
        },

        barcode: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRBarCode" 
                Name="${context.escapeXml(component.key || `barcode${itemNum}`)}"
                SizeF="${componentWidth},${window.LAYOUT.INPUT_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100"
                Symbology="QRCode"
                AutoModule="true"
                TextAlignment="MiddleCenter">
                <ExpressionBindings>
                    <Item1 Ref="${context.getNextRef()}" EventName="BeforePrint" 
                        PropertyName="Text" Expression="[${component.key}]" />
                </ExpressionBindings>
                <StylePriority Ref="${context.getNextRef()}" UseTextAlignment="true" />
                </Item${itemNum}>`
        },

        datagrid: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRTable" 
                Name="${context.escapeXml(component.key || `datagrid${itemNum}`)}"
                SizeF="${componentWidth},${context.TABLE_LAYOUT.HEADER_HEIGHT + context.TABLE_LAYOUT.ROW_HEIGHT}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100"
                Borders="All">
                <Rows>
                    <Item1 ControlType="XRTableRow" Name="headerRow_${itemNum}" Weight="1">
                        <Cells>
                            ${component.components?.map((col, index) => `
                                <Item${index + 1} ControlType="XRTableCell" 
                                Name="headerCell_${index + 1}_${itemNum}"
                                Text="${context.escapeXml(col.label || '')}"
                                Weight="${1/component.components.length}"
                                Padding="${context.TABLE_LAYOUT.CELL_PADDING},${context.TABLE_LAYOUT.CELL_PADDING},0,0,96"
                                ${Object.entries(DevExpressDefinitions.labelStyles.default).map(([key, value]) => `${key}="${value}"`).join('\n                                ')}>
                                <StylePriority UseFont="true" UseTextAlignment="true" UseBackColor="true" />
                                </Item${index + 1}>`).join('\n')}
                        </Cells>
                    </Item1>
                    <Item2 ControlType="XRTableRow" Name="detailRow_${itemNum}" Weight="1">
                        <Cells>
                            ${component.components?.map((col, index) => `
                                <Item${index + 1} ControlType="XRTableCell" 
                                Name="detailCell_${index + 1}_${itemNum}"
                                Weight="${1/component.components.length}"
                                Padding="${context.TABLE_LAYOUT.CELL_PADDING},${context.TABLE_LAYOUT.CELL_PADDING},0,0,96">
                                <ExpressionBindings>
                                    <Item1 Ref="${context.getNextRef()}" EventName="BeforePrint" 
                                        PropertyName="Text" Expression="[${context.escapeXml(col.key)}]" />
                                </ExpressionBindings>
                                <StylePriority UseTextAlignment="true" />
                                </Item${index + 1}>`).join('\n')}
                        </Cells>
                    </Item2>
                </Rows>
                <StylePriority Ref="${context.getNextRef()}" UseBorders="false" />
                </Item${itemNum}>`
        },

        // ! === Layout Components ===
        panel: {
            template: (component, context, { panelItemNum, componentWidth, totalHeight, xOffset, currentY, nestedContext }) => `
                <Item${panelItemNum} ControlType="XRPanel" 
                Name="${context.escapeXml(component.key || `panel${panelItemNum}`)}"
                CanShrink="true"
                SizeF="${componentWidth},${totalHeight}"
                LocationFloat="${xOffset},${currentY}"
                Padding="2,2,0,0,100"
                Borders="Left, Right, Bottom">
                <Controls>
                    ${(component.label && !component.hideLabel) ? context.generateLabel(component, nestedContext) : ''}
                    ${component.components ? 
                    context.processNestedComponents(
                        component.components,
                        context.getNextRef(),
                        componentWidth - (LAYOUT.MARGIN * 2),
                        LAYOUT.MARGIN,
                        (component.label && !component.hideLabel) ? LAYOUT.LABEL_HEIGHT + LAYOUT.VERTICAL_SPACING : 0,
                        nestedContext
                    ) : ''}
                </Controls>
                <StylePriority Ref="${context.getNextRef()}" UseBorders="false" />
                </Item${panelItemNum}>`
        },

        table: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY }) => {
                const rows = (component.rows || []).map((row, rowIndex) => {
                    const rowItemNum = context.itemCounter++;
                    const cells = (row.cells || []).map((cell, cellIndex) => {
                        const cellItemNum = context.itemCounter++;
                        const cellWeight = (1/row.cells.length).toFixed(4);
                        return `<Item${cellItemNum} ControlType="XRTableCell" 
                            Name="cell_${cellItemNum}" 
                            Weight="${cellWeight}" 
                            Text="${context.escapeXml(cell.content || '')}" 
                            Padding="${context.TABLE_LAYOUT.CELL_PADDING},${context.TABLE_LAYOUT.CELL_PADDING},0,0,96"/>`;
                    }).join('');
                    return `<Item${rowItemNum} ControlType="XRTableRow" 
                        Name="row_${rowItemNum}" 
                        Weight="1"><Cells>${cells}</Cells></Item${rowItemNum}>`;
                }).join('');
                
                return `<Item${itemNum} ControlType="XRTable" 
                    Name="${context.escapeXml(component.key || `table${itemNum}`)}" 
                    SizeF="${componentWidth},${component.rows?.length * context.TABLE_LAYOUT.ROW_HEIGHT || context.TABLE_LAYOUT.ROW_HEIGHT}" 
                    LocationFloat="${xOffset},${currentY}" 
                    Padding="${context.TABLE_LAYOUT.CELL_PADDING},${context.TABLE_LAYOUT.CELL_PADDING},0,0,96" 
                    Borders="All"><Rows>${rows}</Rows></Item${itemNum}>`;
            }
        },

        pagebreak: {
            template: (component, context, { itemNum, xOffset, currentY }) => `
                <Item${itemNum} ControlType="XRPageBreak" 
                Name="pageBreak${itemNum}"
                LocationFloat="${xOffset},${currentY}" />`
        },

        columns: {
            template: (component, context, { itemNum, componentWidth, xOffset, currentY, visibleColumns, columnWeights, columnWidths }) => `
                <Item${itemNum} ControlType="XRTable" 
                Name="${context.escapeXml(component.key || `columns${itemNum}`)}"
                SizeF="${componentWidth},${context.columnsHeight}"
                LocationFloat="${xOffset},${currentY}"
                AnchorHorizontal="Both"
                AnchorVertical="Top"
                Padding="0,0,0,0,96">
                <Rows>
                    <Item1 ControlType="XRTableRow" Name="columnsRow_${itemNum}" Weight="1">
                        <Cells>
                            ${visibleColumns.map((col, colIndex) => {
                                const visibleComponents = (col.components || [])
                                    .filter(comp => context.isComponentVisible(comp));
                                let cellContent = '';
                                let currentCellY = 0;

                                visibleComponents.forEach(comp => {
                                    const componentHeight = context.calculateComponentHeight(comp);
                                    cellContent += context.processNestedComponents(
                                        [comp], 
                                        context.getNextRef() + (1000 * (colIndex + 1)), 
                                        columnWidths[colIndex], 
                                        0, 
                                        currentCellY
                                    );
                                    currentCellY += componentHeight + LAYOUT.VERTICAL_GAP;
                                });

                                return `<Item${colIndex + 1} ControlType="XRTableCell" 
                                    Name="column_${colIndex + 1}"
                                    Weight="${columnWeights[colIndex] / 100}"
                                    Padding="8,8,8,8,96"
                                    Borders="None"
                                    TextAlignment="TopLeft">
                                    <Controls>
                                        ${cellContent}
                                    </Controls>
                                    </Item${colIndex + 1}>`;
                            }).join('\n')}
                        </Cells>
                    </Item1>
                </Rows>
                <StylePriority Ref="${context.getNextRef()}" UsePadding="false" />
                </Item${itemNum}>`
        },
    }
};

export const DevExpressHelpers = {

    // ? Retrieve the component definition for a given type
    getComponentDef(type)
    {
        const def = DevExpressDefinitions.componentTypes[type];

        // ! If no definition found, log a warning and return the textfield definition as a fallback
        if (!def)
        {
            const DevExpressConverter = window.DevExpressConverter;

            if (DevExpressConverter && DevExpressConverter.state)
            {
                const component = window.currentComponent || {};
                DevExpressConverter.state.warnings = DevExpressConverter.state.warnings || [];
                DevExpressConverter.state.warnings.push({
                    type: 'unhandled_component',
                    message: `Component type '${type}' is not explicitly supported. Using default textfield rendering.`,
                    component: {
                        type: type,
                        key: component.key || '[unknown]',
                        label: component.label || '[unknown]'
                    }
                });
            }

            return DevExpressDefinitions.componentTypes.textfield;
        }

        return def;
    },

    // ? Retrieve the container definition for a given type
    getContainerDef(type)
    {
        return DevExpressDefinitions.containerTypes[type];
    },

    // ? Retrieve a label style by name
    getLabelStyle(style = 'default')
    {
        // ? Always return a fresh style object using the current LAYOUT values
        switch (style) {
            case 'header':
                return {
                    Font: LAYOUT.FONT_REPORTHEADER,
                    TextAlignment: 'MiddleCenter',
                    Padding: '2,2,0,0,100',
                    Borders: 'None'
                };
            case 'sectionHeader':
                return {
                    Font: LAYOUT.FONT_SECTIONHEADER,
                    TextAlignment: 'MiddleLeft',
                    Padding: '2,0,0,0,100',
                    Borders: 'None'
                };
            case 'default':
            default:
                return {
                    Font: LAYOUT.FONT_FIELDLABEL,
                    TextAlignment: 'MiddleLeft',
                    Padding: '2,0,0,0,100',
                    Borders: 'None'
                };
        }
    },

    // ? Calculate the width of a component based on its definition
    calculateComponentWidth(width, componentDef) 
    {
        if (!componentDef || typeof width !== 'number') 
        {
            return width;
        }

        const multiplier = componentDef.widthMultiplier;

        if (typeof multiplier !== 'number')
        {
            return width;
        }

        const clampedMultiplier = Math.max(0, Math.min(1, multiplier));

        return Math.floor(width * clampedMultiplier);
    },

    // ? Combine two sets of attributes
    combineAttributes(baseAttrs, additionalAttrs) 
    {
        return { ...baseAttrs, ...additionalAttrs };
    },

    // ? Calculate the height of a component based on its definition
    calculateComponentHeight(component) 
    {
        const def = this.getComponentDef(component.type);
        const labelHeight = (def.requiresLabel && !component.hideLabel) ? window.LAYOUT.INPUT_HEIGHT : 0;
        const spacing = DevExpressDefinitions.commonAttributes.spacing.componentSpacing;

        return def.defaultHeight + labelHeight + spacing;
    }
};
