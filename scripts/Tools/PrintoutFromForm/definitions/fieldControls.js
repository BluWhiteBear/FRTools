import { LAYOUT } from '../layoutConfig.js';

// Target control profiles. Routing, datasource types and bindings live in componentMappings.js.
export const FIELD_CONTROLS = {
    textfield: {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        }
    },

    textarea: {
        controlType: 'XRLabel',
        get defaultHeight() { return (LAYOUT.INPUT_HEIGHT) * 2; },
        widthMultiplier: 0.75,
        attributes: {
            TextAlignment: 'BottomLeft',
            Multiline: 'true',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        }
    },

    number: {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.25,
        attributes: {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        }
    },

    checkbox: {
        controlType: 'XRCheckBox',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 1.0,
        attributes: {
            Padding: '2,2,0,0,100',
            GlyphOptions: {
                Size: '13,13'
            }
        },
    },

    select: {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    radio: {
        controlType: 'XRPanel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        calculateHeight: (options) => {
            if (options.inline === true) {
                return LAYOUT.INPUT_HEIGHT;
            }
            return (options.values.length * (LAYOUT.INPUT_HEIGHT));
        },
        attributes: {
            TextAlignment: 'MiddleLeft',
            Padding: '0,0,0,0,100',
            CanShrink: 'true'
        },
        child: {
            controlType: 'XRCheckBox',
            get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
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
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        attributes: 
        {
            Visible: 'false', // ! Buttons aren't rendered in reports, so we hide them. We still need a placeholder.
        }
    },

    fileupload: // ! Not supported in reports
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        attributes: 
        {
            Visible: 'false', // ! File upload controls aren't rendered in reports, so we hide them. We still need a placeholder.
        }
    },

    nestedsubform: 
    {
        controlType: 'XRSubreport',
        defaultHeight: 50,
        attributes: 
        {
            ReportSourceUrl: "",
            SizeF: (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) + ",50"
        }
    },

    email: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    url: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    phoneNumber: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    address: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.75,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Multiline: 'true',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    datetime: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.5,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    day: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.5,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    time: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.5,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    currency: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        widthMultiplier: 0.25,
        attributes: 
        {
            TextAlignment: 'MiddleLeft',
            Borders: 'Bottom',
            Padding: '2,2,0,0,100'
        },
    },

    signature: 
    {
        controlType: 'XRPictureBox',
        defaultHeight: 100,
        widthMultiplier: 0.5,
        attributes: 
        {
            Sizing: 'ZoomImage',
            Padding: '2,2,0,0,100'
        },
    },

    htmlelement: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        attributes: 
        {
            TextAlignment: 'TopLeft',
            Borders: 'None',
            Padding: '2,2,0,0,100',
            Multiline: 'false',
            AllowMarkupText: 'true'
        },
    },

    content: 
    {
        controlType: 'XRLabel',
        get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
        attributes: 
        {
            TextAlignment: 'TopLeft',
            Borders: 'None',
            Padding: '2,2,0,0,100',
            Multiline: 'false',
            AllowMarkupText: 'true'
        },
    },

    datagrid: 
    {
        controlType: 'XRLabel',
        defaultHeight: 50,
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
    }
};
