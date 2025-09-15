export const DevExpressDefinitions = {
    
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
        textfield: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`
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
            },
            expression: (key) => `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`
        },
        number: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleRight',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`
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
            expression: (key) => `IIF(ISNULL([${key}], False), False, ToBoolean([${key}]))`
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
            expression: (key) => `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`
        },
        radio: {
            controlType: 'XRLabel',
            defaultHeight: 25,
            requiresLabel: true,
            attributes: {
                TextAlignment: 'MiddleLeft',
                Borders: 'Bottom',
                Padding: '2,2,0,0,100'
            },
            expression: (key) => `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`
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
            expression: (key) => `FormatDateTime(ToDateTime([${key}]), 'g')`
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
        return DevExpressDefinitions.componentTypes[type] || 
               DevExpressDefinitions.componentTypes.textfield;
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
