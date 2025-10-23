// layoutConfig.js
// Centralized layout variables for global use

export const LAYOUT = {
    MARGIN_TOP: 30,
    MARGIN_LEFT: 30,
    MARGIN_RIGHT: 30,
    MARGIN_BOTTOM: 30,
    PAGE_WIDTH: 800,
    PAGE_HEIGHT: 1120,
    VERTICAL_SPACING: 8,
    LABEL_HEIGHT: 30,
    INPUT_HEIGHT: 30,
    DEFAULT_FONT: 'Times New Roman, 5pt',
    VERTICAL_GAP: 8,

    FONT_REPORTHEADER: 'Times New Roman, 5pt, style=Bold',
    FONT_SECTIONHEADER: 'Times New Roman, 5pt, style=Bold',
    FONT_FIELDLABEL: 'Times New Roman, 5pt, style=Bold',
    FONT_FIELDOUTPUT: 'Times New Roman, 5pt'
};

// Attach to window for non-module scripts
if (typeof window !== 'undefined') {
    window.LAYOUT = LAYOUT;
}
