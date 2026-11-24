import { LAYOUT } from '../layoutConfig.js';

// Insets are applied once to child coordinates by the layout builder. Do not
// also serialize them as Padding: DevExpress would apply them a second time.
const zeroPadding = '0,0,0,0,100';
function panel(borders, inset) {
    return {
        controlType: 'XRPanel',
        attributes: { CanShrink: 'true', Borders: borders, Padding: zeroPadding },
        get insets() { const p = inset(); return { left: p, right: p, top: p, bottom: p }; }
    };
}
function cells(horizontalInset) {
    return {
        controlType: 'XRTable',
        attributes: { Borders: 'None', Padding: zeroPadding, AnchorVertical: 'Top' },
        rowAttributes: { Weight: '1' },
        cellAttributes: { Padding: zeroPadding, Borders: 'None', TextAlignment: 'TopLeft' },
        get insets() { return { left: horizontalInset(), right: horizontalInset(), top: 0, bottom: 0 }; }
    };
}
export const LAYOUT_CONTROLS = {
    panel: panel('None', () => LAYOUT.CONTAINER_PADDING),
    fieldset: panel('None', () => LAYOUT.CONTAINER_PADDING),
    well: panel('All', () => LAYOUT.WELL_PADDING),
    tabs: panel('None', () => LAYOUT.CONTAINER_PADDING),
    columns: cells(() => LAYOUT.COLUMN_PADDING),
    table: cells(() => LAYOUT.TABLE_CELL_PADDING)
};
