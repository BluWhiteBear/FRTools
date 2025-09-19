export const DevExpressDefinitions = {

    // Component Support Status:
    /*
        === Basic Fields ===
        textfield: Single-line text input | FULLY SUPPORTED
        textarea: Multi-line text input | FULLY SUPPORTED
        number: Numeric input | FULLY SUPPORTED
        checkbox: Boolean input | FULLY SUPPORTED
        select: Dropdown/Select/Combobox input | FULLY SUPPORTED
        radio: Radio button group input | FULLY SUPPORTED

        === Advanced Fields ===
        Nested Form: Subform/nested form input | PARTIALLY SUPPORTED
        Email: Email input | FULLY SUPPORTED
        URL: URL input | FULLY SUPPORTED
        Phone Number: Phone number input | FULLY SUPPORTED
        Address: Address input | FULLY SUPPORTED
        Date/Time: Date/time picker input | FULLY SUPPORTED
        Day: Date input | NOT SUPPORTED
        Time: Time input | NOT SUPPORTED
        Signature: Signature input | PARTIALLY SUPPORTED

        === Layout Components ===
        HTML Element: Static HTML content | FULLY SUPPORTED
        Content: Static text content | NOT SUPPORTED
        Columns: Multi-column layout | FULLY SUPPORTED
        Fieldset: Grouping container | FULLY SUPPORTED
        Panel: Collapsible/expandable container | FULLY SUPPORTED
        Table: Tabular layout | FULLY SUPPORTED
        Tabs: Tabbed container | FULLY SUPPORTED
        Well: Simple container with border | FULLY SUPPORTED

        === Data Components ===
        Form Grid: Grid of Dialog forms | NOT SUPPORTED
        Hidden: ???? | NOT SUPPORTED
        Container: ???? | NOT SUPPORTED
        Data Map: ???? | NOT SUPPORTED
        Data Grid: Grid of data from external table | NOT SUPPORTED
        Edit Grid: ???? | NOT SUPPORTED
        Tree: ???? | NOT SUPPORTED
    */
    
    // Component Property Definitions:
    /*
        === Text & Label ===
        controlType: The DevExpress control type to use (e.g., XRLabel, XRCheckBox)
        requiresLabel: Whether a separate label component is needed above the field component
        useContentAsText: For HTML elements, use the content property as the Text attribute
        useTextAsLabel: For checkboxes, use the Text attribute as the label
        TextAlignment: Standard text alignment options (MiddleLeft, MiddleCenter, etc.)
        Font: Standard font format 'FontName, Sizept, style=Style'
        Multiline: Whether text can span multiple lines
        AllowMarkupText: Whether HTML/markup content is allowed in text

        === Sizing & Layout ===
        defaultHeight: Default height in pixels for the component
        calculateHeight: For containers, function to calculate height based on children and spacing
        Padding: Standard padding format 'left,top,right,bottom,dpi'
        AnchorHorizontal: For tables, how the table anchors horizontally (Left, Right, Both)
        AnchorVertical: For tables, how the table anchors vertically (Top, Bottom, Both)
        Weight: For table rows/cells, relative weight for sizing (0.5 = Equal Width Columns)
        CanShrink: Whether container can shrink to fit content
        SizeF: Size format for components
        LocationFloat: Position coordinates

        === Appearance ===
        Borders: Standard border options (None, Bottom, All, etc.)
        GlyphOptions: For checkboxes, options for the checkbox glyph
            Size: For glyphs, size in pixels 'width,height'
        Sizing: For images, how to size the content (e.g., ZoomImage)

        === Data & Expressions ===
        attributes: Default attributes to apply to the component
        expression: Function to generate the ExpressionBindings for data fields

        === Table/Container Specific ===
        rowAttributes: For tables, default attributes for rows
        cellAttributes: For tables, default attributes for cells
    */
    
    
    // Base component types and their DevExpress equivalents
    componentTypes: {
        nestedsubform: {
            controlType: 'XRSubreport',
            defaultHeight: 50,
            requiresLabel: true,
            attributes: {
                ReportSourceId: "0",
                SizeF: "650,50",
                GenerateOwnPages: "true"
            }
        },
        htmlelement: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: false,
            attributes: {
                TextAlignment: 'TopLeft',
                Borders: 'None',
                Padding: '2,2,0,0,100',
                Multiline: 'false',
                AllowMarkupText: 'true'
            },
            useContentAsText: true
        },
        content: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: false,
            attributes: {
                TextAlignment: 'TopLeft',
                Borders: 'None',
                Padding: '2,2,0,0,100',
                Multiline: 'false',
                AllowMarkupText: 'true'
            },
            useHtmlAsText: true
        },
        textfield: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            }
        },
        textarea: {
            controlType: 'XRLabel',
            defaultHeight: 50,
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
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            }
        },
        checkbox: {
            controlType: 'XRCheckBox',
            defaultHeight: 25,
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
            defaultHeight: 25,
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
            defaultHeight: 25,
            requiresLabel: true,
            calculateHeight: (options) => options.values.length * 25,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Padding: '2,2,0,0,100',
                CanShrink: 'true'
            },
            child: {
                controlType: 'XRCheckBox',
                defaultHeight: 25,
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
        datetime: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `FormatString('{0:MM/dd/yyyy hh:mm tt}', [${key}])`
        },
        signature: {
            controlType: 'XRPictureBox',
            defaultHeight: 100,
            requiresLabel: true,
            attributes: {
                Sizing: 'ZoomImage',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },
        email: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },
        url: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },
        phoneNumber: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        },
        address: {
            controlType: 'XRLabel',
            defaultHeight: 50,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'BottomLeft',
                Multiline: 'true',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `[${key}]`
        }
    },

    // Container components
    containerTypes: {
        fieldset: {
            controlType: 'XRPanel',
            attributes: {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, comp) => 
                    total + (comp.defaultHeight || 25) + spacing, 0);
            }
        },
        panel: {
            controlType: 'XRPanel',
            attributes: {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, comp) => 
                    total + (comp.defaultHeight || 25) + spacing, 0);
            }
        },
        well: {
            controlType: 'XRPanel',
            attributes: {
                CanShrink: 'true',
                Borders: 'All',
                BorderWidth: '1',
                Padding: '10,10,10,10,100'  // Extra padding to account for border
            },
            calculateHeight: (components, spacing) => {
                return components.reduce((total, comp) => 
                    total + (comp.defaultHeight || 25) + spacing, 0);
            }
        },
        tabs: {
            controlType: 'XRPanel',
            attributes: {
                CanShrink: 'true',
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            calculateHeight: (components, spacing) => {
                // For tabs, we sum up the height of each tab's components
                // Each tab gets spacing between it and the next
                return components.reduce((total, tabComponents) => {
                    const tabHeight = tabComponents.reduce((tabTotal, comp) => 
                        tabTotal + (comp.defaultHeight || 25) + spacing, 0);
                    return total + tabHeight + spacing;
                }, 0);
            }
        },
        columns: {
            controlType: 'XRTable',
            attributes: {
                AnchorHorizontal: 'Both',
                AnchorVertical: 'Top',
                Padding: '0,0,0,0,96'
            },
            rowAttributes: {
                Weight: '1'
            },
            cellAttributes: {
                Padding: '8,8,8,8,96',
                Borders: 'None',
                TextAlignment: 'TopLeft',
                Weight: '0.5'
            }
        },
        table: {
            controlType: 'XRTable',
            attributes: {
                Borders: 'None',
                Padding: '2,2,0,0,100'
            },
            rowAttributes: {
                Weight: '1'
            },
            cellAttributes: {
                Padding: '5,5,0,0,100',
                Borders: 'None',
                TextAlignment: 'MiddleLeft'
            }
        }
    },

    // Label styles
    labelStyles: {
        default: {
            Font: 'Times New Roman, 9.75pt, style=Bold',
            TextAlignment: 'MiddleLeft',
            Borders: 'None',
            Padding: '2,2,0,0,100'
        },
        header: {
            Font: 'Times New Roman, 14pt, style=Bold',
            TextAlignment: 'MiddleCenter',
            Padding: '2,2,0,0,100'
        }
    },

    // Common attribute sets that can be reused
    commonAttributes: {
        spacing: {
            labelSpacing: 2,
            componentSpacing: 8,
            sectionSpacing: 15
        },
        borders: {
            none: 'None',
            bottom: 'Bottom',
            all: 'All',
            leftRightBottom: 'Left, Right, Bottom'
        },
        alignment: {
            middleLeft: 'MiddleLeft',
            middleCenter: 'MiddleCenter',
            middleRight: 'MiddleRight',
            topLeft: 'TopLeft',
            topCenter: 'TopCenter'
        }
    }
};

// Helper functions for working with the definitions
export const DevExpressHelpers = {
    // Get component definition with fallback to default
    getComponentDef(type) {
        const def = DevExpressDefinitions.componentTypes[type];
        if (!def) {
            // Add warning about unhandled component type
            const DevExpressConverter = window.DevExpressConverter;
            if (DevExpressConverter && DevExpressConverter.state) {
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

    // Get container definition
    getContainerDef(type) {
        return DevExpressDefinitions.containerTypes[type];
    },

    // Get label style
    getLabelStyle(style = 'default') {
        return DevExpressDefinitions.labelStyles[style];
    },

    // Combine attributes with defaults
    combineAttributes(baseAttrs, additionalAttrs) {
        return { ...baseAttrs, ...additionalAttrs };
    },

    // Calculate total height for a component including its label if needed
    calculateComponentHeight(component) {
        const def = this.getComponentDef(component.type);
        const labelHeight = def.requiresLabel ? 25 : 0;
        const spacing = DevExpressDefinitions.commonAttributes.spacing.componentSpacing;
        return def.defaultHeight + labelHeight + spacing;
    }
};
