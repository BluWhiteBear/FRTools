export const DevExpressDefinitions = {
    // Base component types and their DevExpress equivalents
    componentTypes: {
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
            requiresLabel: false,  // Label is handled in Text property
            attributes: {
                Padding: '2,2,0,0,100',
                GlyphOptions: {
                    Size: '13,13'
                }
            },
            useTextAsLabel: true,  // Special flag to indicate label goes in Text property
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
                // Base height plus spacing for each component
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
                // Similar to fieldset
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
                Weight: '0.5'  // Default to equal width columns
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
