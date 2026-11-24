// The conversion policy for each Form.io type. Add ordinary field support here
// using an existing DevExpress profile, or add a profile under definitions/.
export const COMPONENT_MAPPINGS = {
    textfield: {
        profile: "textfield",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true
    },
    textarea: {
        profile: "textarea",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true
    },
    number: {
        profile: "number",
        renderer: "field",
        dataType: "Decimal",
        dataField: true,
        requiresLabel: true
    },
    checkbox: {
        profile: "checkbox",
        renderer: "field",
        dataType: "Boolean",
        dataField: true,
        requiresLabel: false,
        useTextAsLabel: true,
        expression: (key) => `IIF([${key}] = True, True, False)`
    },
    select: {
        profile: "select",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `[${key}]`
    },
    radio: {
        profile: "radio",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true
    },
    nestedsubform: {
        profile: "nestedsubform",
        renderer: "subreport",
        dataType: "String",
        dataField: false,
        requiresLabel: true
    },
    email: {
        profile: "email",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `[${key}]`
    },
    url: {
        profile: "url",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `[${key}]`
    },
    phoneNumber: {
        profile: "phoneNumber",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `[${key}]`
    },
    address: {
        profile: "address",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `[${key}]`
    },
    datetime: {
        profile: "datetime",
        renderer: "field",
        dataType: "DateTime",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `FormatString('{0:MM/dd/yyyy hh:mm tt}', [${key}])`
    },
    day: {
        profile: "day",
        renderer: "field",
        dataType: "DateTime",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `FormatString('{0:MM/dd/yyyy}', [${key}])`
    },
    time: {
        profile: "time",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `FormatString('{0:hh:mm tt}', [${key}])`
    },
    currency: {
        profile: "currency",
        renderer: "field",
        dataType: "Decimal",
        dataField: true,
        requiresLabel: true,
        expression: (key) => `FormatString('{0:C}', [${key}])`
    },
    signature: {
        profile: "signature",
        renderer: "field",
        dataType: "String",
        dataField: true,
        requiresLabel: true,
        expression: key => `[${key}]`
    },
    htmlelement: {
        profile: "htmlelement",
        renderer: "field",
        dataType: "String",
        dataField: false,
        requiresLabel: false,
        useContentAsText: true
    },
    content: {
        profile: "content",
        renderer: "field",
        dataType: "String",
        dataField: false,
        requiresLabel: false,
        useContentAsText: true
    },
    datagrid: {
        profile: "datagrid",
        renderer: "grid",
        dataType: "String",
        dataField: false,
        requiresLabel: true
    },
    formgrid: {
        profile: "formgrid",
        renderer: "grid",
        dataType: "String",
        dataField: false,
        requiresLabel: true
    },
    panel: {
        renderer: "container",
        layout: "panel",
        dataField: false
    },
    fieldset: {
        renderer: "container",
        layout: "fieldset",
        dataField: false
    },
    well: {
        renderer: "container",
        layout: "well",
        dataField: false
    },
    columns: {
        renderer: "columns",
        layout: "columns",
        dataField: false
    },
    table: {
        renderer: "table",
        layout: "table",
        dataField: false
    },
    tabs: {
        renderer: "tabs",
        layout: "tabs",
        dataField: false
    },
    column: {
        renderer: "skip",
        dataField: false
    },
    tab: {
        renderer: "skip",
        dataField: false
    },
    html: {
        renderer: "field",
        profile: "htmlelement",
        useContentAsText: true,
        dataField: false
    },
    editgrid: {
        alias: "datagrid"
    },
    button: {
        renderer: "skip",
        dataField: false
    },
    submit: {
        renderer: "skip",
        dataField: false
    },
    hidden: {
        renderer: "skip",
        dataField: true,
        dataType: "String"
    },
    container: {
        renderer: "field",
        profile: "textfield",
        dataField: false
    },
    form: {
        renderer: "field",
        profile: "textfield",
        dataField: false
    },
    nestedform: {
        renderer: "field",
        profile: "textfield",
        dataField: false
    },
    grid: {
        renderer: "skip",
        dataField: false,
        repeating: true
    }
};

export function getComponentMapping(type) {
    const visited = new Set();
    while (Object.hasOwn(COMPONENT_MAPPINGS, type)) {
        if (visited.has(type)) throw new Error(`Circular component alias: ${type}`);
        visited.add(type);
        const mapping = COMPONENT_MAPPINGS[type];
        if (!mapping.alias) return mapping;
        type = mapping.alias;
    }
    return null;
}
export function isRepeatingComponent(type) {
    const mapping = getComponentMapping(type);
    return mapping?.renderer === 'grid' || mapping?.repeating === true;
}
export function bindingProperty(controlType) {
    return { XRCheckBox: 'CheckBoxState', XRPictureBox: 'ImageSource' }[controlType] || 'Text';
}
