//#region Imports
import { LAYOUT } from './layoutConfig.js';

import { XMLProcessor } from './xmlProcessor.js';
import { ComponentProcessor } from './componentProcessor.js';

//#endregion

//#region Configuration

// ? Version info is used for generating both XML and SQL
const VERSION_INFO = {
    version: '0.4.4',
    updated: '10/30/2025',
    devexpressVersion: '23.2.5.0'
};

// ? Debugging flags
const debugLevel = 0;       // ? 0: No Logging, 
                            // ? 1: Basic Event Logging, 
                            // ? 2: Detailed Component Processing Logging

// Settings persistence utility
const SettingsManager = {
    SETTINGS_KEY: 'printoutFormSettings',

    saveSettings() {
    const settings = {
            //orientation: document.getElementById('settings_orientation')?.value,
            pageWidth: document.getElementById('settings_pageWidth')?.value,
            marginsLeft: document.getElementById('settings_marginsLeft')?.value,
            marginsRight: document.getElementById('settings_marginsRight')?.value,
            marginsTop: document.getElementById('settings_marginsTop')?.value,
            marginsBottom: document.getElementById('settings_marginsBottom')?.value,
            labelHeight: document.getElementById('settings_labelHeight')?.value,
            outputHeight: document.getElementById('settings_outputHeight')?.value,
            verticalSpacing: document.getElementById('settings_verticalSpacing')?.value,

            fontHeaderFamily: document.getElementById('font_header_family')?.value,
            fontHeaderSize: document.getElementById('font_header_size')?.value,
            fontHeaderBold: document.getElementById('font_header_bold')?.checked,
            fontHeaderItalics: document.getElementById('font_header_italics')?.checked,
            fontHeaderUnderline: document.getElementById('font_header_underline')?.checked,
            fontHeaderStrikethrough: document.getElementById('font_header_strikethrough')?.checked,

            fontSectionFamily: document.getElementById('font_section_family')?.value,
            fontSectionSize: document.getElementById('font_section_size')?.value,
            fontSectionBold: document.getElementById('font_section_bold')?.checked,
            fontSectionItalics: document.getElementById('font_section_italics')?.checked,
            fontSectionUnderline: document.getElementById('font_section_underline')?.checked,
            fontSectionStrikethrough: document.getElementById('font_section_strikethrough')?.checked,

            fontFieldLabelFamily: document.getElementById('font_fieldLabel_family')?.value,
            fontFieldLabelSize: document.getElementById('font_fieldLabel_size')?.value,
            fontFieldLabelBold: document.getElementById('font_fieldLabel_bold')?.checked,
            fontFieldLabelItalics: document.getElementById('font_fieldLabel_italics')?.checked,
            fontFieldLabelUnderline: document.getElementById('font_fieldLabel_underline')?.checked,
            fontFieldLabelStrikethrough: document.getElementById('font_fieldLabel_strikethrough')?.checked,

            fontFieldOutputFamily: document.getElementById('font_fieldOutput_family')?.value,
            fontFieldOutputSize: document.getElementById('font_fieldOutput_size')?.value,
            fontFieldOutputBold: document.getElementById('font_fieldOutput_bold')?.checked,
            fontFieldOutputItalics: document.getElementById('font_fieldOutput_italics')?.checked,
            fontFieldOutputUnderline: document.getElementById('font_fieldOutput_underline')?.checked,
            fontFieldOutputStrikethrough: document.getElementById('font_fieldOutput_strikethrough')?.checked
        };

        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        //console.log('[SettingsManager] Settings saved:', settings);
    },

    loadSettings() {
        const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
        if (!settingsStr) {
            console.warn('[SettingsManager] No saved settings found.');
            return;
        }
        const settings = JSON.parse(settingsStr);
        //console.log('[SettingsManager] Settings loaded:', settings);
        document.getElementById('settings_pageWidth').value = settings.pageWidth || 850;
        document.getElementById('settings_marginsLeft').value = settings.marginsLeft || 50;
        document.getElementById('settings_marginsRight').value = settings.marginsRight || 50;
        document.getElementById('settings_marginsTop').value = settings.marginsTop || 50;
        document.getElementById('settings_marginsBottom').value = settings.marginsBottom || 50;
        document.getElementById('settings_labelHeight').value = settings.labelHeight || 30;
        document.getElementById('settings_outputHeight').value = settings.outputHeight || 30;
        document.getElementById('settings_verticalSpacing').value = settings.verticalSpacing || 10;

        document.getElementById('font_header_family').value = settings.fontHeaderFamily || 'Times New Roman';
        document.getElementById('font_header_size').value = settings.fontHeaderSize || 14;
        document.getElementById('font_header_bold').checked = !!settings.fontHeaderBold;
        document.getElementById('font_header_italics').checked = !!settings.fontHeaderItalics;
        document.getElementById('font_header_underline').checked = !!settings.fontHeaderUnderline;
        document.getElementById('font_header_strikethrough').checked = !!settings.fontHeaderStrikethrough;

        document.getElementById('font_section_family').value = settings.fontSectionFamily || 'Times New Roman';
        document.getElementById('font_section_size').value = settings.fontSectionSize || 11;
        document.getElementById('font_section_bold').checked = !!settings.fontSectionBold;
        document.getElementById('font_section_italics').checked = !!settings.fontSectionItalics;
        document.getElementById('font_section_underline').checked = !!settings.fontSectionUnderline;
        document.getElementById('font_section_strikethrough').checked = !!settings.fontSectionStrikethrough;

        document.getElementById('font_fieldLabel_family').value = settings.fontFieldLabelFamily || 'Times New Roman';
        document.getElementById('font_fieldLabel_size').value = settings.fontFieldLabelSize || 9;
        document.getElementById('font_fieldLabel_bold').checked = !!settings.fontFieldLabelBold;
        document.getElementById('font_fieldLabel_italics').checked = !!settings.fontFieldLabelItalics;
        document.getElementById('font_fieldLabel_underline').checked = !!settings.fontFieldLabelUnderline;
        document.getElementById('font_fieldLabel_strikethrough').checked = !!settings.fontFieldLabelStrikethrough;

        document.getElementById('font_fieldOutput_family').value = settings.fontFieldOutputFamily || 'Times New Roman';
        document.getElementById('font_fieldOutput_size').value = settings.fontFieldOutputSize || 9;
        document.getElementById('font_fieldOutput_bold').checked = !!settings.fontFieldOutputBold;
        document.getElementById('font_fieldOutput_italics').checked = !!settings.fontFieldOutputItalics;
        document.getElementById('font_fieldOutput_underline').checked = !!settings.fontFieldOutputUnderline;
        document.getElementById('font_fieldOutput_strikethrough').checked = !!settings.fontFieldOutputStrikethrough;
    },

    setupAutoSave() {
        // Save settings on change for all relevant fields
        const fields = [
            'settings_orientation', 'settings_pageWidth', 'settings_marginsLeft', 'settings_marginsRight',
            'settings_marginsTop', 'settings_marginsBottom', 'settings_labelHeight', 'settings_outputHeight', 'settings_verticalSpacing',

            'font_header_family', 'font_header_size', 'font_header_bold', 'font_header_italics',
            'font_header_underline', 'font_header_strikethrough',

            'font_section_family', 'font_section_size', 'font_section_bold', 'font_section_italics',
            'font_section_underline', 'font_section_strikethrough',

            'font_fieldLabel_family', 'font_fieldLabel_size', 'font_fieldLabel_bold', 'font_fieldLabel_italics',
            'font_fieldLabel_underline', 'font_fieldLabel_strikethrough',

            'font_fieldOutput_family', 'font_fieldOutput_size', 'font_fieldOutput_bold', 'font_fieldOutput_italics',
            'font_fieldOutput_underline', 'font_fieldOutput_strikethrough'
        ];

        //console.log('[DEBUG] Setting up auto-save for fields:', fields);

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.saveSettings());
            }
        });
    }
};

// Utility to pull settings from the Settings tab
// Auto-load and auto-save settings on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    SettingsManager.loadSettings();
    SettingsManager.setupAutoSave();

    // Apply settings to LAYOUT
    applyLayoutSettingsFromUI();

    // Add reset button handler
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Set all fields to their default values
            //document.getElementById('settings_orientation').value = 'orientation_portrait';
            document.getElementById('settings_pageWidth').value = 850;
            document.getElementById('settings_marginsLeft').value = 50;
            document.getElementById('settings_marginsRight').value = 50;
            document.getElementById('settings_marginsTop').value = 50;
            document.getElementById('settings_marginsBottom').value = 50;
            document.getElementById('settings_labelHeight').value = 30;
            document.getElementById('settings_outputHeight').value = 30;
            document.getElementById('settings_verticalSpacing').value = 10;

            document.getElementById('font_header_family').value = 'Times New Roman';
            document.getElementById('font_header_size').value = 14;
            document.getElementById('font_header_bold').checked = true;
            document.getElementById('font_header_italics').checked = false;
            document.getElementById('font_header_underline').checked = false;
            document.getElementById('font_header_strikethrough').checked = false;

            document.getElementById('font_section_family').value = 'Times New Roman';
            document.getElementById('font_section_size').value = 11;
            document.getElementById('font_section_bold').checked = true;
            document.getElementById('font_section_italics').checked = false;
            document.getElementById('font_section_underline').checked = false;
            document.getElementById('font_section_strikethrough').checked = false;

            document.getElementById('font_fieldLabel_family').value = 'Times New Roman';
            document.getElementById('font_fieldLabel_size').value = 9;
            document.getElementById('font_fieldLabel_bold').checked = true;
            document.getElementById('font_fieldLabel_italics').checked = false;
            document.getElementById('font_fieldLabel_underline').checked = false;
            document.getElementById('font_fieldLabel_strikethrough').checked = false;

            document.getElementById('font_fieldOutput_family').value = 'Times New Roman';
            document.getElementById('font_fieldOutput_size').value = 9;
            document.getElementById('font_fieldOutput_bold').checked = false;
            document.getElementById('font_fieldOutput_italics').checked = false;
            document.getElementById('font_fieldOutput_underline').checked = false;
            document.getElementById('font_fieldOutput_strikethrough').checked = false;

            SettingsManager.saveSettings();
            console.log('[SettingsManager] Settings reset to defaults.');
        });
    }

    // Add apply settings button handler
    const applyBtn = document.getElementById('applySettingsBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            SettingsManager.saveSettings();
            applyLayoutSettingsFromUI();
            // Use the most up-to-date form data reference
            const formData = window.currentFormioData || window.lastUploadedForm;
            if (formData) {
                DevExpressConverter.applySettings();
                DevExpressConverter.initialize();
                // Generate DevExpress report output
                const devExpressJson = DevExpressConverter.transformToDevExpress(formData);
                DevExpressConverter.state.devExpressJson = devExpressJson;

                // Update DevExpress JSON preview
                const devExpressJsonContainer = document.getElementById('devexpress-json');
                if (devExpressJsonContainer) {
                    devExpressJsonContainer.innerHTML = `<code class="language-json">${JSON.stringify(devExpressJson, null, 2)}</code>`;
                    Prism.highlightAll();
                }

                // Regenerate SQL preview
                Utils.generateSqlQuery(formData);

                if (window.showToast) {
                    window.showToast('Settings applied and printout regenerated.', 'success');
                }
                //console.log('[SettingsManager] Settings applied and printout regenerated.');
            } else {
                if (window.showToast) {
                    window.showToast('No form uploaded. Cannot regenerate printout.', 'warning');
                }
                //console.warn('[SettingsManager] No form uploaded. Cannot regenerate printout.');
            }
        });
    }
});

function applyLayoutSettingsFromUI() {
    // Get the Page Width field value
    const pageWidthInput = document.getElementById('settings_pageWidth');
    const marginLeftInput = document.getElementById('settings_marginsLeft');
    const marginRightInput = document.getElementById('settings_marginsRight');
    const marginTopInput = document.getElementById('settings_marginsTop');
    const marginBottomInput = document.getElementById('settings_marginsBottom');
    const labelHeightInput = document.getElementById('settings_labelHeight');
    const outputHeightInput = document.getElementById('settings_outputHeight');
    const verticalSpacingInput = document.getElementById('settings_verticalSpacing');

    const fontHeaderFamilyInput = document.getElementById('font_header_family');
    const fontHeaderSizeInput = document.getElementById('font_header_size');
    const fontHeaderBoldInput = document.getElementById('font_header_bold');
    const fontHeaderItalicsInput = document.getElementById('font_header_italics');
    const fontHeaderUnderlineInput = document.getElementById('font_header_underline');
    const fontHeaderStrikethroughInput = document.getElementById('font_header_strikethrough');

    const fontSectionFamilyInput = document.getElementById('font_section_family');
    const fontSectionSizeInput = document.getElementById('font_section_size');
    const fontSectionBoldInput = document.getElementById('font_section_bold');
    const fontSectionItalicsInput = document.getElementById('font_section_italics');
    const fontSectionUnderlineInput = document.getElementById('font_section_underline');
    const fontSectionStrikethroughInput = document.getElementById('font_section_strikethrough');

    const fontFieldLabelFamilyInput = document.getElementById('font_fieldLabel_family');
    const fontFieldLabelSizeInput = document.getElementById('font_fieldLabel_size');
    const fontFieldLabelBoldInput = document.getElementById('font_fieldLabel_bold');
    const fontFieldLabelItalicsInput = document.getElementById('font_fieldLabel_italics');
    const fontFieldLabelUnderlineInput = document.getElementById('font_fieldLabel_underline');
    const fontFieldLabelStrikethroughInput = document.getElementById('font_fieldLabel_strikethrough');

    const fontFieldOutputFamilyInput = document.getElementById('font_fieldOutput_family');
    const fontFieldOutputSizeInput = document.getElementById('font_fieldOutput_size');
    const fontFieldOutputBoldInput = document.getElementById('font_fieldOutput_bold');
    const fontFieldOutputItalicsInput = document.getElementById('font_fieldOutput_italics');
    const fontFieldOutputUnderlineInput = document.getElementById('font_fieldOutput_underline');
    const fontFieldOutputStrikethroughInput = document.getElementById('font_fieldOutput_strikethrough');

    // Update LAYOUT constants
    LAYOUT.PAGE_WIDTH = parseFloat(pageWidthInput.value);
    LAYOUT.MARGIN_LEFT = parseFloat(marginLeftInput.value);
    LAYOUT.MARGIN_RIGHT = parseFloat(marginRightInput.value);
    LAYOUT.MARGIN_TOP = parseFloat(marginTopInput.value);
    LAYOUT.MARGIN_BOTTOM = parseFloat(marginBottomInput.value);
    LAYOUT.LABEL_HEIGHT = parseFloat(labelHeightInput.value);
    window.LAYOUT.INPUT_HEIGHT = parseFloat(outputHeightInput.value);
    LAYOUT.VERTICAL_SPACING = parseFloat(verticalSpacingInput.value);

    // Build style string for header font
    let headerStyles = [];
    if (fontHeaderBoldInput.checked) headerStyles.push('Bold');
    if (fontHeaderItalicsInput.checked) headerStyles.push('Italic');
    if (fontHeaderUnderlineInput.checked) headerStyles.push('Underline');
    if (fontHeaderStrikethroughInput.checked) headerStyles.push('Strikeout');
    LAYOUT.FONT_REPORTHEADER = `${fontHeaderFamilyInput.value}, ${fontHeaderSizeInput.value}pt`
        + (headerStyles.length ? `, style=${headerStyles.join(',')}` : '');

    // Build style string for section header font
    let sectionStyles = [];
    if (fontSectionBoldInput.checked) sectionStyles.push('Bold');
    if (fontSectionItalicsInput.checked) sectionStyles.push('Italic');
    if (fontSectionUnderlineInput.checked) sectionStyles.push('Underline');
    if (fontSectionStrikethroughInput.checked) sectionStyles.push('Strikeout');
    LAYOUT.FONT_SECTIONHEADER = `${fontSectionFamilyInput.value}, ${fontSectionSizeInput.value}pt`
        + (sectionStyles.length ? `, style=${sectionStyles.join(',')}` : '');

    // Build style string for field label font
    let fieldLabelStyles = [];
    if (fontFieldLabelBoldInput.checked) fieldLabelStyles.push('Bold');
    if (fontFieldLabelItalicsInput.checked) fieldLabelStyles.push('Italic');
    if (fontFieldLabelUnderlineInput.checked) fieldLabelStyles.push('Underline');
    if (fontFieldLabelStrikethroughInput.checked) fieldLabelStyles.push('Strikeout');
    LAYOUT.FONT_FIELDLABEL = `${fontFieldLabelFamilyInput.value}, ${fontFieldLabelSizeInput.value}pt`
        + (fieldLabelStyles.length ? `, style=${fieldLabelStyles.join(',')}` : '');

    // Build style string for field output font
    let fieldOutputStyles = [];
    if (fontFieldOutputBoldInput.checked) fieldOutputStyles.push('Bold');
    if (fontFieldOutputItalicsInput.checked) fieldOutputStyles.push('Italic');
    if (fontFieldOutputUnderlineInput.checked) fieldOutputStyles.push('Underline');
    if (fontFieldOutputStrikethroughInput.checked) fieldOutputStyles.push('Strikeout');
    LAYOUT.FONT_FIELDOUTPUT = `${fontFieldOutputFamilyInput.value}, ${fontFieldOutputSizeInput.value}pt`
        + (fieldOutputStyles.length ? `, style=${fieldOutputStyles.join(',')}` : '');

    //console.log('[Settings] Applied:', LAYOUT);
}

//#endregion

//#region Core

class DevExpressConverter
{
    // Call this at the start of the conversion process
    static applySettings() {
        applyLayoutSettingsFromUI();
    }

    // ? Holds state information between function calls
    static state = {
        devExpressJson: null,   // ? For storing the generated JSON
        warnings: []            // ? For storing conversion warnings
    };

    static initialize()
    {
        this.state.devExpressJson = null;   // ? Reset generated JSON
        this.state.warnings = [];           // ? Reset warnings
        //FieldGenerator.initRefs();          // ? Reset ref and item counters at start
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
                key: formioData.Grid.formGrid.key || 'mainFormGrid'
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
                getNextRef: XMLProcessor.currentRef,
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
                getNextRef: XMLProcessor.currentRef
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
            )) || context.window.LAYOUT.INPUT_HEIGHT;

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
                getNextRef: XMLProcessor.currentRef,
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef,
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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
                getNextRef: XMLProcessor.currentRef
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

    // ? Main transformation function
    // ? Takes Form.io JSON and returns compressed base64 DevExpress report template
    // ! Throws errors on critical failures, logs warnings for non-critical issues
    static transformToDevExpress(formioData)
    {
        try
        {
            // ? Apply settings from UI before initializing
            DevExpressConverter.applySettings();
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

                // Store the uploaded form globally for regeneration
                window.lastUploadedForm = jsonData;

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
                    // ? Enable preview and settings tabs
                    // ! These are disabled by default until a valid form is loaded
                    document.querySelector('#preview-tab')?.classList.remove('disabled');
                    document.querySelector('#devexpress-preview-tab')?.classList.remove('disabled');
                    document.querySelector('#settings-tab')?.classList.remove('disabled');
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

                    // ? Pre-process: Hoist grids and subforms out of containers
                    ComponentCleaner.hoistGridsAndSubforms(formioTemplate);
                    
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
    },

    // ? Hoists DataGrids, EditGrids, Subforms, and Forms out of container components
    // ! This is done to prevent a common issue with the band splitting process we do later
    hoistGridsAndSubforms(formJson) {
        // ! EARLY EXIT
        // ? Validate input
        if (!formJson || !Array.isArray(formJson.components)) return formJson;

        //console.warn('[hoistGridsAndSubforms] Starting hoisting process');
        //console.warn('[hoistGridsAndSubforms] Original JSON:', JSON.stringify(formJson, null, 2));

        // ? Containers to handle
        const containerTypes = ['panel', 'fieldset', 'well', 'columns', 'tabs'];
        // ? Element types to hoist
        const hoistTypes = ['datagrid', 'nestedsubform'];


        // Helper: recursively flatten containers, hoisting grids/subforms to root and preserving order
        function flattenComponents(arr, rootArr) {
            if (!Array.isArray(arr)) return [];
            let result = [];
            for (let comp of arr) {
                if (hoistTypes.includes((comp.type || '').toLowerCase())) {
                    // Hoist to root
                    result.push({ hoist: true, comp });
                } else if (containerTypes.includes((comp.type || '').toLowerCase()) && Array.isArray(comp.components)) {
                    // Flatten container: replace with its children (recursively)
                    const flattened = flattenComponents(comp.components, rootArr);
                    result = result.concat(flattened);
                } else {
                    // Keep as-is
                    result.push({ hoist: false, comp });
                }
            }
            return result;
        }

        // Flatten the top-level components array
        const flattened = flattenComponents(formJson.components, formJson.components);
        // Rebuild root array: non-hoisted in order, then hoisted in order at their original positions
        const newRoot = [];
        flattened.forEach(item => {
            if (item.hoist) {
                //console.warn(`[hoistGridsAndSubforms] Hoisting '${getLabelOrKey(item.comp)}' (type: ${item.comp.type}) to root level.`);
                newRoot.push(item.comp);
            } else {
                newRoot.push(item.comp);
            }
        });
        formJson.components = newRoot;

        //console.warn('[hoistGridsAndSubforms] Hoisting complete. Hoisted JSON:', JSON.stringify(formJson, null, 2));
        return formJson;
    }
};

//#endregion

//#region Generation

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
            SnapGridSize: "10.0",
            Margins: `${LAYOUT.MARGIN_LEFT}, ${LAYOUT.MARGIN_RIGHT}, ${LAYOUT.MARGIN_TOP}, ${LAYOUT.MARGIN_BOTTOM}`,
            PaperKind: "Custom",
            PageWidth: `${LAYOUT.PAGE_WIDTH}`,
            PageHeight: `${LAYOUT.PAGE_HEIGHT}`,
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
        // Initialize component groups array at a higher scope
        const componentGroups = [];
        let currentGroup = [];

        if (formioData?.FormioTemplate?.components)
        {
            // Process components and collect grid markers
            const processedNodes = componentProcessor.processComponents(
                formioData.FormioTemplate.components,
                LAYOUT.DEFAULT_WIDTH,   // ? Default width for components
                0                       // ? Starting X offset
            );

            if (debugLevel >= 2) {
                console.log('Processed components:', processedNodes);
                console.log('Grid markers:', componentProcessor.gridComponents);
                console.log('Nested form markers:', componentProcessor.nestedFormComponents);
                console.log('Starting to process nodes into groups...');
            }
            
            // Improved grouping: split processedNodes into groups at grid markers
            const groups = [];
            let currentComponents = [];
            let gridIdx = 0;
            processedNodes.forEach((node) => {
                if (node.type === 'grid')
                {
                    console.warn("GRID DETECTED");

                    // If there are components collected, push them as a group
                    if (currentComponents.length > 0) {
                        groups.push({ type: 'components', components: currentComponents.slice(), afterGridIndex: gridIdx - 1 });
                        currentComponents = [];
                    }
                    // Push the grid marker
                    groups.push({ type: 'grid', gridIndex: gridIdx });
                    gridIdx++;
                } 
                else if (node.type === 'nestedsubform')
                {
                    console.warn("NESTEDSUBFORM DETECTED");

                    // If there are components collected, push them as a group
                    if (currentComponents.length > 0) {
                        groups.push({ type: 'components', components: currentComponents.slice(), afterGridIndex: gridIdx - 1 });
                        currentComponents = [];
                    }
                    // Push the nested form marker
                    groups.push({ type: 'nestedForm', component: node });
                } 
                else 
                {
                    console.warn("REGULAR COMPONENT DETECTED. TYPE:", node.type, "NAME:", node.name, "KEY:", node.key);
                    currentComponents.push(node);
                }
            });
            // Push any remaining components after last grid
            if (currentComponents.length > 0) {
                groups.push({ type: 'components', components: currentComponents.slice(), afterGridIndex: gridIdx - 1 });
            }

            // Assign to componentGroups
            componentGroups.length = 0;
            componentGroups.push(...groups);

            // Debug output
            if (debugLevel >= 2) {
                console.log('Final component groups (split at grids):', {
                    totalGroups: componentGroups.length,
                    groups: componentGroups.map(g => ({
                        type: g.type,
                        count: g.type === 'components' ? g.components.length : 'N/A',
                        gridIndex: g.type === 'grid' ? g.gridIndex : 'N/A'
                    }))
                });
            }

            // Add initial components to the main detail band
            if (componentGroups.length > 0 && componentGroups[0].type === 'components') {
                // Reset Y positions for main detail band components
                let detailBandY = LAYOUT.VERTICAL_SPACING;
                componentGroups[0].components.forEach(component => {
                    const locationStr = component.attributes?.LocationFloat;
                    if (locationStr) {
                        const [x, _] = locationStr.split(',').map(Number);
                        const sizeStr = component.attributes?.SizeF;
                        const componentHeight = sizeStr ? 
                            parseInt(sizeStr.split(',')[1]) || window.LAYOUT.INPUT_HEIGHT :
                            window.LAYOUT.INPUT_HEIGHT;
                        component.attributes.LocationFloat = `${x},${detailBandY}`;
                        detailBandY += componentHeight + LAYOUT.VERTICAL_SPACING;
                    }
                });
                controls.push(...componentGroups[0].components);
            } else {
                console.log('No initial components for main detail band');
            }
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
                SizeF: (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) + ",50",
                LocationFloat: "0,0",
                Font: LAYOUT.FONT_REPORTHEADER,
                Padding: "2,2,0,0,100"
            })
        ]);

        // ? Build bands structure
        // Reset item numbering for bands
        processor.currentItemNum = 0;
        
        // Get the grid components that were processed by ComponentProcessor
        const gridComponents = componentProcessor.gridComponents || [];

        // Get the nested form components that were processed by ComponentProcessor
        const nestedFormComponents = componentProcessor.nestedFormComponents || [];
        
        const bandsArray = [
            processor.createItemNode(undefined, "TopMarginBand",
            {
                Name: "TopMargin",
                HeightF: LAYOUT.MARGIN_TOP
            }),
            processor.createItemNode(undefined, "ReportHeaderBand",
            {
                Name: "ReportHeader",
                HeightF: "50"
            }),
            processor.createItemNode(undefined, "DetailBand",
            {
                Name: "Detail",
                HeightF: controls.length > 0 ? 
                    (() => {
                        // Calculate max Y extent of all components
                        let maxY = LAYOUT.VERTICAL_SPACING;
                        controls.forEach(component => {
                            const sizeStr = component.attributes?.SizeF;
                            const locationStr = component.attributes?.LocationFloat;
                            if (sizeStr && locationStr) {
                                const height = parseInt(sizeStr.split(',')[1]) || window.LAYOUT.INPUT_HEIGHT;
                                const y = parseInt(locationStr.split(',')[1]) || 0;
                                maxY = Math.max(maxY, y + height);
                            }
                        });
                        return (maxY + LAYOUT.VERTICAL_SPACING).toString();
                    })() :
                    LAYOUT.VERTICAL_SPACING.toString()
            })
        ];

        // Iterate through componentGroups in order, creating bands for each grid/nestedform and using the next components group for spacer
        for (let i = 0; i < componentGroups.length; i++) {

            const group = componentGroups[i];

            if (group.type === 'grid') 
            {
                const grid = gridComponents[group.gridIndex];
                const gridBaseName = grid.key || `Grid${group.gridIndex + 1}`;

                // Create header band with nested DetailBand
                const headerReport = processor.createItemNode(undefined, "DetailReportBand", {
                    Name: `DetailReport_${gridBaseName}_header`,
                    HeightF: LAYOUT.LABEL_HEIGHT.toString()
                });
                const headerBands = processor.buildNode('Bands', {}, [
                    processor.createItemNode(1, "DetailBand", {
                        Name: `Detail_${gridBaseName}_header`,
                        HeightF: LAYOUT.LABEL_HEIGHT.toString()
                    })
                ]);
                if (grid.headerContent && grid.headerContent.length > 0) {
                    const headerControls = processor.buildNode('Controls', {});
                    grid.headerContent.forEach(component => {
                        if (typeof component === 'string') {
                            headerControls.addChild(processor.parseXml(component));
                        } else {
                            headerControls.addChild(component);
                        }
                    });
                    headerBands.children[0].addChild(headerControls);
                }
                headerReport.addChild(headerBands);
                bandsArray.push(headerReport);

                // Create keys band with nested DetailBand
                const keysReport = processor.createItemNode(undefined, "DetailReportBand", {
                    Name: `DetailReport_${gridBaseName}_keys`,
                    HeightF: window.LAYOUT.INPUT_HEIGHT.toString()
                });
                const keysBands = processor.buildNode('Bands', {}, [
                    processor.createItemNode(1, "DetailBand", {
                        Name: `Detail_${gridBaseName}_keys`,
                        HeightF: window.LAYOUT.INPUT_HEIGHT.toString()
                    })
                ]);
                if (grid.dataContent && grid.dataContent.length > 0) {
                    const keysControls = processor.buildNode('Controls', {});
                    grid.dataContent.forEach(component => {
                        if (typeof component === 'string') {
                            keysControls.addChild(processor.parseXml(component));
                        } else {
                            keysControls.addChild(component);
                        }
                    });
                    keysBands.children[0].addChild(keysControls);
                }
                keysReport.addChild(keysBands);
                bandsArray.push(keysReport);

                // Create spacer band with nested DetailBand
                const spacerReport = processor.createItemNode(undefined, "DetailReportBand", {
                    Name: `DetailReport_${gridBaseName}_spacer`,
                    HeightF: LAYOUT.LABEL_HEIGHT.toString()
                });
                // Use the next components group for spacer
                let nextComponents = [];
                if (i + 1 < componentGroups.length && componentGroups[i + 1].type === 'components') {
                    nextComponents = componentGroups[i + 1].components;
                }
                let maxBandHeight = LAYOUT.VERTICAL_SPACING;
                nextComponents.forEach(component => {
                    const sizeStr = component.attributes?.SizeF;
                    const locationStr = component.attributes?.LocationFloat;
                    if (sizeStr && locationStr) {
                        const height = parseInt(sizeStr.split(',')[1]) || 0;
                        const y = parseInt(locationStr.split(',')[1]) || 0;
                        maxBandHeight = Math.max(maxBandHeight, y + height + LAYOUT.VERTICAL_SPACING);
                    }
                });
                const spacerHeight = nextComponents.length > 0 ? maxBandHeight : 15;
                const spacerBands = processor.buildNode('Bands', {}, [
                    processor.createItemNode(1, "DetailBand", {
                        Name: `Detail_${gridBaseName}_spacer`,
                        HeightF: spacerHeight.toString()
                    })
                ]);
                if (nextComponents.length > 0) {
                    const spacerControls = processor.buildNode('Controls', {});
                    let bandY = LAYOUT.VERTICAL_SPACING;
                    let maxY = LAYOUT.VERTICAL_SPACING;
                    nextComponents.forEach(component => {
                        const locationStr = component.attributes?.LocationFloat;
                        if (locationStr) {
                            const [x, _] = locationStr.split(',').map(Number);
                            const sizeStr = component.attributes?.SizeF;
                            const componentHeight = sizeStr ?
                                parseInt(sizeStr.split(',')[1]) || window.LAYOUT.INPUT_HEIGHT :
                                window.LAYOUT.INPUT_HEIGHT;
                            component.attributes.LocationFloat = `${x},${bandY}`;
                            maxY = Math.max(maxY, bandY + componentHeight);
                            bandY += componentHeight + LAYOUT.VERTICAL_SPACING;
                        }
                        spacerControls.addChild(component);
                    });
                    spacerBands.children[0].addChild(spacerControls);
                    spacerBands.children[0].attributes.HeightF = (maxY + LAYOUT.VERTICAL_SPACING).toString();
                }
                spacerReport.addChild(spacerBands);
                bandsArray.push(spacerReport);
            }
            else if (group.type === 'nestedForm') {
                const nestedForm = group.component;
                const nestedFormBaseName = nestedForm.key || `NestedForm${i + 1}`;

                console.log(`Processing Nested Form: ${nestedFormBaseName}`);

                // Create nested form band
                const nestedFormReport = processor.createItemNode(undefined, "DetailReportBand", {
                    Name: `DetailReport_${nestedFormBaseName}`,
                    HeightF: (nestedForm.height || LAYOUT.INPUT_HEIGHT).toString() // Fallback to INPUT_HEIGHT if height is undefined
                });
                console.log(`Creating nested form band for: ${nestedFormBaseName}`, nestedForm); // Log nestedForm for debugging

                const nestedFormBands = processor.buildNode('Bands', {}, [
                    processor.createItemNode(1, "DetailBand", {
                        Name: `Detail_${nestedFormBaseName}`,
                        HeightF: (nestedForm.height || LAYOUT.INPUT_HEIGHT).toString() // Fallback to INPUT_HEIGHT if height is undefined
                    })
                ]);
                const nestedFormControls = processor.buildNode('Controls', {});

                // Add the subreport element to the nested form band
                const subreportNode = componentProcessor.createSubReportNode(nestedForm, (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT), 0);
                nestedFormControls.addChild(subreportNode);
                nestedFormBands.children[0].addChild(nestedFormControls);
                nestedFormReport.addChild(nestedFormBands);
                bandsArray.push(nestedFormReport);

                // Create post-nested form band
                const postNestedFormReport = processor.createItemNode(undefined, "DetailReportBand", {
                    Name: `DetailReport_${nestedFormBaseName}_postContent`,
                    HeightF: LAYOUT.LABEL_HEIGHT.toString()
                });
                console.log(`Creating post-nested form band for: ${nestedFormBaseName}`);

                // Add post-content components if available
                if (i + 1 < componentGroups.length && componentGroups[i + 1].type === 'components') {
                    const postContentControls = processor.buildNode('Controls', {});
                    const postContentElements = componentGroups[i + 1].components;
                    let currentYOffset = LAYOUT.VERTICAL_SPACING;
                    postContentElements.forEach(component => {
                        if (typeof component !== 'string' && component.attributes) {
                            // Reset Y offset for each component in the new band
                            const height = component.attributes.SizeF ? parseFloat(component.attributes.SizeF.split(',')[1]) : LAYOUT.INPUT_HEIGHT;
                            component.attributes.LocationFloat = `0,${currentYOffset}`;
                            currentYOffset += height + LAYOUT.VERTICAL_SPACING;
                            postContentControls.addChild(component);
                        } else if (typeof component === 'string') {
                            // If string, parse as XML and add (no offset logic)
                            postContentControls.addChild(processor.parseXml(component));
                        }
                    });
                    const postBands = processor.buildNode('Bands', {}, [
                        processor.createItemNode(1, "DetailBand", {
                            Name: `Detail_${nestedFormBaseName}_postContent`,
                            HeightF: LAYOUT.LABEL_HEIGHT.toString()
                        })
                    ]);
                    postBands.children[0].addChild(postContentControls);
                    postNestedFormReport.addChild(postBands);
                }
                bandsArray.push(postNestedFormReport);
            }
        }

        // ? Add BottomMarginBand
        bandsArray.push(
            processor.createItemNode(undefined, "BottomMarginBand",
            {
                Name: "BottomMargin",
                HeightF: LAYOUT.MARGIN_BOTTOM
            })
        );

        const bands = processor.buildNode('Bands', {}, bandsArray);

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
    generateMinimalXmlTemplate
};

//#endregion