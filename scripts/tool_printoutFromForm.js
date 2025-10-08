//#region Imports

import { XMLProcessor } from './xmlProcessor.js';
import { ComponentProcessor } from './componentProcessor.js';

//#endregion

//#region Constants

// ? Version info is used for generating both XML and SQL
const VERSION_INFO = {
    version: '0.3.8',
    updated: '10/08/2025',
    devexpressVersion: '23.2.5.0'
};

// ? Debugging flags
const debugLevel = 0;       // ? 0: No Logging, 
                            // ? 1: Basic Event Logging, 
                            // ? 2: Detailed Component Processing Logging

// ? Details basic layout conventions for XML generation
const LAYOUT = {
    MARGIN: 0,              // ? Page margin in pixels
    VERTICAL_SPACING: 10,   // ? Vertical space between components
    LABEL_HEIGHT: 25,       // ? Height of labels
    INPUT_HEIGHT: 25,       // ? Height of input fields
    DEFAULT_WIDTH: 650,     // ? Default width for components
    COLUMN_WIDTH: 325,      // ? Width of columns
    PAGE_WIDTH: 850,        // ? Width of the page
    PAGE_HEIGHT: 1100,      // ? Height of the page
    LANDSCAPE: false,       // ? Adjusted width for landscape orientation
    HEADER_WIDTH: 769.987,  // ? Width of the report header
};

// ? Layout conventions for tables. 
// ? For our purposes this includes Form.io Columns, Tables, FormGrids, and DataGrids
const TABLE_LAYOUT = {
    HEADER_HEIGHT: 30,      // ? Height of table headers
    ROW_HEIGHT: 25,         // ? Height of table rows
    CELL_PADDING: 5,        // ? Padding within table cells
    DEFAULT_ROWS: 1,        // ? Default number of rows in a table
    BORDER_WIDTH: 1,        // ? Width of table borders
};

//#endregion

//#region Core

class DevExpressConverter
{
    // ? Holds state information between function calls
    static state = {
        devExpressJson: null,   // ? For storing the generated JSON
        warnings: []            // ? For storing conversion warnings
    };

    static initialize()
    {
        this.state.devExpressJson = null;   // ? Reset generated JSON
        this.state.warnings = [];           // ? Reset warnings
        FieldGenerator.initRefs();          // ? Reset ref and item counters at start
    }

    // ? Counts all components recursively, including nested ones
    // ? Returns an integer
    static countComponents(components)
    {
        // ! /// EARLY EXIT ///
        // ! If components is null or undefined, fall back to a count of 0
        if (!components) return 0;

        let count = components.length;
        for (const component of components)
        {
            if (component.components)
            {
                count += this.countComponents(component.components);
            }

            if (component.columns)
            {
                for (const col of component.columns)
                {
                    if (col.components)
                    {
                        count += this.countComponents(col.components);
                    }
                }
            }
        }

        return count;
    }

    // ? Counts all data sources. This includes the main form, DataGrids, FormGrids, and any Nested Forms
    // ? Returns an integer
    static countDataSources(formioData)
    {
        let dataSources = ['Main Form Table'];

        // ! /// EARLY EXIT ///
        // ! If there is no form data, fall back to assuming just the main form
        if (!formioData) return dataSources.length;

        const checkComponent = (component) =>
        {
            // ! /// EARLY EXIT ///
            // ! If the component is null or undefined, just skip it
            if (!component) return;

            const key = component.key || 'unnamed'; // ! Fallback for missing keys

            // ? Count DataGrid components that are NOT marked as FormGrid
            if (component.type === 'datagrid' && !component.IsFormGrid)
            {
                dataSources.push(`Datagrid: ${key} (${component.DBName})`);

                // ? Debug Logging - DataGrid Found
                if (debugLevel >= 2) {
                    console.log('FOUND DataGrid Component:',
                    {
                        key,
                        dbName: component.DBName
                    });
                }
            }

            // ? Count FormGrid components that ARE marked as FormGrid
            if (component.type === 'datagrid' && component.IsFormGrid) // ! For some reason Form.io types FormGrids as 'datagrid'
            {
                dataSources.push(`Formgrid: ${key} (${component.DBName})`);

                // ? Debug Logging - FormGrid Found
                if (debugLevel >= 2) {
                    console.log('FOUND FormGrid Component:',
                    {
                        key,
                        dbName: component.DBName
                    });
                }
            }

            // ? Count Nested Form components
            if (component.type === 'nestedsubform')
            {
                dataSources.push(`Nested Form: ${key} (${component.DBName})`);

                // ? Debug Logging - Nested Form Found
                if (debugLevel >= 2) {
                    console.log('FOUND Nested Form Component:',
                    {
                        key,
                        dbName: component.DBName
                    });
                }
            }

            // ? Recursively check nested components
            if (component.components)
            {
                component.components.forEach(checkComponent);
            }

            // ? Check components in columns
            if (component.columns)
            {
                component.columns.forEach(col =>
                {
                    if (col.components)
                    {
                        col.components.forEach(checkComponent);
                    }
                });
            }
        };

        // ? Process all components
        if (formioData.components)
        {
            formioData.components.forEach(checkComponent);
        }

        // ? Debug log all found data sources
        if (debugLevel >= 1) {
            console.log('All Data Sources:', dataSources);
        }

        return dataSources.length;
    }

    // ? Recursively finds all DataGrid components in the form definition
    // ? Returns an array of component objects
    static findDataGridComponents(formioData, results = [])
    {
        // ! /// EARLY EXIT ///
        // ! If there is no form data, just return the empty results array
        if (!formioData) return results;

        // ? Adds root-level DataGrids to results
        if (formioData.Grid?.dataGrid?.DBTableName && !formioData.Grid?.formGrid)
        {
            results.push({
                DBName: formioData.Grid.dataGrid.DBTableName,
                type: 'datagrid',
                key: formioData.Grid.dataGrid.key || 'mainGrid'
            });
        }

        // ? Adds nested DataGrids to results
        const components = formioData.components;

        // ! /// EARLY EXIT ///
        // ! If there are no components, just return the current results array
        if (!components) return results;

        for (const component of components)
        {
            // ? Make sure it's a datagrid and not a formgrid
            const isDataGrid = component.type === 'datagrid' && component.DBName && !component.IsFormGrid; // ! They're both typed as 'datagrid' in Form.io for some reason...

            if (isDataGrid)
            {
                // ? Make sure we always have a valid key
                // ! If the key is missing, generate a fallback key based on the component's index
                const safeKey = component.key || `grid_${results.length + 1}`;
                results.push({
                    ...component,
                    key: safeKey
                });
            }

            // ? Recursively check nested components
            if (component.components)
            {
                this.findDataGridComponents(
                {
                    components: component.components
                }, results);
            }
        }

        return results;
    }

    // ? Recursively finds all FormGrid components in the form definition
    // ? Returns an array of component objects
    static findFormGridComponents(formioData, results = [])
    {
        // ! /// EARLY EXIT ///
        // ! If there is no form data, just return the empty results array
        if (!formioData) return results;

        // ? Adds root-level FormGrids to results
        if (formioData.Grid?.formGrid?.DBTableName)
        {
            results.push({
                DBName: formioData.Grid.formGrid.DBTableName,
                type: 'formgrid',
                key: formioData.Grid.formGrid.key || 'mainFormGrid'  // Use 'mainFormGrid' as fallback for root grid
            });
        }

        // ? Adds nested FormGrids to results
        const components = formioData.components;

        // ! /// EARLY EXIT ///
        // ! If there are no components, just return the current results array
        if (!components) return results;

        for (const component of components)
        {
            // ? Make sure it's a formgrid and not a datagrid
            const isFormGrid = component.DBName && component.IsFormGrid; // ! They're both typed as 'datagrid' in Form.io for some reason...
            
            if (isFormGrid) {
                // ? Look for the View button in the components to get the dialog form table
                let dialogFormTable = null;
                if (component.components) {
                    const viewButton = component.components.find(c => 
                        c.type === 'button' && 
                        c.key === 'btn_view' && 
                        c.Form_DBTable
                    );

                    if (viewButton) {
                        dialogFormTable = viewButton.Form_DBTable;
                    }
                }

                // ? Include the dialogFormTable in the component data
                const gridData = {
                    ...component,
                    dialogFormTable: dialogFormTable
                };

                results.push(gridData);
                continue;
            }

            if (isFormGrid)
            {
                // ? Make sure we always have a valid key
                // ! If the key is missing, generate a fallback key based on the component's index
                const safeKey = component.key || `fg_${results.length + 1}`;
                results.push({
                    ...component,
                    key: safeKey
                });
            }

            // ? Recursively check nested components
            if (component.components)
            {
                this.findFormGridComponents(
                {
                    components: component.components
                }, results);
            }
        }

        return results;
    }

    // ? Generates XML Expression Bindings for a given component field based on its type
    // ? Returns a string
    // ! I believe this is deprecated now, since we pass in the full expression in the component definitions.
    // TODO: Investigate this! If it's not needed, remove it. Maybe it's used as a fallback?
    static getTypeCastedFieldExpression(component)
    {
        const key = Utils.escapeXml(component.key);
        switch (component.type)
        {
            case 'datetime':
                return `Iif(IsNullOrEmpty([${key}]), '', FormatString('{0:g}', [${key}]))`;
            case 'number':
                if (component.decimalLimit)
                {
                    return `Iif(IsNullOrEmpty([${key}]), '', FormatString('{0:N${component.decimalLimit}}', [${key}]))`;
                }
                return `Iif(IsNullOrEmpty([${key}]), '', [${key}])`;
            case 'checkbox':
                return `Iif(IsNullOrEmpty([${key}]), False, ToBoolean([${key}]))`;
            case 'select':
            case 'radio':
                return `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`;
            default:
                return `Iif(IsNullOrEmpty([${key}]), '', ToString([${key}]))`;
        }
    }

    // ? Determines if a component is visible based on its own properties and its parent's visibility
    static isComponentVisible(component, parentVisible = true)
    {
        // ? If parent is hidden, this component is hidden regardless of its own visibility
        if (!parentVisible) return false;

        // ? Check this component's "hidden" property
        if (component.hidden === true) return false;

        // ? Check if this component conditionally hidden based on simple visibility
        // ! This ASSUMES that if there is simple conditional logic, it should be hidden on the report
        //if (component.conditional?.when && component.conditional.show === false) return false;

        return true;
    }

    static handlers = {
        panel: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Check both the panel's visibility and parent's visibility
            const isVisible = DevExpressConverter.isComponentVisible(component, context.parentVisible);
            if (!isVisible)
            {
                console.log(`Skipping hidden panel/fieldset: ${component.key}`);
                return '';
            }

            console.log(`Processing panel/fieldset: ${component.key}`,
            {
                type: component.type,
                hasComponents: Boolean(component.components),
                componentCount: component.components?.length,
                currentContext:
                {
                    ...context,
                    parentVisible: isVisible
                }
            });

            const panelItemNum = context.itemCounter++;
            const headerHeight = component.label ? context.LAYOUT.LABEL_HEIGHT : 0;

            // Create a nested context that inherits visibility from this panel
            const nestedContext = {
                ...context,
                parentVisible: isVisible,
                getNextRef: FieldGenerator.getNextRef,
                itemCounter: 1  // Reset item counter for panel children
            };

            const contentHeight = component.components?.length ?
                context.calculateNestedHeight(component.components, nestedContext) : 0;
            const totalHeight = headerHeight + contentHeight + (context.LAYOUT.VERTICAL_SPACING * 2);

            return DevExpressDefinitions.templates.panel.template(
                component,
                nestedContext,
                {
                    panelItemNum,
                    componentWidth,
                    totalHeight,
                    xOffset,
                    currentY,
                    nestedContext
                }
            );
        },

        fieldset: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            return DevExpressConverter.handlers.panel(component, itemNum, ref, componentWidth, xOffset, currentY, context);
        },

        table: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                escapeXml: Utils.escapeXml
            };

            return DevExpressDefinitions.templates.table.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        XRTable: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.table.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },
        columns: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Check visibility of the columns container
            if (!DevExpressConverter.isComponentVisible(component)) return '';

            // Get visible columns only
            const visibleColumns = component.columns.filter(col =>
                DevExpressConverter.isComponentVisible(col));

            if (visibleColumns.length === 0) return '';

            // Calculate height based on visible columns only
            const columnsHeight = Math.max(...visibleColumns.map(col =>
                col.components ? context.calculateNestedHeight(col.components.filter(c =>
                    DevExpressConverter.isComponentVisible(c))) : 0
            )) || context.LAYOUT.INPUT_HEIGHT;

            const tableItemNum = context.itemCounter++;

            // Use full available width or specified component width
            const containerWidth = componentWidth || context.LAYOUT.PAGE_WIDTH - (context.LAYOUT.MARGIN * 2);

            // Calculate column weights based on Form.io width property or equal distribution
            const columnWeights = [];
            const totalDefinedWidth = visibleColumns.reduce((sum, col) => sum + (col.width || 0), 0);

            if (totalDefinedWidth > 0)
            {
                visibleColumns.forEach((col, index) =>
                {
                    columnWeights[index] = col.width || (100 / visibleColumns.length);
                });
            }
            else
            {
                const equalWeight = 100 / visibleColumns.length;
                visibleColumns.forEach((_, index) =>
                {
                    columnWeights[index] = equalWeight;
                });
            }

            // Calculate column widths based on weights
            const columnWidths = columnWeights.map(weight => containerWidth * (weight / 100));

            const newContext = {
                ...context,
                getNextRef: FieldGenerator.getNextRef,
                columnsHeight,
                isComponentVisible: DevExpressConverter.isComponentVisible
            };

            return DevExpressDefinitions.templates.columns.template(
                component,
                newContext,
                {
                    itemNum: tableItemNum,
                    componentWidth: containerWidth,
                    xOffset,
                    currentY,
                    visibleColumns,
                    columnWeights,
                    columnWidths
                }
            );
        },

        datagrid: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.datagrid.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        }, 
        
        // Input Components      
        textfield: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef,
                getTypeCastedFieldExpression: DevExpressConverter.getTypeCastedFieldExpression
            };

            return DevExpressDefinitions.templates.textfield.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        number: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Set type explicitly and pass to textfield handler
            component.fieldType = 'number';
            return DevExpressConverter.handlers.textfield(component, itemNum, ref, componentWidth, xOffset, currentY, context);
        },

        textarea: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Set type explicitly and pass to textfield handler
            component.fieldType = 'textarea';
            return DevExpressConverter.handlers.textfield(component, itemNum, ref, componentWidth, xOffset, currentY, context);
        },

        email: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Set type explicitly and pass to textfield handler
            component.fieldType = 'email';
            return DevExpressConverter.handlers.textfield(component, itemNum, ref, componentWidth, xOffset, currentY, context);
        },
        checkbox: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.checkbox.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        select: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            return DevExpressConverter.handlers.textfield(component, itemNum, ref, componentWidth, xOffset, currentY, context);
        },

        datetime: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.datetime.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        // Misc Components
        htmlelement: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            const newContext = {
                ...context,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.htmlelement.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        XRPictureBox: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.picturebox.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        XRPageBreak: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.pagebreak.template(
                component,
                newContext,
                {
                    itemNum,
                    xOffset,
                    currentY
                }
            );
        },

        XRRichText: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.richtext.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

        XRBarCode: (component, itemNum, ref, componentWidth, xOffset, currentY, context) =>
        {
            // Use the passed itemNum parameter instead of redeclaring it
            const newContext = {
                ...context,
                itemCounter: context.itemCounter++,
                getNextRef: FieldGenerator.getNextRef
            };

            return DevExpressDefinitions.templates.barcode.template(
                component,
                newContext,
                {
                    itemNum,
                    componentWidth,
                    xOffset,
                    currentY
                }
            );
        },

    };

    static core = {
        processComponent(component, itemNum, ref, componentWidth, xOffset, currentY, parentWidth = componentWidth, parentVisible = true)
        {
            // First check visibility using updated rules
            const isVisible = DevExpressConverter.isComponentVisible(component, parentVisible);

            // Return empty string for hidden components
            if (!isVisible)
            {
                return '';
            }

            const handler = DevExpressConverter.handlers[component.type];
            if (handler)
            {
                // Pass visibility state through context
                const context = {
                    itemCounter: itemNum,
                    escapeXml: Utils.escapeXml,
                    LAYOUT,
                    TABLE_LAYOUT,
                    calculateNestedHeight: (comps) =>
                    {
                        // Only calculate height for visible components
                        const visibleComps = (comps || []).filter(c => DevExpressConverter.isComponentVisible(c, isVisible));
                        return DevExpressConverter.core.calculateNestedHeight(visibleComps);
                    },
                    processNestedComponents: (nestedComps, nestedRef, nestedWidth, nestedXOffset, nestedYOffset) =>
                    {
                        return DevExpressConverter.core.processNestedComponents(
                            nestedComps,
                            nestedRef,
                            nestedWidth,
                            nestedXOffset,
                            nestedYOffset,
                            true
                        );
                    },
                    generateLabel: DevExpressConverter.core.generateLabel,
                    generatePanelContent: DevExpressConverter.core.generatePanelContent,
                    generateControl: DevExpressConverter.core.generateControl,
                    generateControls: DevExpressConverter.core.generateControls,
                    parentWidth: parentWidth,
                    parentVisible: isVisible // Pass down current visibility state
                };
                return handler(component, itemNum, ref, componentWidth, xOffset, currentY, context);
            }

            // Default handler 
            return DevExpressConverter.core.generateControl(component,
            {
                escapeXml: Utils.escapeXml,
                LAYOUT
            });
        },

        calculateComponentHeight(component, parentVisible = true)
        {
            // Return 0 height for hidden components
            if (!DevExpressConverter.isComponentVisible(component, parentVisible))
            {
                return 0;
            }

            switch (component.type)
            {
                case 'panel':
                case 'fieldset':
                {
                    const padding = LAYOUT.VERTICAL_SPACING * 2;
                    const headerHeight = component.label ? LAYOUT.LABEL_HEIGHT : 0;
                    // Only calculate height for visible components
                    const contentHeight = component.components?.length ?
                        DevExpressConverter.core.calculateNestedHeight(
                            component.components.filter(c => DevExpressConverter.isComponentVisible(c, true)),
                            true
                        ) : 0;
                    return headerHeight + contentHeight + padding;
                }
                case 'columns':
                {
                    // Only consider visible columns
                    const visibleColumns = (component.columns || []).filter(col =>
                        DevExpressConverter.isComponentVisible(col, true));

                    // Calculate max height among visible columns with visible components
                    const columnHeights = visibleColumns.map(col =>
                    {
                        const visibleComponents = (col.components || []).filter(c =>
                            DevExpressConverter.isComponentVisible(c, DevExpressConverter.isComponentVisible(col)));
                        return DevExpressConverter.core.calculateNestedHeight(visibleComponents, true);
                    });

                    return columnHeights.length ? Math.max(...columnHeights) : 0;
                }
                case 'checkbox':
                    return LAYOUT.INPUT_HEIGHT;
                default:
                    return LAYOUT.LABEL_HEIGHT + LAYOUT.INPUT_HEIGHT + LAYOUT.VERTICAL_SPACING;
            }
        },

        calculateNestedHeight(components, parentVisible = true)
        {
            if (!components) return 0;

            // Only calculate heights for visible components
            return components.reduce((total, component) =>
            {
                // Skip hidden components
                if (!DevExpressConverter.isComponentVisible(component, parentVisible))
                {
                    return total;
                }

                switch (component.type)
                {
                    case 'panel':
                    case 'fieldset':
                    {
                        const headerHeight = component.label ? LAYOUT.LABEL_HEIGHT + LAYOUT.VERTICAL_SPACING : 0;
                        // Only calculate height for visible nested components
                        const visibleComponents = component.components?.filter(c =>
                            DevExpressConverter.isComponentVisible(c, true)) || [];

                        // Calculate nested components height with proper spacing
                        const innerHeight = visibleComponents.reduce((compTotal, comp) =>
                        {
                            const compHeight = DevExpressConverter.core.calculateComponentHeight(comp, true);
                            // Add extra spacing for nested panels
                            const extraSpacing = (comp.type === 'panel' || comp.type === 'fieldset') ?
                                LAYOUT.VERTICAL_SPACING * 2 : LAYOUT.VERTICAL_SPACING;
                            return compTotal + compHeight + extraSpacing;
                        }, 0);

                        return total + headerHeight + innerHeight + (LAYOUT.VERTICAL_SPACING * 2);
                    }
                    case 'columns':
                    {
                        // Only consider visible columns
                        const visibleColumns = component.columns.filter(col =>
                            DevExpressConverter.isComponentVisible(col, true));

                        // Calculate height for visible components in each visible column
                        const colHeights = visibleColumns.map(col =>
                        {
                            const visibleComponents = (col.components || []).filter(c =>
                                DevExpressConverter.isComponentVisible(c, DevExpressConverter.isComponentVisible(col)));
                            return visibleComponents.length ?
                                DevExpressConverter.core.calculateNestedHeight(visibleComponents, true) : 0;
                        });

                        return total + (colHeights.length ? Math.max(...colHeights) : 0);
                    }
                    case 'checkbox':
                        return total + LAYOUT.INPUT_HEIGHT + LAYOUT.VERTICAL_SPACING;
                    case 'textfield':
                    case 'textarea':
                    case 'number':
                    case 'email':
                    case 'select':
                        return total + LAYOUT.LABEL_HEIGHT + LAYOUT.INPUT_HEIGHT + LAYOUT.VERTICAL_SPACING;
                    default:
                        return total + LAYOUT.INPUT_HEIGHT + LAYOUT.VERTICAL_SPACING;
                }
            }, 0);
        },

        processNestedComponents(components, startRef, parentWidth, xOffset, yOffset = 0, parentVisible = true)
        {
            let currentY = yOffset;

            // Validate input components
            if (!components || !Array.isArray(components))
            {
                console.warn('No components to process or invalid components array');
                return '';
            }

            // Filter and process visible components
            const results = components.map((component) =>
            {
                // Check visibility in context of parent
                if (!DevExpressConverter.isComponentVisible(component, parentVisible))
                {
                    console.log(`Skipping hidden component: ${component.key || 'unnamed'}`);
                    return '';
                }

                console.log(`Processing nested component: ${component.key || 'unnamed'}`,
                {
                    type: component.type,
                    currentY,
                    hasChildren: Boolean(component.components?.length)
                });

                // Calculate component width (percentage or absolute)
                const componentWidth = component.width ?
                    (component.width / 100) * parentWidth :
                    Math.min(parentWidth - (LAYOUT.MARGIN * 2), LAYOUT.DEFAULT_WIDTH);

                // Handle component centering
                const centerOffset = component.width && component.width < 100 ?
                    (parentWidth - componentWidth) / 2 :
                    xOffset;

                // Process the component
                const ref = startRef++;
                const result = this.processComponent(
                    component,
                    DevExpressConverter.state.itemCounter,
                    ref,
                    componentWidth,
                    centerOffset,
                    currentY,
                    parentWidth,
                    true // Component already verified as visible
                );

                // Update vertical position if content was generated
                if (result)
                {
                    const componentHeight = this.calculateComponentHeight(component);
                    currentY += componentHeight + LAYOUT.VERTICAL_SPACING;
                    //console.log(`Component processed, new Y: ${currentY}`);
                }

                return result || '';
            });

            // Filter out empty results and combine
            return results.filter(Boolean).join('\n');
        },

        generateLabel(component, context)
        {
            const labelItemNum = context.itemCounter++;
            return `<Item${labelItemNum} Ref="${context.refCounter++}" ControlType="XRLabel" Name="label_${context.escapeXml(component.key || `field${labelItemNum}`)}"
        Text="${context.escapeXml(component.label || '')}"
        TextAlignment="MiddleLeft"
        SizeF="${context.LAYOUT.PAGE_WIDTH - (context.LAYOUT.MARGIN * 2)},${context.LAYOUT.LABEL_HEIGHT}"
        LocationFloat="0,0"
        Font="Times New Roman, 9.75pt, style=Bold"
        Padding="2,2,0,0,100">
        Borders="None"
        <StylePriority UseFont="false"/>
      </Item${labelItemNum}>`;
        },

        generatePanelContent(component, context)
        {
            if (!component.components || component.components.length === 0)
            {
                return '';
            }

            const width = context.LAYOUT.PAGE_WIDTH - (context.LAYOUT.MARGIN * 2);
            const yOffset = component.label ? context.LAYOUT.LABEL_HEIGHT + context.LAYOUT.VERTICAL_SPACING : 0;

            return context.processNestedComponents(
                component.components,
                DevExpressConverter.state.refCounter++,
                width,
                0,
                yOffset
            );
        },

        generateControl(component, context)
        {
            const width = LAYOUT.DEFAULT_WIDTH;
            const height = LAYOUT.INPUT_HEIGHT;

            return `<Item1 ControlType="XRLabel" Name="${context.escapeXml(component.key || 'label')}"
        Text="${context.escapeXml(component.label || '')}"
        SizeF="${width},${height}"
        LocationFloat="0,0"
        Padding="2,2,0,0,100"
        Font="Times New Roman, 9.75pt, style=Bold">
        <StylePriority UseFont="false" UseBorders="false" UseTextAlignment="false"/>
      </Item1>`;
        },

        generatePanelWithTable(component, itemCounter)
        {
            const context = {
                itemCounter,
                escapeXml: Utils.escapeXml,
                LAYOUT,
                TABLE_LAYOUT,
                calculateNestedHeight: DevExpressConverter.core.calculateNestedHeight,
                processNestedComponents: DevExpressConverter.core.processNestedComponents,
                generateControls: DevExpressConverter.core.generateControls
            };

            return `
        <Item1 ControlType="XRPanel" Name="panel_${context.escapeXml(component.key || `panel${itemCounter}`)}"
          SizeF="${LAYOUT.PAGE_WIDTH - (LAYOUT.MARGIN * 2)},${DevExpressConverter.core.calculateComponentHeight(component)}"
          LocationFloat="0,0"
          Borders="Left, Right, Bottom">
          <Controls>
            <Item1 ControlType="XRTable" Name="table_${context.escapeXml(component.key || `table${itemCounter}`)}"
              SizeF="${LAYOUT.PAGE_WIDTH - (LAYOUT.MARGIN * 2)},${DevExpressConverter.core.calculateComponentHeight(component)}"
              LocationFloat="0,0"
              Padding="2,2,0,0,100"
              Borders="All">
              <Rows>
                <Item1 ControlType="XRTableRow" Name="row_${component.key || `row${itemCounter}`}" Weight="1">
                  <Cells>
                    <Item1 ControlType="XRTableCell" Name="cell_${component.key || `cell${itemCounter}`}" Weight="1">
                      <Controls>
                        ${context.generateControls(component, context)}
                      </Controls>
                    </Item1>
                  </Cells>
                </Item1>
              </Rows>
              <StylePriority UseBorders="false"/>
            </Item1>
          </Controls>
          <StylePriority UseBorders="false"/>
        </Item1>`;
        },

        generateBindings(component)
        {
            return `
        <ExpressionBindings>
          <Item1 EventName="BeforePrint" 
            PropertyName="Text" 
            Expression="[${component.key}]"/>
        </ExpressionBindings>`;
        },

        generateControls(component, context)
        {
            // Use processComponent to generate controls
            return DevExpressConverter.core.processComponent(
                component,
                context.itemCounter,
                FieldGenerator.getNextRef(),
                LAYOUT.PAGE_WIDTH - (LAYOUT.MARGIN * 2),
                LAYOUT.MARGIN,
                0,
                context
            );
        },

        // Generate field label component (bold)
        generateFieldValue(component, itemNum, width, xOffset, yOffset, context, borderStyle = "Bottom")
        {
            const valueItemNum = context.itemCounter++;
            return `<Item${valueItemNum} Ref="${FieldGenerator.getNextRef()}" ControlType="XRLabel"
        Name="${context.escapeXml(component.key || `value${valueItemNum}`)}"
        TextAlignment="MiddleLeft"
        SizeF="${width},${context.LAYOUT.INPUT_HEIGHT}"
        LocationFloat="${xOffset},${yOffset}"
        Padding="2,2,0,0,100"
        Borders="${borderStyle}">
        <ExpressionBindings>
          <Item1 Ref="${FieldGenerator.getNextRef()}"
            EventName="BeforePrint" 
            PropertyName="Text" 
            Expression="${this.getTypeCastedFieldExpression(component)}"/>
        </ExpressionBindings Ref="${FieldGenerator.getNextRef()}" UseBorders="false"/>
      </Item${valueItemNum}>`;
        },
    };

    // ? Generate SubBands for each top-level component
    // ? Returns XML string
    static generateSubBands(components)
    {
        if (!components || components.length === 0)
        {
            // ? Return an empty SubBand with Controls element for validation
            return `
        <Item1 ControlType="SubBand" Name="SubBand1" HeightF="0">
          <Controls></Controls>
        </Item1>`;
        }

        // ? Generate SubBand for each component
        return components.map((component, index) => `
        <Item${index + 1} ControlType="SubBand" Name="SubBand${index + 1}" 
          HeightF="${DevExpressConverter.core.calculateComponentHeight(component)}">
          <Controls>
            ${DevExpressConverter.core.generatePanelWithTable(component, this.state.itemCounter++)}
          </Controls>
        </Item${index + 1}>`).join('\n');
    }

    // ? Main transformation function
    // ? Takes Form.io JSON and returns compressed base64 DevExpress report template
    // ! Throws errors on critical failures, logs warnings for non-critical issues
    static transformToDevExpress(formioData)
    {
        try
        {
            // ? Initialize counters
            DevExpressConverter.initialize();

            // ? Validate input
            if (!formioData)
            {
                throw new Error('No form data provided');
            }

            // ? Log input summary
            if (debugLevel >= 1)
            {
                console.log("transformToDevExpress() called with formData:",
                {
                    formName: formioData.FormName,
                    hasTemplate: Boolean(formioData.FormioTemplate),
                    hasComponents: Boolean(formioData.FormioTemplate?.components?.length)
                });
            }

            // ? Get a minimal valid XML template with the report name
            const xmlTemplateFunc = generateMinimalXmlTemplate();
            let xmlTemplate = xmlTemplateFunc(formioData);

            // ? Log initial XML template size and preview
            if (debugLevel >= 2)
            {
                console.log("XML template generated, length:", xmlTemplate.length);
                console.log("XML preview:", xmlTemplate.substring(0, 200) + "...");
            }

            // ? Clean XML - remove unnecessary whitespace but preserve structure
            // ? Clean and validate XML before compressing
            xmlTemplate = xmlTemplate.replace(/>\s+</g, '><')
                .replace(/\s+>/g, '>')
                .replace(/<\s+/g, '<')
                .replace(/\s{2,}/g, ' ')
                .trim();

            const initialValidation = Utils.validateXmlOutput(xmlTemplate);

            // ? Log initial validation results
            if (debugLevel >= 1)
            {
                console.log("Initial XML validation results:", initialValidation);
            }

            // ? Check for critical errors in initial validation
            if (initialValidation.some(result => result.startsWith("ERROR")))
            {
                const criticalErrors = initialValidation.filter(result => result.startsWith("ERROR"));
                const error = new Error('XML validation failed with critical errors.');
                error.validationErrors = criticalErrors;
                throw error;
            }

            // ? Compress and encode the XML
            let base64Template;
            try
            {
                // ? Convert XML to bytes
                const encoder = new TextEncoder();
                const xmlBytes = encoder.encode(xmlTemplate);

                // ? Compress the XML bytes
                const compressed = pako.gzip(xmlBytes,
                {
                    level: 9
                });

                // ?Convert to base64 string
                const compressedArray = new Uint8Array(compressed);
                let binaryString = '';
                compressedArray.forEach(byte =>
                {
                    binaryString += String.fromCharCode(byte);
                });

                base64Template = btoa(binaryString);

                // ? Log compression results
                if (debugLevel >= 2)
                {
                    console.log('XML compressed successfully, base64 length:', base64Template.length);
                }

                // ? Attempt to decode the template as a final validation
                try
                {
                    const decodedTemplate = Utils.decodeReportTemplate(base64Template);

                    if (!decodedTemplate || !decodedTemplate.content)
                    {
                        console.warn('Warning: Template decoded to empty content - this may cause issues');
                    }
                    else
                    {
                        // ? Log decoded content length
                        if (debugLevel >= 2)
                        {
                            console.log('Template validation successful - decoded content length:', decodedTemplate.content.length);
                        }

                        // ? Look for specific field bindings in the decoded XML to verify fields are present
                        const fieldBindings = decodedTemplate.content.match(/Expression="\[(.*?)\]"/g) || [];

                        if (fieldBindings.length === 0)
                        {
                            console.warn('Warning: No field bindings found in the decoded template');
                        }
                        else
                        {
                            // ? Log number of field bindings found
                            if (debugLevel >= 2)
                            {
                                console.log(`Found ${fieldBindings.length} field bindings in the decoded template`);
                            }
                        }
                    }
                }
                catch (decodeError)
                {
                    console.error('Warning: Could not validate template by decoding:', decodeError);
                    throw new Error('Template decoding validation failed');
                }
            }
            catch (compressionError)
            {
                console.error('Template compression error:', compressionError);
                throw new Error('Failed to compress template');
            } 
            
            // ? Validate the XML before finalizing
            const validationResults = Utils.validateXmlOutput(xmlTemplate);

            // ? Log validation results
            if (debugLevel >= 1)
            {
                console.log("XML validation results:", validationResults);
            }

            // ? Check for critical errors (not just warnings)
            const hasCriticalErrors = validationResults.some(result =>
                result.startsWith("ERROR") && !result.includes("WARNING")
            );

            // ? If critical errors are present, throw with details
            if (hasCriticalErrors)
            {
                const criticalErrors = validationResults.filter(msg => msg.startsWith("ERROR"));
                console.error('Critical XML validation errors found:', criticalErrors);
                const error = new Error('XML validation failed with critical errors.');
                error.validationErrors = criticalErrors;
                throw error;
            }

            // ? Create minimal DevExpress JSON structure
            const departmentName = formioData.DepartmentName || 'FormIO';
            const reportName = formioData.FormName || 'Simple Report';

            return [
            {
                _DepartmentName: departmentName,
                DepartmentName: departmentName,
                ReportFile: "",
                ReportName: reportName,
                isCreateUpdate: null,
                ReportGuid: formioData.FormDefinitionGuid || "00000000-0000-0000-0000-000000000000",
                UserGuid: formioData.UserGuid || "00000000-0000-0000-0000-000000000000",
                DepartmentGuid: formioData.DeparmentGuid || "00000000-0000-0000-0000-000000000000",
                IsPrivate: true,
                Parameters: "",
                ReportTemplate: base64Template,
                isHidden: true,
                Description: reportName,
                IsReportExist: false,
                LastMod: `/Date(${Date.now()})/`,
                ReportType: 2,
                IsDeleted: false
            }];
        }
        catch (error)
        {
            console.error('Error creating DevExpress report:', error);
            throw error;
        }
    }
};

//#endregion

//#region Utility

const Utils = {
    // ? Basic XML escaping
    // ? Returns a string
    escapeXml(unsafe)
    {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    // ? Basic XML validation function
    // ? Returns an array of validation messages
    // ! This is the first layer of validation, and simply checks for valid XML structure. More detailed validation is done in xmlValidator.js
    validateXmlOutput(xml)
    {
        try
        {
            // ? Holds validation messages
            const validationResults = [];

            // ? Check for empty input
            if (!xml || xml.trim() === '')
            {
                return ["ERROR: XML is empty"];
            }

            // ? Clean up any potential formatting issues
            xml = xml.replace(/>\s+</g, '><')   // ? Remove whitespace between tags
                .replace(/\s+>/g, '>')          // ? Remove whitespace before closing bracket
                .replace(/<\s+/g, '<')          // ? Remove whitespace after opening bracket
                .replace(/\s{2,}/g, ' ');       // ? Collapse multiple spaces

            // ? Check basic XML structure
            if (!xml.startsWith('<?xml'))
            {
                validationResults.push("WARNING: Missing XML declaration");
            }

            // ? Check if XML is malformed by parsing with DOMParser
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            const parseError = xmlDoc.getElementsByTagName("parsererror");
            if (parseError.length > 0)
            {
                validationResults.push(`ERROR: XML is malformed. ${parseError[0].textContent}`);
                return validationResults;
            }

            // ? Check for required elements
            const bands = xmlDoc.getElementsByTagName("Bands");
            if (bands.length === 0)
            {
                validationResults.push("ERROR: Missing required <Bands> element");
            }

            // ? Check for DetailBand
            const detailBands = xmlDoc.querySelectorAll("[ControlType='DetailBand']");
            if (detailBands.length === 0)
            {
                validationResults.push("ERROR: Missing DetailBand element");
            }
            else
            {
                validationResults.push(`INFO: Found DetailBand element`);

                // ? Check for Controls within DetailBand
                const controls = detailBands[0].getElementsByTagName("Controls");
                if (controls.length === 0)
                {
                    validationResults.push("ERROR: DetailBand has no Controls element");
                }
                else
                {
                    // ? Check for field elements in Controls
                    const items = controls[0].children;
                    if (items.length === 0)
                    {
                        validationResults.push("WARNING: No field items found in DetailBand Controls");
                    }
                    else
                    {
                        validationResults.push(`INFO: Found ${items.length} control items in DetailBand`);
                    }
                }
            }

            // ? Success if no errors
            if (!validationResults.some(msg => msg.startsWith("ERROR")))
            {
                validationResults.push("SUCCESS: Basic XML validation passed");
            }

            return validationResults;
        }
        catch (error)
        {
            return [`Exception during validation: ${error.message}`];
        }
    },

    // ? Decode and decompress a base64 DevExpress report template
    // ? Returns an object with type, content, and format
    decodeReportTemplate(base64Template)
    {
        try
        {
            // ? Validates that input is a non-empty string
            if (!base64Template)
            {
                console.error('Empty template provided');
                return {
                    type: 'xml',
                    content: '<?xml version="1.0" encoding="utf-8"?><XtraReportsLayoutSerializer/>',
                    format: 'DevExpress XML Report'
                };
            }

            // ? Debug base64 input
            if (debugLevel >= 2)
            {
                console.log('Base64 template length:', base64Template.length);
                console.log('Base64 template start:', base64Template.substring(0, 50));
            }

            // ? Convert base64 to binary array
            const binaryStr = atob(base64Template);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++)
            {
                bytes[i] = binaryStr.charCodeAt(i);
            }

            // ? Debug compressed bytes
            if (debugLevel >= 2)
            {
                console.log('Compressed bytes length:', bytes.length);
                console.log('First few bytes:', Array.from(bytes.slice(0, 10)));
            }

            // ? Decompress with error handling
            let decompressed;
            try
            {
                decompressed = pako.inflate(bytes,
                {
                    to: 'string'
                });
            }
            catch (error)
            {
                console.error('Decompression failed:', error);
                throw error;
            }

            // ? Debug decompressed content
            if (debugLevel >= 2)
            {
                console.log('Decompressed length:', decompressed?.length);
                console.log('Decompressed start:', decompressed?.substring(0, 100));
            }

            // ? Validate XML structure 
            if (!decompressed?.startsWith('<?xml'))
            {
                throw new Error('Invalid XML content');
            }

            return {
                type: 'xml',
                content: decompressed,
                format: 'DevExpress XML Report'
            };

        }
        catch (error)
        {
            console.error('Error decoding template:', error);
            throw error;
        }
    },

    // ? Generate SQL query string for printout procedures
    // ? Returns a string
    // ! This generates basic SQL Stored Procedure create or alter statements for the main form, DataGrids, and FormGrids
    generateSqlQuery(formioData)
    {
        // ? Query Header
        const generateDate = new Date().toLocaleDateString();
        const generateTime = new Date().toLocaleTimeString();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timeZoneAbbr = moment.tz(timeZone).zoneAbbr();

        // ? Parse FormioTemplate if needed
        let formioTemplate;
        if (typeof formioData.FormioTemplate === 'string')
        {
            try
            {
                formioTemplate = JSON.parse(formioData.FormioTemplate);

                if (debugLevel >= 2)
                {
                    console.log('Parsed FormioTemplate:', formioTemplate);
                }
            }
            catch (error)
            {
                console.error('Failed to parse FormioTemplate:', error);
                formioTemplate = {};
            }
        }
        else
        {
            formioTemplate = formioData.FormioTemplate || {};
        }

        // ? Get the table name without [dbo]. or ct_ prefixes
        const fullTableName = formioData.TableName || '[dbo].[DefaultTable]';
        const tableName = fullTableName.replace(/^\[dbo\]\./i, '').replace(/^\[?ct_/i, '');
        const procedureName = `cstm_${tableName.replace(/[\[\]]/g, '')}`;

        // ? Build the SQL string in parts
        let sqlParts = [];

        // ? Main procedure
        // TODO: Add additional handling for joining Nested Form relation tables and adding their FIGUID and OwnerObjectGUID to the select
        sqlParts.push(`
/* MAIN FORM PROCEDURE */
create or alter procedure [${procedureName}_Printout]
  @FormDataGUID uniqueidentifier = null,
  @OwnerObjectGUID uniqueidentifier = null
as
  /*
    This procedure was generated by version ${VERSION_INFO.version} of the Printout From Form tool on ${generateDate} at ${generateTime} ${timeZoneAbbr}
    It is not intended for direct use and should be modified as needed.
  */

  set nocount on;
  select
    ownCon.first
    ,ownCon.last
    ,main.*
  from ${fullTableName} main
  join Contact ownCon with(NOLOCK) on ownCon.ContactGUID = main.__ownerobjectguid
  where main.__forminstanceguid = @FormDataGUID
  and main.__ownerobjectguid = @OwnerObjectGUID
GO`);

        // ? Data grid procedures
        const dataGrids = DevExpressConverter.findDataGridComponents(formioTemplate);
        if (dataGrids.length > 0) {
            dataGrids.forEach(grid => {
                const safeKey = grid.key.replace(/[^a-zA-Z0-9_]/g, '_');
                sqlParts.push(`
/* DATA GRID PROCEDURE: ${grid.key} */
create or alter procedure [${procedureName}_${safeKey}]
  @FormDataGUID uniqueidentifier = null,
  @OwnerObjectGUID uniqueidentifier = null
as
  /*
    This procedure was generated by version ${VERSION_INFO.version} of the Printout From Form tool on ${generateDate} at ${generateTime} ${timeZoneAbbr}
    It is not intended for direct use and should be modified as needed.
  */

  set nocount on;
  select
    ownCon.first
    ,ownCon.last
    ,main.*
    ,${safeKey}.*

  from ${fullTableName} main
  join Contact ownCon with(NOLOCK) on ownCon.ContactGUID = main.__ownerobjectguid
  left join ${grid.DBName} ${safeKey} with(NOLOCK) on ${safeKey}.__forminstanceguid = main.__forminstanceguid
  where main.__forminstanceguid = @FormDataGUID
  and main.__ownerobjectguid = @OwnerObjectGUID
GO`);
            });
        }

        // ? Form grid procedures
        const formGrids = DevExpressConverter.findFormGridComponents(formioTemplate);
        if (formGrids.length > 0) {
            formGrids.forEach(grid => {
                const safeKey = grid.key.replace(/[^a-zA-Z0-9_]/g, '_');
                sqlParts.push(`
/* FORM GRID PROCEDURE: ${grid.key} */
create or alter procedure [${procedureName}_${safeKey}]
  @FormDataGUID uniqueidentifier = null,
  @OwnerObjectGUID uniqueidentifier = null
as
  /*
    This procedure was generated by version ${VERSION_INFO.version} of the Printout From Form tool on ${generateDate} at ${generateTime} ${timeZoneAbbr}
    It is not intended for direct use and should be modified as needed.
  */

  set nocount on;
  select
    ${grid.dialogFormTable ? 'dialog.*' : ''}
  from ${fullTableName} main
  join Contact ownCon with(NOLOCK) on ownCon.ContactGUID = main.__ownerobjectguid
  left join ${grid.DBName} ${safeKey} with(NOLOCK) on ${safeKey}.__forminstanceguid = main.__forminstanceguid
  ${grid.dialogFormTable ? `left join ${grid.dialogFormTable} dialog with(NOLOCK) on dialog.__forminstanceguid = ${safeKey}.[view]` : ''}
  where main.__forminstanceguid = @FormDataGUID
  and main.__ownerobjectguid = @OwnerObjectGUID
GO`);
            });
        }

        // ? Combine all parts into final SQL
        const sql = sqlParts.join('\n\n');

        // ? Update SQL preview
        const previewContainer = document.getElementById('sql-rendered');
        previewContainer.innerHTML = `<code class="language-sql">${sql}</code>`;

        // ? Show output container
        document.getElementById('outputSql').style.display = 'block';

        Prism.highlightAll();

        return sql;
    }
};

const UIHandlers = {
    // ? Initialize "Upload Another" button functionality
    // ! This button simply reloads the page to reset the tool's state
    setupUploadHandlers()
    {
        // ? Setup the "Upload Another" button handler
        const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
        if (uploadAnotherBtn)
        {
            uploadAnotherBtn.addEventListener('click', () =>
            {
                window.location.reload();
            });
        }
    },

    // ? Handle file upload, parse JSON, and generate previews
    // ! This is the main entry point after a user uploads a JSON file
    handleFileUpload(event, createDevExpressPreview)
    {
        // ! /// EARLY EXIT ///
        // ? Validate file input
        const file = event.target.files[0];
        if (!file) return;

        // ? On upload we swap the file upload and the upload another button's visibility
        document.getElementById('initial-upload').style.display = 'none';
        document.getElementById('upload-another').style.display = 'block';
        Init.setupUploadAnotherHandler();

        // ? Reset conversion info display
        const conversionInfo = document.getElementById('conversion-info');
        if (conversionInfo)
        {
            // ? Hide the element
            conversionInfo.style.display = 'none';
            // ? Reset class to default
            conversionInfo.className = 'alert mb-4';
            // ? Clear all content
            const timestamp = conversionInfo.querySelector('.conversion-timestamp');
            const duration = conversionInfo.querySelector('.conversion-duration');
            const warnings = conversionInfo.querySelector('#conversion-warnings ul');
            if (timestamp) timestamp.textContent = '';
            if (duration) duration.textContent = '';
            if (warnings) warnings.innerHTML = '';
            // ? Hide warnings section
            const warningsContainer = conversionInfo.querySelector('#conversion-warnings');
            if (warningsContainer) warningsContainer.style.display = 'none';
        }

        // ? This is for conversion performance metrics
        const startTime = performance.now();
        const startDate = new Date();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timeZoneAbbr = moment.tz(timeZone).zoneAbbr();

        const reader = new FileReader();
        reader.onload = (e) =>
        {
            try
            {
                let jsonData = JSON.parse(e.target.result);

                if (debugLevel >= 1)
                {
                    console.log("File loaded, raw data:",
                    {
                        hasFormioTemplate: Boolean(jsonData.FormioTemplate),
                        templateType: typeof jsonData.FormioTemplate
                    });
                }

                if (jsonData.FormioTemplate)
                {
                    // ? Enable preview tabs
                    // ! These are disabled by default until a valid form is loaded
                    document.querySelector('#preview-tab')?.classList.remove('disabled');
                    document.querySelector('#devexpress-preview-tab')?.classList.remove('disabled');
                    document.getElementById('output-wrapper').style.display = 'block';

                    // ? Parse FormioTemplate if needed
                    let formioTemplate;
                    if (typeof jsonData.FormioTemplate === 'string')
                    {
                        try
                        {
                            formioTemplate = JSON.parse(jsonData.FormioTemplate);

                            // ? Debug logging
                            if (debugLevel >= 1)
                            {
                                console.log("Successfully parsed FormioTemplate:",
                                {
                                    hasComponents: Boolean(formioTemplate.components),
                                    componentCount: formioTemplate.components?.length || 0
                                });
                            }

                            // ? Update the original object with the parsed version
                            jsonData.FormioTemplate = formioTemplate;
                        }
                        catch (error)
                        {
                            console.error("Failed to parse FormioTemplate:", error);
                            formioTemplate = {
                                components: []
                            };
                        }
                    }
                    else
                    {
                        formioTemplate = jsonData.FormioTemplate;
                    }

                    // ? Clean form definition
                    if (formioTemplate.components)
                    {
                        formioTemplate.components = formioTemplate.components.map(c => ComponentCleaner.cleanComponent(c));
                    }

                    // ? Update Form Information section
                    document.getElementById('formTitle').textContent = jsonData.FormName || 'N/A';
                    document.getElementById('departmentName').textContent = jsonData.DepartmentName || 'N/A';
                    document.getElementById('formGuid').textContent = jsonData.FormDefinitionGuid || 'N/A';
                    document.getElementById('componentCount').textContent = DevExpressConverter.countComponents(formioTemplate.components) || '0';
                    document.getElementById('dataSourceCount').textContent = DevExpressConverter.countDataSources(formioTemplate) || '1';

                    // ? Create Form.io preview
                    const formContainer = document.getElementById('formio-rendered');

                    if (formContainer)
                    {
                        Formio.createForm(formContainer, formioTemplate,
                        {
                            readOnly: false,
                            noAlerts: true,
                            sanitize: true
                        }).then(form =>
                        {
                            // ? Debug logging
                            if (debugLevel >= 1)
                            {
                                console.log('Form.io form instance created:', form);
                            }
                        }).catch(err =>
                        {
                            console.error('Error creating Form.io preview:', err);
                            formContainer.innerHTML = `
                <div class="alert alert-danger">
                  Error loading form: ${err.message}
                </div>`;
                        });
                    }

                    // ? Generate DevExpress report
                    DevExpressConverter.state.devExpressJson = DevExpressConverter.transformToDevExpress(jsonData);

                    if (DevExpressConverter.state.devExpressJson)
                    {
                        const devExpressJsonContainer = document.getElementById('devexpress-json');
                        if (devExpressJsonContainer)
                        {
                            devExpressJsonContainer.innerHTML = `<code class="language-json">${JSON.stringify(DevExpressConverter.state.devExpressJson, null, 2)}</code>`;
                            Prism.highlightAll();
                        }

                        // ? When accessing the template for decoding, parse if needed
                        const devExpressData = typeof DevExpressConverter.state.devExpressJson === 'string' ?
                            JSON.parse(DevExpressConverter.state.devExpressJson) :
                            DevExpressConverter.state.devExpressJson;

                        const decodedTemplate = Utils.decodeReportTemplate(devExpressData[0].ReportTemplate);

                        // ? Debug logging
                        if (debugLevel >= 1)
                        {
                            console.log('Decoded template result:',
                            {
                                success: Boolean(decodedTemplate),
                                type: decodedTemplate?.type,
                                contentLength: decodedTemplate?.content?.length,
                                contentStart: decodedTemplate?.content?.substring(0, 100)
                            });
                        }

                        if (decodedTemplate && createDevExpressPreview)
                        {
                            createDevExpressPreview(devExpressData, decodedTemplate);

                            // ? Add DevExpress XML preview with validation
                            const xmlContainer = document.getElementById('devexpress-rendered');

                            if (xmlContainer)
                            {
                                if (!decodedTemplate.content)
                                {
                                    xmlContainer.innerHTML = `<div class="alert alert-danger">No XML content available</div>`;
                                    console.error('XML content missing from decoded template');
                                }
                                else
                                {
                                    // ? Format the XML with proper indentation
                                    const formatXml = (xml) =>
                                    {
                                        let formatted = '';
                                        let indent = '';
                                        const tab = '  '; // ! We define indentation tabs here as 2 spaces

                                        xml.split(/>\s*</).forEach(node =>
                                        {
                                            if (node.match(/^\/\w/))
                                            { // ? Closing tag
                                                indent = indent.substring(tab.length);
                                            }
                                            formatted += indent + '<' + node + '>\r\n';
                                            if (node.match(/^<?\w[^>]*[^\/]$/))
                                            { // ? Opening tag
                                                indent += tab;
                                            }
                                        });

                                        return formatted.substring(1, formatted.length - 2);
                                    };

                                    // ? Set the formatted XML content
                                    xmlContainer.textContent = formatXml(decodedTemplate.content);

                                    // ? Trigger Prism.js highlighting
                                    Prism.highlightElement(xmlContainer);

                                    Prism.highlightAll();
                                }
                            }
                            else
                            {
                                console.error('XML container element not found');
                            }

                            // ? Generate and show SQL preview
                            Utils.generateSqlQuery(jsonData);
                        }
                    }

                    // ? Calculate duration at the end of processing
                    const endTime = performance.now();
                    const duration = endTime - startTime;

                    // ? Show success info
                    UIHandlers.updateConversionInfo(startDate, timeZoneAbbr, duration);
                }
            }
            catch (error)
            {
                console.error('Error processing file:', error);
                UIHandlers.handleError(error);
            }
        };

        reader.readAsText(file);
    },

    // ? Copy DevExpress Report JSON to clipboard
    // ! This copies an unformatted version of the JSON to ensure compatibility (All on one line)
    copyJson()
    {
        if (!DevExpressConverter.state.devExpressJson)
        {
            console.error('No JSON data available');
            return;
        }

        // ? Format as a standard clean JSON without BOM for XML compatibility
        // ! This copies the raw JSON
        const jsonData = DevExpressConverter.state.devExpressJson;
        const formattedJson = JSON.stringify(jsonData);

        navigator.clipboard.writeText(formattedJson)
            .then(() =>
            {
                const btn = document.getElementById('copyJsonBtn');
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy JSON', 2000);
            })
            .catch(err => console.error('Copy failed:', err));
    },

    // ? Download DevExpress Report JSON as a file
    // ! This saves an unformatted version of the JSON to ensure compatibility (All on one line)
    downloadJson()
    {
        if (!DevExpressConverter.state.devExpressJson)
        {
            console.error('No JSON data available');
            return;
        }

        const fileName = `${DevExpressConverter.state.devExpressJson[0].DepartmentName}_${DevExpressConverter.state.devExpressJson[0].ReportName}-REPORT.json`;

        // ? Ensure proper JSON formatting for DevExpress compatibility
        // ? Format as a standard clean JSON without BOM for XML compatibility
        const jsonData = DevExpressConverter.state.devExpressJson;
        const formattedJson = JSON.stringify(jsonData);

        // ? Create blob with explicit UTF-8 encoding and no BOM markers
        const blob = new Blob([formattedJson],
        {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.replace(/\s+/g, '-');
        link.click();
        URL.revokeObjectURL(url);
    },

    // ? Copy DevExpress Report XML to clipboard
    // ! This copies the formatted XML as displayed in the preview
    copyXML()
    {
        const xml = document.getElementById('devexpress-rendered').textContent;
        navigator.clipboard.writeText(xml)
            .then(() =>
            {
                const btn = document.getElementById('copyXmlBtn');
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy XML', 2000);
            })
            .catch(err => console.error('Copy failed:', err));
    },

    // ? Copy SQL query to clipboard
    // ! This copies the formatted SQL as displayed in the preview
    copySQL()
    {
        const sql = document.getElementById('sql-rendered').textContent;
        navigator.clipboard.writeText(sql)
            .then(() =>
            {
                const btn = document.getElementById('copySqlBtn');
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy SQL', 2000);
            })
            .catch(err => console.error('Copy failed:', err));
    },

    // ? Update conversion info section with timestamp, duration, and warnings
    // ! This is called after a successful conversion
    updateConversionInfo(startDate, timeZoneAbbr, duration)
    {
        const conversionInfo = document.getElementById('conversion-info');

        // ? Clear all existing content
        conversionInfo.innerHTML = '';

        // ? Create fresh elements
        const timestamp = document.createElement('div');
        timestamp.className = 'conversion-timestamp';
        const durationEl = document.createElement('div');
        durationEl.className = 'conversion-duration';
        const warningsSection = document.createElement('div');
        warningsSection.id = 'conversion-warnings';
        warningsSection.className = 'mt-3';
        warningsSection.style.display = 'none';
        warningsSection.innerHTML = `
      <hr>
      <h6 class="text-warning"><i class="bi bi-exclamation-triangle"></i> Conversion Warnings</h6>
      <ul class="list-unstyled mb-0"></ul>
    `;

        // ? Add elements to conversion info
        conversionInfo.appendChild(timestamp);
        conversionInfo.appendChild(durationEl);
        conversionInfo.appendChild(warningsSection);

        // ? Set success state
        conversionInfo.className = 'alert alert-success mb-4';
        timestamp.textContent = `File converted on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()} (${timeZoneAbbr})`;
        durationEl.textContent = `Conversion took ${duration.toFixed(2)}ms (${(duration/1000).toFixed(3)} seconds)`;

        // ? Handle warnings if any exist
        if (DevExpressConverter.state.warnings.length > 0)
        {
            warningsList.innerHTML = DevExpressConverter.state.warnings.map(warning =>
            {
                let details = '';
                if (warning.component)
                {
                    details = ` (Component: ${warning.component.label} [${warning.component.type}]${warning.component.key !== '[unnamed]' ? `, Key: ${warning.component.key}` : ''})`;
                }
                return `<li class="mb-2">
                <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                ${warning.message}${details}
            </li>`;
            }).join('');
            warningsSection.style.display = 'block';
        }
        else
        {
            warningsSection.style.display = 'none';
        }

        conversionInfo.style.display = 'block';
    },

    // ? Handle and display errors in the conversion info section
    // ! This is called when an error occurs during processing
    handleError(error)
    {
        const conversionInfo = document.getElementById('conversion-info');

        // ? Clear any existing content first
        conversionInfo.innerHTML = '';
        const timestamp = document.createElement('div');
        timestamp.className = 'conversion-timestamp';
        const duration = document.createElement('div');
        duration.className = 'conversion-duration';
        const warnings = document.createElement('div');
        warnings.id = 'conversion-warnings';
        warnings.className = 'mt-3';
        warnings.innerHTML = `
      <hr>
      <h6 class="text-warning"><i class="bi bi-exclamation-triangle"></i> Conversion Warnings</h6>
      <ul class="list-unstyled mb-0"></ul>
    `;
        warnings.style.display = 'none';

        // ? Append the basic structure
        conversionInfo.appendChild(timestamp);
        conversionInfo.appendChild(duration);
        conversionInfo.appendChild(warnings);

        // ? Create the error content
        const errorDetails = [];
        if (error.validationErrors)
        {
            errorDetails.push(...error.validationErrors);
        }
        if (error.data)
        {
            errorDetails.push(`Additional data: ${JSON.stringify(error.data)}`);
        }

        // ? Create error header
        const errorHeader = document.createElement('div');
        errorHeader.className = 'conversion-header d-flex align-items-center mb-2';
        errorHeader.innerHTML = `
      <i class="bi bi-exclamation-triangle text-danger me-2"></i>
      <strong>Conversion Error</strong>
    `;
        conversionInfo.insertBefore(errorHeader, timestamp);

        // ? Update timestamp and error message
        timestamp.textContent = `Error occurred on ${new Date().toLocaleString()} (${moment.tz(Intl.DateTimeFormat().resolvedOptions().timeZone).zoneAbbr()})`;
        duration.innerHTML = `
      <div class="conversion-error-message">
        ${error.message}
        ${errorDetails.length ? `
          <div class="conversion-error-details mt-2 small">
            <hr>
            <ul class="mb-0 ps-3">
              ${errorDetails.map(detail => `<li>${detail}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

        // ? Set error styles and show
        conversionInfo.className = 'alert alert-danger mb-4';
        conversionInfo.style.display = 'block';

        // ? Still log details for debugging
        console.error('Error details:',
        {
            message: error.message,
            stack: error.stack,
            details: errorDetails,
            rawData: error.rawData
        });
    }
};

//#endregion

//#region Component Cleaning

// ? Strips components and their children of unnecessary properties
// ? Returns cleaned component object
// ! This simplifies the form definition for easier processing and debugging
const ComponentCleaner = {
    cleanComponent(comp)
    {
        // ? Conditional property cleanup
        if (comp.conditional)
        {
            delete comp.conditional;
        }

        // ? Custom conditional cleanup
        if (comp.customConditional)
        {
            delete comp.customConditional;
        }

        // ? If our component has children, clean them too
        // ! This is done recursively to handle nested structures
        if (comp.components)
        {
            comp.components = comp.components.map(c => ComponentCleaner.cleanComponent(c));
        }

        return comp;
    }
};

//#endregion

//#region Field Generation
const FieldGenerator = {
    refCounter: 1,          // ? Start at 1 for main report
    itemCounter: 1,         // ? Start at 1 for numbered items (Item1, Item2, etc.)
    usedRefs: new Set(),    // ? Track used reference numbers

    // ? Initialize or reset both counters
    initRefs()
    {
        this.refCounter = 1;    // ? Always start at 1 for refs
        this.itemCounter = 1;   // ? Always start at 1 for items
        this.usedRefs.clear();  // ? Clear used refs
    },

    // ? Get next sequential reference number
    // ? Returns an integer
    getNextRef()
    {
        const ref = this.refCounter++;
        this.usedRefs.add(ref);

        // ? Debug logging
        if (debugLevel >= 2)
        {
            console.log(`Assigned Ref="${ref}"`);
        }

        return ref;
    },

    // ? Get next sequential item number
    // ? Returns an integer
    getNextItemNum()
    {
        return this.itemCounter++;
    },

    // ? Reserve a specific reference number
    // ! This is used when a specific ref is needed to avoid conflicts
    // ! It does not change the current refCounter, just marks the ref as used
    reserveRef(ref)
    {
        this.usedRefs.add(ref);
    },

    // ? Generate a field based on component type
    // ? Returns a string
    // ! This function routes to specific field generators based on component type
    generateComponentField(component, width, xOffset, yOffset)
    {
        console.log("Generating field for component:", component.key, component.type);
        const key = component.key;
        const label = component.label || component.key;

        // ? Handle specific component types
        switch (component.type)
        {
            case 'checkbox':
                return this.generateCheckbox(key, label, width, xOffset, yOffset);

            case 'datetime':
                return this.generateField(key, label, width, xOffset, yOffset, 'datetime');

            case 'textarea':
            {
                // ? For textareas, use taller input height
                const labelXml = this.generateFieldLabel(key, label, width, xOffset, yOffset);

                // ? Create a taller text field for textarea
                const fieldRef = this.getNextRef();
                const styleRef = this.getNextRef();
                const exprRef = this.getNextRef();

                const fieldValue = `<Item${fieldRef} ControlType="XRLabel" Name="${Utils.escapeXml(key)}"
          SizeF="${width},${LAYOUT.INPUT_HEIGHT * 2}"
          LocationFloat="${xOffset},${yOffset + LAYOUT.LABEL_HEIGHT + 2}"
          TextAlignment="TopLeft"
          Multiline="true"
          Padding="2,2,0,0,100"
          Borders="Bottom">
          <ExpressionBindings>
            <Item1 Ref="${exprRef}" EventName="BeforePrint" PropertyName="Text" Expression="[${Utils.escapeXml(key)}]" />
          </ExpressionBindings>
          <StylePriority Ref="${styleRef}" UseTextAlignment="false" UseBorders="false" />
        </Item${fieldRef}>`;
                console.log("Generated textarea fields:", key);
                return labelXml + fieldValue;
            }

            case 'textfield':

            case 'email':

            case 'number':
            {
                const fieldType = component.type === 'number' ? 'number' : 'text';
                return this.generateField(key, label, width, xOffset, yOffset, fieldType);
            }

            case 'select':
            {
                const labelXml = this.generateFieldLabel(key, label, width, xOffset, yOffset);
                const valueXml = this.generateFieldValue(
                    key,
                    width,
                    xOffset,
                    yOffset + LAYOUT.LABEL_HEIGHT + 2,
                    "Bottom",
                    "text"
                );
                return labelXml + valueXml;
            }

            default:
                return this.generateField(key, label, width, xOffset, yOffset);
        }
    },

    // ? Generate field label element
    // ? Returns a string
    // TODO: Move the XML definition to the template class in dexepxress-definitions.js
    generateFieldLabel(key, label, width, xOffset, yOffset)
    {
        const labelRef = this.getNextRef();
        const styleRef = this.getNextRef();
        const itemNum = this.getNextItemNum();

        return `<Item${itemNum} ControlType="XRLabel" Name="label_${Utils.escapeXml(key || `field${itemNum}`)}"
      Text="${Utils.escapeXml(label || '')}"
      SizeF="${width},${LAYOUT.LABEL_HEIGHT}"
      LocationFloat="${xOffset},${yOffset}"
      TextAlignment="MiddleLeft"
      Font="Times New Roman, 9.75pt, style=Bold"
      Padding="2,2,0,0,100"
      Borders="None">
      <StylePriority Ref="${styleRef}" UseFont="true" UseTextAlignment="false" UseBorders="false" />
    </Item${itemNum}>`;
    },

    // ? Generate field value element
    // ? Returns a string
    // TODO: Move the XML definition to the template class in devexpress-definitions.js
    generateFieldValue(key, width, xOffset, yOffset, borderStyle = "Bottom", fieldType = "text")
    {
        const fieldRef = this.getNextRef();
        const styleRef = this.getNextRef();
        const exprRef = this.getNextRef();

        // ? Helper to get proper type cast
        // TODO: Investigate this function further. I'm almost certain this functionality has been deprecated by pulling the expression bindings from the element definitions
        const getTypeCast = (type, fieldKey) =>
        {
            switch (type)
            {
                case 'datetime':
                    return `ToString(Format(ToDateTime([${Utils.escapeXml(fieldKey)}]), 'g'))`;
                case 'number':
                    return `ToString(Format(ToDecimal([${Utils.escapeXml(fieldKey)}], CultureInfo.InvariantCulture), 'n2'))`;
                case 'boolean':
                    return `IIF(ToBoolean([${Utils.escapeXml(fieldKey)}]), 'Yes', 'No')`;
                default:
                    return `[${Utils.escapeXml(fieldKey)}]`;
            }
        };

        // ? Get expression with proper type casting
        const expression = getTypeCast(fieldType, key);

        // ? Text alignment based on field type  
        const textAlignment = fieldType === 'number' ? "MiddleRight" :
            fieldType === 'textarea' ? "TopLeft" : "MiddleLeft";

        // ? Handle multiline for textareas
        const multilineAttribute = fieldType === 'textarea' ? '\n      Multiline="true"' : '';

        return `<Item${fieldRef} ControlType="XRLabel" Name="${Utils.escapeXml(key || `field${fieldRef}`)}"
      SizeF="${width},${fieldType === 'textarea' ? LAYOUT.INPUT_HEIGHT * 2 : LAYOUT.INPUT_HEIGHT}"
      LocationFloat="${xOffset},${yOffset}"
      TextAlignment="${textAlignment}"${multilineAttribute}
      Padding="2,2,0,0,100"
      Borders="${borderStyle}">
      <ExpressionBindings>
        <Item1 Ref="${exprRef}" EventName="BeforePrint" PropertyName="Text" Expression="${expression}" />
      </ExpressionBindings>
      <StylePriority Ref="${styleRef}" UseTextAlignment="true" UseBorders="false" />
    </Item${fieldRef}>`;
    },

    // ? Generate a checkbox element
    // ? Returns a string
    generateCheckbox(key, label, width, xOffset, yOffset)
    {
        const checkboxRef = this.getNextRef();
        const styleRef = this.getNextRef();
        const exprRef = this.getNextRef();
        const glyphRef = this.getNextRef();

        return `<Item${checkboxRef} ControlType="XRCheckBox" Name="${Utils.escapeXml(key || `checkbox${checkboxRef}`)}"
      Text="${Utils.escapeXml(label || '')}"
      SizeF="${width},${LAYOUT.INPUT_HEIGHT}"
      LocationFloat="${xOffset},${yOffset}"
      Padding="2,2,0,0,100"
      Borders="None">
      <GlyphOptions Ref="${glyphRef}" Size="13,13" />
      <ExpressionBindings>
        <Item1 Ref="${exprRef}" EventName="BeforePrint" PropertyName="CheckState" Expression="IIF(ISNULL([${Utils.escapeXml(key)}], False), False, ToBoolean([${Utils.escapeXml(key)}]))" />
      </ExpressionBindings>
      <StylePriority Ref="${styleRef}" UseBorders="false" UseTextAlignment="true" />
    </Item${checkboxRef}>`;
    },

    // ? Generates a generic Label and Output label pair
    // ? Returns a string
    generateField(key, label, width, xOffset, yOffset, fieldType = "text")
    {
        const labelXml = this.generateFieldLabel(key, label, width, xOffset, yOffset);
        const valueXml = this.generateFieldValue(
            key,
            width,
            xOffset,
            yOffset + LAYOUT.LABEL_HEIGHT + 2,
            "Bottom",
            fieldType
        );

        return labelXml + valueXml;
    }
};

// ? Generates a minimal XML template for DevExpress reports that we can then populate with element nodes
function generateMinimalXmlTemplate()
{
    return (formioData) =>
    {
        const processor = new XMLProcessor();

        // ? Report metadata
        const name = formioData?.FormName || 'Simple Report';
        const reportGuid = formioData?.ReportGuid || '00000000-0000-0000-0000-000000000000';
        const departmentGuid = formioData?.DepartmentGuid || '00000000-0000-0000-0000-000000000000';
        const displayName = Utils.escapeXml(`${name};${name};false;false;${departmentGuid};${reportGuid}`);

        // ? Create root node
        const root = processor.buildNode('XtraReportsLayoutSerializer',
        {
            SerializerVersion: "23.2.5.0",
            ControlType: "DevExpress.XtraReports.UI.XtraReport, DevExpress.XtraReports.v23.2, Version=23.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a",
            Name: "Report",
            DisplayName: displayName,
            Margins: "40, 40, 40, 40",
            PageWidth: "850",
            PageHeight: "1100",
            Version: "23.2",
            DataMember: "Root"
        });

        // ? Build basic structure
        const extensions = processor.buildNode('Extensions',
        {}, [
            processor.createItemNode(1, undefined,
            {
                Key: "DataSerializationExtension",
                Value: "DevExpress.XtraReports.Web.ReportDesigner.DefaultDataSerializer"
            })
        ]);

        const parameters = processor.buildNode('Parameters',
        {}, [
            processor.createItemNode(1, 'Parameter',
            {
                Description: "FormDataGUID",
                Name: "FormDataGUID",
                Type: "#Ref-3",
                ValueInfo: "00000000-0000-0000-0000-000000000000"
            }),
            processor.createItemNode(2, 'Parameter',
            {
                Description: "ObjectGUID",
                Name: "ObjectGUID",
                Type: "#Ref-3",
                ValueInfo: "00000000-0000-0000-0000-000000000000"
            })
        ]);

        // ? Process form components using the ComponentProcessor
        const componentProcessor = new ComponentProcessor(processor);
        componentProcessor.currentY = 10; // ! Start Y position for components. This is essentially the space between the top of the Detail Band and the first element

        const controls = [];
        if (formioData?.FormioTemplate?.components)
        {
            const processedNodes = componentProcessor.processComponents(
                formioData.FormioTemplate.components,
                650,    // ? Default width
                0       // ? Starting X offset
            );
            controls.push(...processedNodes);
        }

        const detailControls = processor.buildNode('Controls',
        {}, controls);

        // ? Build header controls
        const headerControls = processor.buildNode('Controls',
        {}, [
            processor.createItemNode(1, "XRLabel",
            {
                Name: "headerLabel",
                Text: name,
                TextAlignment: "MiddleCenter",
                SizeF: "769.987,30",
                LocationFloat: "0,0",
                Font: "Times New Roman, 14pt, style=Bold",
                Padding: "2,2,0,0,100"
            })
        ]);

        // ? Build bands structure
        const bands = processor.buildNode('Bands',
        {}, [
            processor.createItemNode(1, "TopMarginBand",
            {
                Name: "TopMargin",
                HeightF: "40"
            }),
            processor.createItemNode(2, "ReportHeaderBand",
            {
                Name: "ReportHeader",
                HeightF: "50"
            }),
            processor.createItemNode(3, "DetailBand",
            {
                Name: "Detail",
                HeightF: `${Math.ceil(DevExpressConverter.core.calculateNestedHeight(componentProcessor.components || [])) + (LAYOUT.VERTICAL_SPACING * 2)}` // ? Calculate height including nested components
            }),
            processor.createItemNode(4, "BottomMarginBand",
            {
                Name: "BottomMargin",
                HeightF: "40"
            })
        ]);

        // ? Add controls to their respective bands
        bands.children[1].addChild(headerControls); // ? Add header controls to PageHeaderBand
        bands.children[2].addChild(detailControls); // ? Add detail controls to DetailBand

        // ? Add all main sections to root
        root.addChild(extensions);
        root.addChild(parameters);
        root.addChild(bands);

        // ? Add ParameterPanelLayoutItems
        const parameterPanel = processor.buildNode('ParameterPanelLayoutItems',
        {}, [
            processor.createItemNode(1, "Parameter",
            {
                Parameter: "#Ref-3"
            }),
            processor.createItemNode(2, "Parameter",
            {
                Parameter: "#Ref-4"
            })
        ]);
        root.addChild(parameterPanel);

        // ? Second pass: Assign all references
        processor.assignReferences(root);

        // ? Final pass: Generate XML string with proper formatting and cleanup
        const xmlContent = processor.generateXML(root);
        const finalXml = '<?xml version="1.0" encoding="utf-8"?>\n' + xmlContent;
        return finalXml.replace(/>>+/g, '>').replace(/\s+$/gm, '');

    };
}

//#endregion

//#region Initialization

const Init = {
    // ? Initialize event listeners when DOM is ready
    // ! This ensures all elements are available before attaching handlers
    initToolPrintoutFromForm(createDevExpressPreview)
    {
        if (document.readyState === 'loading')
        {
            document.addEventListener('DOMContentLoaded', () => this.initializeEventListeners(createDevExpressPreview));
        }
        else
        {
            this.initializeEventListeners(createDevExpressPreview);
        }
    },

    // ? Setup handler for "Upload Another" button to reset the form
    // ! This reloads the page to clear all state and allow a new upload
    setupUploadAnotherHandler()
    {
        const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

        if (uploadAnotherBtn)
        {
            uploadAnotherBtn.addEventListener('click', () =>
            {
            console.log('Upload another clicked, reloading page');

            window.location.reload();
            });
        } else { console.warn('Upload another button not found'); }
    },

    // ? Attach event listeners to UI elements
    // ! This is separated for clarity and modularity
    initializeEventListeners(createDevExpressPreview)
    {
        const fileUpload = document.getElementById('fileUpload');
        const copyJsonBtn = document.getElementById('copyJsonBtn');
        const downloadJsonBtn = document.getElementById('downloadJsonBtn');
        const copyXmlBtn = document.getElementById('copyXmlBtn');
        const copySqlBtn = document.getElementById('copySqlBtn');
        const previewTab = document.querySelector('#preview-tab');
        const devexpressPreviewTab = document.querySelector('#devexpress-preview-tab');

        this.setupUploadAnotherHandler();

        if (fileUpload)
        {
            fileUpload.addEventListener('change', event => UIHandlers.handleFileUpload(event, createDevExpressPreview));
        } else { console.warn('File upload element not found'); }

        if (copyJsonBtn)
        {
            copyJsonBtn.addEventListener('click', UIHandlers.copyJson);
        } else { console.warn('Copy JSON button not found'); }

        if (downloadJsonBtn)
        {
            downloadJsonBtn.addEventListener('click', UIHandlers.downloadJson);
        } else { console.warn('Download JSON button not found'); }

        if (copyXmlBtn)
        {
            copyXmlBtn.addEventListener('click', UIHandlers.copyXML);
        } else { console.warn('Copy XML button not found'); }

        if (copySqlBtn)
        {
            copySqlBtn.addEventListener('click', UIHandlers.copySQL);
        } else { console.warn('Copy SQL button not found'); }

        if (previewTab)
        {
            previewTab.classList.add('disabled');
        } else { console.warn('Preview tab element not found'); }

        if (devexpressPreviewTab)
        {
            devexpressPreviewTab.classList.add('disabled');
        } else { console.warn('DevExpress preview tab element not found'); }
    }
};

//#endregion

//#region Exports

export
{
  DevExpressConverter,
  Utils,
  UIHandlers,
  Init,
  FieldGenerator,
  generateMinimalXmlTemplate
};

//#endregion