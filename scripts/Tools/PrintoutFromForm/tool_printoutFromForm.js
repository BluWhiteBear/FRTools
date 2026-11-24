import { collectGrids, reportProcedureName, quoteSqlIdentifier } from './gridModel.js';
import { encodeReportTemplate, decodeReportTemplate } from './reportCodec.js';
import { placeControlGroup } from './reportLayout.js';
import { normalizeFormExport, childComponents, gridColumns } from './formSchema.js';
import { buildComponentStorage } from './dataSource.js';
import { ComponentCleaner } from './componentCleaner.js';
//#region Imports
import { LAYOUT } from './layoutConfig.js';

import { XMLProcessor } from './xmlProcessor.js';
import { ComponentProcessor } from './componentProcessor.js';

//#endregion

//#region Configuration

// ? Version info is used for generating both XML and SQL
const VERSION_INFO = {
    version: '0.4.7',
    updated: '4/9/2026',
    devexpressVersion: '23.2.5.0'
};

// ? Debugging flags
const debugLevel = 0;       // ? 0: No Logging, 
                            // ? 1: Basic Event Logging, 
                            // ? 2: Detailed Component Processing Logging

function debugLog(level, ...args)
{
    if (debugLevel >= level)
    {
        console.log(...args);
    }
}

function debugWarn(level, ...args)
{
    if (debugLevel >= level)
    {
        console.warn(...args);
    }
}

const ConversionSettings = {
    alignToGrid: false,
    snapGridSize: 10
};

// Settings persistence utility
const SettingsManager = {
    SETTINGS_KEY: 'printoutFormSettings',

    // Save all settings from the UI to localStorage as a JSON string.
    saveSettings()
    {
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
            alignToGrid: document.getElementById('settings_alignToGrid')?.checked,
            snapGridSize: document.getElementById('settings_snapGridSize')?.value,

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
    },

    // Load settings from localStorage and apply them to the UI fields. If no settings are found, defaults will remain in place.
    loadSettings()
    {
        const settingsStr = localStorage.getItem(this.SETTINGS_KEY);

        if (!settingsStr)
        {
            debugWarn(1, '[SettingsManager] No saved settings found.');
            return;
        }

        const settings = JSON.parse(settingsStr);

        document.getElementById('settings_pageWidth').value = settings.pageWidth || 850;
        document.getElementById('settings_marginsLeft').value = settings.marginsLeft || 50;
        document.getElementById('settings_marginsRight').value = settings.marginsRight || 50;
        document.getElementById('settings_marginsTop').value = settings.marginsTop || 50;
        document.getElementById('settings_marginsBottom').value = settings.marginsBottom || 50;
        document.getElementById('settings_labelHeight').value = settings.labelHeight || 30;
        document.getElementById('settings_outputHeight').value = settings.outputHeight || 30;
        document.getElementById('settings_verticalSpacing').value = settings.verticalSpacing || 10;
        document.getElementById('settings_alignToGrid').checked = !!settings.alignToGrid;
        document.getElementById('settings_snapGridSize').value = settings.snapGridSize || 10;

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

    // Export current settings to a JSON file. This allows users to save their configuration and load it later or on another machine.
    exportSettings()
    {
        this.saveSettings();
        const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
        if (!settingsStr) return;
        const blob = new Blob([settingsStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
        a.download = `printout-settings_${ts}.dxs`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Import settings from a JSON file. This will overwrite current settings in localStorage and update the UI fields accordingly. The imported file must be in the same format as the exported settings file.
    importSettings()
    {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dxs';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.addEventListener('load', (ev) => {
                try
                {
                    const settings = JSON.parse(ev.target.result);
                    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
                    this.loadSettings();
                    applyLayoutSettingsFromUI();
                    debugLog(1, '[SettingsManager] Settings imported from file.');
                } 
                catch (err)
                {
                    console.error('[SettingsManager] Failed to parse imported settings file:', err);
                    alert('Invalid settings file. Please select a valid JSON settings file.');
                }
            });
            reader.onerror = () => UIHandlers.handleError(new Error('Unable to read the selected file.'));
        reader.readAsText(file);
        });
        input.click();
    },

    // Set up event listeners on all relevant settings fields to automatically save settings to localStorage whenever a change is made. This ensures that user preferences are preserved without needing to click a separate "Save" button.
    setupAutoSave()
    {
        const fields = [
            'settings_orientation', 'settings_pageWidth', 'settings_marginsLeft', 'settings_marginsRight',
            'settings_marginsTop', 'settings_marginsBottom', 'settings_labelHeight', 'settings_outputHeight', 'settings_verticalSpacing', 'settings_alignToGrid', 'settings_snapGridSize',

            'font_header_family', 'font_header_size', 'font_header_bold', 'font_header_italics',
            'font_header_underline', 'font_header_strikethrough',

            'font_section_family', 'font_section_size', 'font_section_bold', 'font_section_italics',
            'font_section_underline', 'font_section_strikethrough',

            'font_fieldLabel_family', 'font_fieldLabel_size', 'font_fieldLabel_bold', 'font_fieldLabel_italics',
            'font_fieldLabel_underline', 'font_fieldLabel_strikethrough',

            'font_fieldOutput_family', 'font_fieldOutput_size', 'font_fieldOutput_bold', 'font_fieldOutput_italics',
            'font_fieldOutput_underline', 'font_fieldOutput_strikethrough'
        ];

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el)
            {
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

    // Add export settings button handler
    const exportBtn = document.getElementById('exportSettingsBtn');
    if (exportBtn)
    {
        exportBtn.addEventListener('click', () => SettingsManager.exportSettings());
    }

    // Add import settings button handler
    const importBtn = document.getElementById('importSettingsBtn');
    if (importBtn)
    {
        importBtn.addEventListener('click', () => SettingsManager.importSettings());
    }

    // Add reset button handler
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn)
    {
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
            document.getElementById('settings_alignToGrid').checked = false;
            document.getElementById('settings_snapGridSize').value = 10;

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
            debugLog(1, '[SettingsManager] Settings reset to defaults.');
        });
    }

    // Add apply settings button handler
    const applyBtn = document.getElementById('applySettingsBtn');
    if (applyBtn)
    {
        applyBtn.addEventListener('click', () => {
            const conflicts = validateSettingsConflicts();
            if (conflicts.length > 0)
            {
                // Populate and show the conflict modal
                const list = document.getElementById('settingsConflictList');
                list.innerHTML = conflicts.map(c => `<li>${c}</li>`).join('');
                const modalEl = document.getElementById('settingsConflictModal');
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

                // Wire "Apply Anyway" to proceed after dismissing
                const applyAnywayBtn = document.getElementById('settingsConflictApplyAnywayBtn');
                const onApplyAnyway = () => {
                    modal.hide();
                    applyAnywayBtn.removeEventListener('click', onApplyAnyway);
                    doApplySettings();
                };
                applyAnywayBtn.addEventListener('click', onApplyAnyway);

                // Clean up listener if modal is dismissed without applying
                modalEl.addEventListener('hidden.bs.modal', () => {
                    applyAnywayBtn.removeEventListener('click', onApplyAnyway);
                }, { once: true });

                modal.show();
            }
            else
            {
                doApplySettings();
            }
        });
    }
});

// Apply settings to the converter and regenerate the printout preview. This function is called after validating settings and confirming with the user if there are any conflicts. It updates the converter's state, regenerates the DevExpress JSON, updates the preview, and shows any overlap warnings.
function doApplySettings()
{
    try {
    SettingsManager.saveSettings();
    applyLayoutSettingsFromUI();

    const formData = window.currentFormioData || window.lastUploadedForm;
    if (formData)
    {
        DevExpressConverter.applySettings();
        DevExpressConverter.initialize();
        const devExpressJson = DevExpressConverter.transformToDevExpress(formData);
        DevExpressConverter.state.devExpressJson = devExpressJson;

        const devExpressJsonContainer = document.getElementById('devexpress-json');
        if (devExpressJsonContainer)
        {
            devExpressJsonContainer.textContent = JSON.stringify(devExpressJson, null, 2);
            devExpressJsonContainer.classList.add('language-json');
            Prism.highlightAll();
        }

        const devExpressData = typeof devExpressJson === 'string'
            ? JSON.parse(devExpressJson)
            : devExpressJson;

        const decodedTemplate = Utils.decodeReportTemplate(devExpressData?.[0]?.ReportTemplate);
        const previewRenderer = DevExpressConverter.state.createDevExpressPreview;

        if (decodedTemplate && previewRenderer)
        {
            previewRenderer(devExpressData, decodedTemplate);
        }

        const xmlContainer = document.getElementById('devexpress-rendered');
        if (xmlContainer)
        {
            if (!decodedTemplate?.content)
            {
                xmlContainer.innerHTML = `<div class="alert alert-danger">No XML content available</div>`;
            } 
            else 
            {
                xmlContainer.textContent = decodedTemplate.content;
                Prism.highlightElement(xmlContainer);
            }
        }

        Utils.generateSqlQuery(formData);
        showOverlapWarnings();

        if (window.showToast)
        {
            window.showToast('Settings applied and printout regenerated.', 'success');
        }
    } 
    else 
    {
        if (window.showToast)
        {
            window.showToast('No form uploaded. Cannot regenerate printout.', 'warning');
        }
    }
    } catch (error) { UIHandlers.handleError(error); }
}

// Check for any warnings about overlapping fields that were detected during the conversion process. If there are any, populate the warnings modal with the details and display it to the user. This helps users identify potential layout issues in their printout design.
function showOverlapWarnings()
{
    const overlaps = DevExpressConverter.state.overlapWarnings || [];
    if (overlaps.length === 0)
    {
        return;
    }

    const list = document.getElementById('overlapWarningList');
    const modalEl = document.getElementById('overlapWarningModal');
    if (!list || !modalEl)
    {
        return;
    }

    list.innerHTML = overlaps.map(overlap => `<li>${Utils.escapeXml(overlap)}</li>`).join('');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// Validate settings for any conflicts or issues before applying. For example, if "Align to Grid" is enabled, check that all relevant layout values are divisible by the snap grid size. Return an array of conflict messages to display to the user. If there are no conflicts, return an empty array.
function validateSettingsConflicts()
{
    const conflicts = [];

    const alignToGrid = document.getElementById('settings_alignToGrid')?.checked;
    if (!alignToGrid) return conflicts;

    const gridSize = parseFloat(document.getElementById('settings_snapGridSize')?.value) || 10;

    const checks = [
        { id: 'settings_pageWidth',      label: 'Page Width' },
        { id: 'settings_marginsLeft',    label: 'Left Margin' },
        { id: 'settings_marginsRight',   label: 'Right Margin' },
        { id: 'settings_marginsTop',     label: 'Top Margin' },
        { id: 'settings_marginsBottom',  label: 'Bottom Margin' },
        { id: 'settings_labelHeight',    label: 'Label Height' },
        { id: 'settings_outputHeight',   label: 'Output Height' },
        { id: 'settings_verticalSpacing', label: 'Vertical Spacing' },
    ];

    for (const { id, label } of checks) {
        const val = parseFloat(document.getElementById(id)?.value);
        if (!isNaN(val) && val % gridSize !== 0)
        {
            conflicts.push(`${label} (${val}) is not divisible by snap grid size (${gridSize})`);
        }
    }

    return conflicts;
}

// Read all layout and font settings from the UI fields and apply them to the LAYOUT constants and ConversionSettings. This function is called when the user clicks "Apply Settings" after confirming any conflicts. It ensures that the converter uses the latest settings for generating the printout.
function applyLayoutSettingsFromUI()
{
    // Get the Page Width field value
    const pageWidthInput = document.getElementById('settings_pageWidth');
    if (!pageWidthInput) return;
    const marginLeftInput = document.getElementById('settings_marginsLeft');
    const marginRightInput = document.getElementById('settings_marginsRight');
    const marginTopInput = document.getElementById('settings_marginsTop');
    const marginBottomInput = document.getElementById('settings_marginsBottom');
    const labelHeightInput = document.getElementById('settings_labelHeight');
    const outputHeightInput = document.getElementById('settings_outputHeight');
    const verticalSpacingInput = document.getElementById('settings_verticalSpacing');
    const alignToGridInput = document.getElementById('settings_alignToGrid');
    const snapGridSizeInput = document.getElementById('settings_snapGridSize');

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

    const numericSettings = {
        PAGE_WIDTH: Number(pageWidthInput.value), MARGIN_LEFT: Number(marginLeftInput.value),
        MARGIN_RIGHT: Number(marginRightInput.value), MARGIN_TOP: Number(marginTopInput.value),
        MARGIN_BOTTOM: Number(marginBottomInput.value), LABEL_HEIGHT: Number(labelHeightInput.value),
        INPUT_HEIGHT: Number(outputHeightInput.value), VERTICAL_SPACING: Number(verticalSpacingInput.value)
    };
    for (const [key, value] of Object.entries(numericSettings)) {
        if (!Number.isFinite(value) || value < 0 || (['PAGE_WIDTH', 'LABEL_HEIGHT', 'INPUT_HEIGHT'].includes(key) && value === 0)) {
            throw new Error('Invalid layout setting: ' + key);
        }
    }
    if (numericSettings.MARGIN_LEFT + numericSettings.MARGIN_RIGHT >= numericSettings.PAGE_WIDTH) {
        throw new Error('Left and right margins must leave space for report content.');
    }
    Object.assign(LAYOUT, numericSettings);
    ConversionSettings.alignToGrid = !!alignToGridInput?.checked;
    ConversionSettings.snapGridSize = Math.max(1, Number(snapGridSizeInput?.value) || 10);

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
}

//#endregion

//#region Core

class DevExpressConverter
{
    // Call this at the start of the conversion process
    static applySettings()
    {
        applyLayoutSettingsFromUI();
    }

    // ? Holds state information between function calls
    static state = {
        devExpressJson: null,   // ? For storing the generated JSON
        warnings: [],           // ? For storing conversion warnings
        createDevExpressPreview: null
    };

    static initialize()
    {
        this.state.devExpressJson = null;   // ? Reset generated JSON
        this.state.warnings = [];           // ? Reset warnings
        this.state.overlapWarnings = [];    // ? Reset overlap warnings
    }

    // ? Counts all components recursively, including nested ones
    // ? Returns an integer
    static countComponents(components)
    {
        // ! /// EARLY EXIT ///
        // ! If components is null or undefined, fall back to a count of 0
        if (!components) return 0;

        const count = components.reduce((total, component) =>
            total + 1 + this.countComponents(childComponents(component)), 0);

        return count;
    }

    // ? Counts all data sources. This includes the main form, DataGrids, FormGrids, and any Nested Forms
    // ? Returns an integer
    static countDataSources(form) {
        return 1 + collectGrids(form).length;
    }

    static findDataGridComponents(form, results = []) {
        return results.concat(collectGrids(form).filter(grid => grid.type === 'datagrid' && grid.DBName));
    }
    static findFormGridComponents(form, results = []) {
        return results.concat(collectGrids(form).filter(grid => grid.type === 'formgrid' && grid.DBName));
    }
    static findAllGridComponents(form, results = []) {
        return results.concat(collectGrids(form));
    }

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

    // ? Main transformation function
    // ? Takes Form.io JSON and returns compressed base64 DevExpress report template
    // ! Throws errors on critical failures, logs warnings for non-critical issues
    static transformToDevExpress(formioData)
    {
        try
        {
            formioData = normalizeFormExport(formioData);
            formioData.FormioTemplate = ComponentCleaner.cleanComponent(formioData.FormioTemplate);

            // ? Apply settings from UI before initializing
            DevExpressConverter.applySettings();
            // ? Initialize counters
            DevExpressConverter.initialize();
            ComponentCleaner.hoistGridsAndSubforms(formioData.FormioTemplate, DevExpressConverter.state.warnings);
            // Validate grid identities and flag missing custom FormGrid join metadata.
            for (const grid of collectGrids(formioData.FormioTemplate)) {
                if (grid.type === 'formgrid' && grid.DBName && !grid.dialogFormTable) {
                    DevExpressConverter.state.warnings.push({ type: 'formgrid_missing_dialog',
                        message: 'FormGrid has no dialog table mapping. Generated SQL reads the link table; referenced form fields may need a join.',
                        component: { type: grid.type, key: grid.key, label: grid.label || grid.key } });
                }
            }

            // ? Validate input
            if (!formioData)
            {
                throw new Error('No form data provided');
            }

            // ? Log input summary
            if (debugLevel >= 1)
            {
                debugLog(1, "transformToDevExpress() called with formData:",
                {
                    formName: formioData.FormName,
                    hasTemplate: Boolean(formioData.FormioTemplate),
                    hasComponents: Boolean(formioData.FormioTemplate?.components?.length)
                });
            }

            // ? Get a minimal valid XML template with the report name
            const xmlTemplateFunc = generateMinimalXmlTemplate();
            const xmlTemplate = xmlTemplateFunc(formioData);

            // Validate the exact XML that will be exported; never normalize text
            // inside attributes or markup while compressing it.
            const validationResults = Utils.validateXmlOutput(xmlTemplate);
            const errors = validationResults.filter(message => message.startsWith('ERROR'));
            if (errors.length) {
                const error = new Error('XML validation failed.');
                error.validationErrors = errors;
                throw error;
            }
            const base64Template = encodeReportTemplate(xmlTemplate);

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
                DepartmentGuid: formioData.DepartmentGuid || "00000000-0000-0000-0000-000000000000",
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
            return [`ERROR: Exception during validation: ${error.message}`];
        }
    },

    // ? Decode and decompress a base64 DevExpress report template
    // ? Returns an object with type, content, and format
    decodeReportTemplate,

    // ? Generate SQL query string for printout procedures
    // ? Returns a string
    // ! This generates basic SQL Stored Procedure create or alter statements for the main form, DataGrids, and FormGrids
    generateSqlQuery(formioData)
    {
        formioData = normalizeFormExport(formioData);
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
                    debugLog(1, 'Parsed FormioTemplate:', formioTemplate);
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

        // ? Build the SQL string in parts
        let sqlParts = [];

        // ? Main procedure
        // TODO: Add additional handling for joining Nested Form relation tables and adding their FIGUID and OwnerObjectGUID to the select
        sqlParts.push(`
/* MAIN FORM PROCEDURE */
create or alter procedure ${quoteSqlIdentifier(reportProcedureName(formioData))}
  @FormDataGUID varchar(36) = null,
  @OwnerObjectGUID varchar(36) = null
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
create or alter procedure ${quoteSqlIdentifier(reportProcedureName(formioData, grid.key))}
  @FormDataGUID varchar(36) = null,
  @OwnerObjectGUID varchar(36) = null
as
  /*
    This procedure was generated by version ${VERSION_INFO.version} of the Printout From Form tool on ${generateDate} at ${generateTime} ${timeZoneAbbr}
    It is not intended for direct use and should be modified as needed.
  */

  set nocount on;
  select
    ${safeKey}.*
  from ${grid.DBName} ${safeKey}
  where ${safeKey}.__forminstanceguid = @FormDataGUID
  and ${safeKey}.__ownerobjectguid = @OwnerObjectGUID
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
create or alter procedure ${quoteSqlIdentifier(reportProcedureName(formioData, grid.key))}
  @FormDataGUID varchar(36) = null,
  @OwnerObjectGUID varchar(36) = null
as
  /*
    This procedure was generated by version ${VERSION_INFO.version} of the Printout From Form tool on ${generateDate} at ${generateTime} ${timeZoneAbbr}
    It is not intended for direct use and should be modified as needed.
  */

  set nocount on;
  select
    ${grid.dialogFormTable ? 'dialog.*' : `${safeKey}.*`}
  from ${grid.DBName} ${safeKey}
  ${grid.dialogFormTable ? `left join ${grid.dialogFormTable} dialog with(NOLOCK) on dialog.__forminstanceguid = ${safeKey}.[view]` : ''}
  where ${safeKey}.__forminstanceguid = @FormDataGUID
  and ${safeKey}.__ownerobjectguid = @OwnerObjectGUID
GO`);
            });
        }

        // ? Combine all parts into final SQL
        const sql = sqlParts.join('\n\n');

        // ? Update SQL preview
        const previewContainer = document.getElementById('sql-rendered');
        if (previewContainer) {
            previewContainer.textContent = sql;
            previewContainer.classList.add('language-sql');
        }

        // ? Show output container
        const sqlOutput = document.getElementById('outputSql');
        if (sqlOutput) sqlOutput.style.display = 'block';

        globalThis.Prism?.highlightAll();

        return sql;
    }
};

const UIHandlers = {
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
                const jsonData = normalizeFormExport(JSON.parse(e.target.result));

                // Store the uploaded form globally for regeneration
                window.lastUploadedForm = jsonData;

                if (debugLevel >= 1)
                {
                    debugLog(1, "File loaded, raw data:",
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

                    const formioTemplate = jsonData.FormioTemplate;

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
                                debugLog(1, 'Form.io form instance created:', form);
                            }
                        }).catch(err =>
                        {
                            console.error('Error creating Form.io preview:', err);
                            formContainer.innerHTML = `
                <div class="alert alert-danger">
                  Error loading form: ${Utils.escapeXml(err.message)}
                </div>`;
                        });
                    }

                    // ? Generate DevExpress report
                    DevExpressConverter.state.devExpressJson = DevExpressConverter.transformToDevExpress(jsonData);
                    showOverlapWarnings();

                    if (DevExpressConverter.state.devExpressJson)
                    {
                        const devExpressJsonContainer = document.getElementById('devexpress-json');
                        if (devExpressJsonContainer)
                        {
                            devExpressJsonContainer.textContent = JSON.stringify(DevExpressConverter.state.devExpressJson, null, 2);
                            devExpressJsonContainer.classList.add('language-json');
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
                            debugLog(1, 'Decoded template result:',
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
                                    xmlContainer.textContent = decodedTemplate.content;

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
    `;
        const warningsList = document.createElement('ul');
        warningsList.className = 'list-unstyled mb-0';
        warningsSection.appendChild(warningsList);

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
                ${Utils.escapeXml(warning.message)}${Utils.escapeXml(details)}
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
        DevExpressConverter.state.devExpressJson = null;
        document.getElementById('output-wrapper').style.display = 'none';
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
              ${errorDetails.map(detail => `<li>${Utils.escapeXml(String(detail))}</li>`).join('')}
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

//#endregion

//#region Generation

function snapToGrid(value, gridSize)
{
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || !Number.isFinite(gridSize) || gridSize <= 0)
    {
        return value;
    }

    const snapped = Math.round(parsed / gridSize) * gridSize;
    if (parsed > 0 && snapped === 0)
    {
        return gridSize.toString();
    }

    return Number.isInteger(snapped) ? String(snapped) : String(parseFloat(snapped.toFixed(3)));
}

function snapPairAttribute(value, gridSize)
{
    if (typeof value !== 'string' || !value.includes(','))
    {
        return value;
    }

    const parts = value.split(',');
    if (parts.length < 2)
    {
        return value;
    }

    const snappedX = snapToGrid(parts[0].trim(), gridSize);
    const snappedY = snapToGrid(parts[1].trim(), gridSize);
    return `${snappedX},${snappedY}`;
}

function detectOverlaps(rootNode)
{
    const overlaps = [];

    function parseRect(node)
    {
        const loc = node.attributes?.LocationFloat;
        const size = node.attributes?.SizeF;
        if (!loc || !size) return null;

        const [x, y] = loc.split(',').map(s => parseFloat(s.trim()));
        const [w, h] = size.split(',').map(s => parseFloat(s.trim()));
        if ([x, y, w, h].some(v => !Number.isFinite(v) || v < 0)) return null;

        return { x, y, w, h };
    }

    function nodeName(node)
    {
        return node.attributes?.Name || node.type || 'unknown';
    }

    function controlTypeLabel(node)
    {
        const rawType = node?.attributes?.ControlType || node?.type || 'Unknown';
        const shortType = rawType.includes('.') ? rawType.split('.').pop() : rawType;

        const typeMap = {
            XRCheckBox: 'Check Box',
            XRPanel: 'Panel',
            XRLabel: 'Label',
            XRTable: 'Table',
            XRTableCell: 'Table Cell',
            XRTableRow: 'Table Row'
        };

        if (typeMap[shortType])
        {
            return typeMap[shortType];
        }

        return shortType.replace(/^XR/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    function walk(node)
    {
        if (!node || typeof node !== 'object') return;

        const children = Array.isArray(node.children) ? node.children : [];

        // Collect children that have a parseable rect
        const rects = [];
        for (const child of children)
        {
            const rect = parseRect(child);
            if (rect) rects.push({ node: child, rect });
        }

        // Check if children overflow the parent's own bounds
        const parentRect = parseRect(node);
        if (parentRect)
        {
            for (const entry of rects)
            {
                const childRect = entry.rect;
                const outsideBounds =
                    childRect.x < 0 ||
                    childRect.y < 0 ||
                    (childRect.x + childRect.w) > parentRect.w ||
                    (childRect.y + childRect.h) > parentRect.h;

                if (outsideBounds)
                {
                    overlaps.push(
                        `${nodeName(entry.node)} (${controlTypeLabel(entry.node)}) is overlapping with ${nodeName(node)} (${controlTypeLabel(node)})`
                    );
                }
            }
        }

        // Check every pair of siblings for overlap
        for (let i = 0; i < rects.length; i++)
        {
            for (let j = i + 1; j < rects.length; j++)
            {
                const a = rects[i].rect;
                const b = rects[j].rect;
                const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
                const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;
                if (overlapsX && overlapsY)
                {
                    overlaps.push(
                        `${nodeName(rects[i].node)} (${controlTypeLabel(rects[i].node)}) overlaps with ` +
                        `${nodeName(rects[j].node)} (${controlTypeLabel(rects[j].node)})` +
                        ` (parent: ${nodeName(node)})`
                    );
                }
            }
        }

        // Recurse into all children regardless
        for (const child of children)
        {
            walk(child);
        }
    }

    walk(rootNode);
    return overlaps;
}

function alignNodeTreeToGrid(node, gridSize)
{
    if (!node)
    {
        return;
    }

    if (Array.isArray(node))
    {
        node.forEach(child => alignNodeTreeToGrid(child, gridSize));
        return;
    }

    if (typeof node !== 'object')
    {
        return;
    }

    const attrs = node.attributes;
    if (attrs && typeof attrs === 'object')
    {
        if (attrs.LocationFloat !== undefined)
        {
            attrs.LocationFloat = snapPairAttribute(attrs.LocationFloat, gridSize);
        }

        if (attrs.SizeF !== undefined)
        {
            attrs.SizeF = snapPairAttribute(attrs.SizeF, gridSize);
        }

        if (attrs.WidthF !== undefined)
        {
            attrs.WidthF = snapToGrid(attrs.WidthF, gridSize);
        }

        if (attrs.HeightF !== undefined)
        {
            attrs.HeightF = snapToGrid(attrs.HeightF, gridSize);
        }
    }

    if (Array.isArray(node.children))
    {
        node.children.forEach(child => alignNodeTreeToGrid(child, gridSize));
    }
}

// ? Generates a minimal XML template for DevExpress reports that we can then populate with element nodes
function generateMinimalXmlTemplate()
{
    return (formioData) =>
    {
        const processor = new XMLProcessor();

        // ? Report metadata
        const name = formioData?.FormName || 'Simple Report';
        const deptName = formioData?.DepartmentName || 'Unknown';
        const reportGuid = formioData?.ReportGuid || formioData?.FormDefinitionGuid || '00000000-0000-0000-0000-000000000000';
        const departmentGuid = formioData?.DepartmentGuid || '00000000-0000-0000-0000-000000000000';
        const displayName = `${name};${name};false;false;${departmentGuid};${reportGuid}`;

        // ? Create root node
        const root = processor.buildNode('XtraReportsLayoutSerializer',
        {
            SerializerVersion: "23.2.5.0",
            ControlType: "DevExpress.XtraReports.UI.XtraReport, DevExpress.XtraReports.v23.2, Version=23.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a",
            Name: "Report",
            DisplayName: displayName,
            SnapGridSize: `${ConversionSettings.snapGridSize.toFixed(1)}`,
            Margins: `${LAYOUT.MARGIN_LEFT}, ${LAYOUT.MARGIN_RIGHT}, ${LAYOUT.MARGIN_TOP}, ${LAYOUT.MARGIN_BOTTOM}`,
            PaperKind: "Custom",
            PageWidth: `${LAYOUT.PAGE_WIDTH}`,
            PageHeight: `${LAYOUT.PAGE_HEIGHT}`,
            Version: "23.2",
            DataMember: reportProcedureName(formioData),
            DataSource: "#Ref-0"
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
            processor.createItemNode(1, undefined,
            {
                Description: "FormDataGUID",
                Name: "FormDataGUID",
                ValueInfo: "00000000-0000-0000-0000-000000000000"
            }),
            processor.createItemNode(2, undefined,
            {
                Description: "ObjectGUID",
                Name: "ObjectGUID",
                ValueInfo: "00000000-0000-0000-0000-000000000000"
            })
        ]);

        // ? Process form components using the ComponentProcessor
        const componentProcessor = new ComponentProcessor(processor, DevExpressConverter.state.warnings);
        componentProcessor.currentY = LAYOUT.BAND_PADDING; // ! Start Y position for components. This is essentially the space between the top of the Detail Band and the first element

        const controls = [];
        // Initialize component groups array at a higher scope
        const componentGroups = [];
        let currentGroup = [];

        if (formioData?.FormioTemplate?.components)
        {
            // Process components and collect grid markers
            let processedNodes;
            try { processedNodes = componentProcessor.processComponents(
                formioData.FormioTemplate.components,
                LAYOUT.DEFAULT_WIDTH,   // ? Default width for components
                0                       // ? Starting X offset
            ); } finally { componentProcessor.dispose(); }

            if (debugLevel >= 2) {
                debugLog(1, 'Processed components:', processedNodes);
                debugLog(1, 'Grid markers:', componentProcessor.gridComponents);
                debugLog(1, 'Nested form markers:', componentProcessor.nestedFormComponents);
                debugLog(1, 'Starting to process nodes into groups...');
            }
            
            // Improved grouping: split processedNodes into groups at grid markers
            const groups = [];
            let currentComponents = [];
            let gridIdx = 0;
            processedNodes.forEach((node) => {
                if (node.type === 'grid')
                {
                    debugWarn(1, "GRID DETECTED");

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
                    debugWarn(1, "NESTEDSUBFORM DETECTED");

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
                    debugWarn(1, "REGULAR COMPONENT DETECTED. TYPE:", node.type, "NAME:", node.name, "KEY:", node.key);
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
                debugLog(1, 'Final component groups (split at grids):', {
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
                placeControlGroup(componentGroups[0].components, LAYOUT.BAND_PADDING);
                controls.push(...componentGroups[0].components);
            } else {
                debugLog(1, 'No initial components for main detail band');
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
                        let maxY = LAYOUT.BAND_PADDING;
                        controls.forEach(component => {
                            const sizeStr = component.attributes?.SizeF;
                            const locationStr = component.attributes?.LocationFloat;
                            if (sizeStr && locationStr) {
                                const height = parseInt(sizeStr.split(',')[1]) || window.LAYOUT.INPUT_HEIGHT;
                                const y = parseInt(locationStr.split(',')[1]) || 0;
                                maxY = Math.max(maxY, y + height);
                            }
                        });
                        return (maxY + LAYOUT.BAND_PADDING).toString();
                    })() :
                    LAYOUT.BAND_PADDING.toString()
            })
        ];

        // Each flow group owns its band and binding. No look-ahead or spacer
        // reports: fields after a grid belong to the main form, not grid rows.
        let flowLevel = 0;
        for (const [index, group] of componentGroups.entries()) {
            if (index === 0 && group.type === 'components') continue;
            let section;
            const sectionTop = LAYOUT.BAND_PADDING + (index > 0 ? LAYOUT.VERTICAL_SPACING : 0);
            if (group.type === 'grid') {
                const grid = gridComponents[group.gridIndex];
                const key = grid.key;
                section = processor.createItemNode(undefined, 'DetailReportBand', {
                    Name: 'DetailReport_' + key,
                    Level: flowLevel++,
                    DataSource: '#Ref-' + (325 + group.gridIndex),
                    DataMember: reportProcedureName(formioData, key)
                });
                const headerHeight = placeControlGroup(grid.headerContent, sectionTop);
                const header = processor.createItemNode(1, 'GroupHeaderBand', {
                    Name: 'Header_' + key, HeightF: headerHeight,
                    RepeatEveryPage: true, GroupUnion: 'WithFirstDetail'
                });
                header.addChild(processor.buildNode('Controls', {}, grid.headerContent));
                const detail = processor.createItemNode(2, 'DetailBand', {
                    Name: 'Rows_' + key, HeightF: LAYOUT.INPUT_HEIGHT
                });
                detail.addChild(processor.buildNode('Controls', {}, grid.dataContent));
                section.addChild(processor.buildNode('Bands', {}, [header, detail]));
            } else {
                const content = group.type === 'components' ? group.components : [
                    componentProcessor.createSubReportNode(group.component, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT, 0)
                ];
                const height = placeControlGroup(content, sectionTop) + LAYOUT.BAND_PADDING;
                section = processor.createItemNode(undefined, 'DetailReportBand', {
                    Name: 'ContentSection_' + index, Level: flowLevel++,
                    DataSource: '#Ref-0', DataMember: reportProcedureName(formioData)
                });
                const detail = processor.createItemNode(1, 'DetailBand', {
                    Name: 'ContentDetail_' + index, HeightF: height
                });
                detail.addChild(processor.buildNode('Controls', {}, content));
                section.addChild(processor.buildNode('Bands', {}, [detail]));
            }
            bandsArray.push(section);
        }

        // ? Add PageFooterBand
        bandsArray.push(
            processor.createItemNode(undefined, "PageFooterBand",
            {
                Name: "PageFooter",
                HeightF: "50"
            })
        );

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
        bands.children[1].addChild(headerControls); // ? Add header controls to ReportHeaderBand
        bands.children[2].addChild(detailControls); // ? Add detail controls to DetailBand

        // ? Add controls to PageFooterBand
        const footerBand = bands.children.find(c => c.attributes?.Name === 'PageFooter');
        if (footerBand) {
            const pageInfoItem = processor.createItemNode(1, "XRPageInfo",
            {
                Name: "pageInfo1",
                TextAlignment: "BottomRight",
                SizeF: (LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN_LEFT - LAYOUT.MARGIN_RIGHT) + ",50",
                LocationFloat: "0,0",
                Padding: "2,2,0,0,100",
                Font: LAYOUT.FONT_FIELDOUTPUT
            });
            pageInfoItem.addChild(processor.buildNode('StylePriority', { UseTextAlignment: "false" }));
            footerBand.addChild(processor.buildNode('Controls', {}, [pageInfoItem]));
        }

        // ? Add all main sections to root
        root.addChild(extensions);
        root.addChild(parameters);
        root.addChild(bands);

        // ? Add ParameterPanelLayoutItems
        const parameterPanel = processor.buildNode('ParameterPanelLayoutItems',
        {}, [
            processor.createItemNode(1, undefined,
            {
                LayoutItemType: "Parameter",
                Parameter: ""
            }),
            processor.createItemNode(2, undefined,
            {
                LayoutItemType: "Parameter",
                Parameter: ""
            })
        ]);
        root.addChild(parameterPanel);

        // ? Add ComponentStorage for datasource definitions
        const componentStorage = buildComponentStorage(formioData, processor, gridComponents.map(grid => grid.component));
        root.addChild(componentStorage);

        if (ConversionSettings.alignToGrid)
        {
            alignNodeTreeToGrid(root, ConversionSettings.snapGridSize);
        }

        // ? Overlap detection pass: check for explicitly overlapping siblings at every container depth
        DevExpressConverter.state.overlapWarnings = detectOverlaps(root);

        // ? Second pass: Assign all references
        processor.assignReferences(root);

        // ? Bind ParameterPanel items to the actual parameter refs assigned above.
        if (parameters.children?.length >= 2 && parameterPanel.children?.length >= 2)
        {
            const formDataParamRef = parameters.children[0]?.attributes?.Ref;
            const objectParamRef = parameters.children[1]?.attributes?.Ref;

            if (formDataParamRef !== undefined)
            {
                parameterPanel.children[0].attributes.Parameter = `#Ref-${formDataParamRef}`;
            }
            if (objectParamRef !== undefined)
            {
                parameterPanel.children[1].attributes.Parameter = `#Ref-${objectParamRef}`;
            }
        }

        // ? Final pass: Generate XML string with proper formatting and cleanup
        const xmlContent = processor.generateXML(root);
        const finalXml = '<?xml version="1.0" encoding="utf-8"?>\n' + xmlContent;
        return finalXml;

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

    // Reuse the file picker without reloading the page or discarding settings.
    setupUploadAnotherHandler() {
        const button = document.getElementById('uploadAnotherBtn');
        if (button) button.onclick = () => {
            const input = document.getElementById('fileUpload');
            input.value = '';
            input.click();
        };
    },

    // ? Attach event listeners to UI elements
    // ! This is separated for clarity and modularity
    initializeEventListeners(createDevExpressPreview)
    {
        DevExpressConverter.state.createDevExpressPreview = createDevExpressPreview || null;

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
        } else { debugWarn(1, 'File upload element not found'); }

        if (copyJsonBtn)
        {
            copyJsonBtn.addEventListener('click', UIHandlers.copyJson);
        } else { debugWarn(1, 'Copy JSON button not found'); }

        if (downloadJsonBtn)
        {
            downloadJsonBtn.addEventListener('click', UIHandlers.downloadJson);
        } else { debugWarn(1, 'Download JSON button not found'); }

        if (copyXmlBtn)
        {
            copyXmlBtn.addEventListener('click', UIHandlers.copyXML);
        } else { debugWarn(1, 'Copy XML button not found'); }

        if (copySqlBtn)
        {
            copySqlBtn.addEventListener('click', UIHandlers.copySQL);
        } else { debugWarn(1, 'Copy SQL button not found'); }
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
