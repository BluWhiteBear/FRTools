// Pure report model + static analysis. No execution of report code or queries.
export const SUPPORTED_CONTROLS = new Set(['XRLabel', 'XRCheckBox', 'XRPictureBox', 'XRPanel', 'XRTable', 'XRTableRow', 'XRTableCell', 'XRPageInfo', 'XRLine']);
export const shortType = value => (value || '').split(',')[0].trim().split('.').pop();
export const childrenNamed = (node, tag) => node.children?.filter(child => child.tag === tag) || [];
export const collection = (node, tag) => childrenNamed(node, tag)[0]?.children || [];
export function numbers(value, count) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const parts = value.split(',').map(part => part.trim() ? Number(part) : NaN);
    return parts.length === count && parts.every(Number.isFinite) ? parts : null;
}
export function unitDpi(root) {
    return { Inches: 1, Millimeters: 25.4, HundredthsOfAnInch: 100, TenthsOfAMillimeter: 254, Pixels: 96 }[root.attrs.ReportUnit] || Number(root.attrs.Dpi) || 100;
}
export function pageGeometry(root) {
    const dpi = unitDpi(root);
    const margins = numbers(root.attrs.Margins, 4) || [100, 100, 100, 100].map(value => value * dpi / 100);
    // DevExpress's default paper is Letter. Explicit dimensions are already in
    // report orientation: do not swap them again just because Landscape is true.
    const papers = { Letter: [8.5, 11], A4: [210 / 25.4, 297 / 25.4], Legal: [8.5, 14], A3: [297 / 25.4, 420 / 25.4], A5: [148 / 25.4, 210 / 25.4] };
    let [width, height] = papers[root.attrs.PaperKind] || papers.Letter;
    if (root.attrs.Landscape === 'true') [width, height] = [height, width];
    width = root.attrs.PageWidth === undefined ? width * dpi : Number(root.attrs.PageWidth);
    height = root.attrs.PageHeight === undefined ? height * dpi : Number(root.attrs.PageHeight);
    return { width, height, dpi, pixelsPerUnit: 96 / dpi, margins,
        printableWidth: width - margins[0] - margins[1], printableHeight: height - margins[2] - margins[3] };
}

export function parseReportXml(xml, Parser = globalThis.DOMParser) {
    if (typeof xml !== 'string' || !xml.trim()) throw new Error('Report XML is empty.');
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD and entity declarations are not supported in report layouts.');
    const document = new Parser().parseFromString(xml, 'application/xml');
    const error = document.getElementsByTagName('parsererror')[0];
    if (error) throw new Error(`Invalid report XML: ${error.textContent.trim()}`);
    if (document.documentElement?.tagName !== 'XtraReportsLayoutSerializer') throw new Error('Expected an XtraReportsLayoutSerializer report layout.');
    let id = 0;
    const byElement = new WeakMap();
    function convert(element, parent = null) {
        const attrs = Object.fromEntries(Array.from(element.attributes, attr => [attr.name, attr.value]));
        const node = { id: String(++id), tag: element.tagName, type: shortType(attrs.ControlType), attrs, parent, element, children: [] };
        byElement.set(element, node);
        node.children = Array.from(element.children, child => convert(child, node));
        return node;
    }
    const root = convert(document.documentElement);
    return { root, document, byElement, geometry: pageGeometry(root) };
}

// Only lexical checks are claimed here. DevExpress's expression compiler is
// required for function/type resolution; expressions are never eval'd in JS.
export function expressionIssue(expression) {
    let quoted = false, bracket = false, depth = 0;
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (quoted) {
            if (char === "'" && expression[i + 1] === "'") i++;
            else if (char === "'") quoted = false;
        } else if (bracket) {
            if (char === ']' && expression[i + 1] === ']') i++;
            else if (char === ']') bracket = false;
        } else if (char === "'") quoted = true;
        else if (char === '[') bracket = true;
        else if (char === '(') depth++;
        else if (char === ')' && --depth < 0) return 'Unexpected closing parenthesis.';
    }
    return quoted ? 'Unclosed string literal.' : bracket ? 'Unclosed field reference.' : depth ? 'Unbalanced parentheses.' : null;
}

export function analyzeReport(root) {
    const diagnostics = [], refs = new Map(), links = [], all = [];
    const names = new Map();
    const add = (severity, code, message, node = root) => diagnostics.push({ severity, code, message, nodeId: node.id, name: node.attrs.Name || node.type || node.tag });
    const geometry = pageGeometry(root);
    if (root.attrs.ReportUnit && !['Inches', 'Millimeters', 'HundredthsOfAnInch', 'TenthsOfAMillimeter', 'Pixels'].includes(root.attrs.ReportUnit)) add('error', 'REPORT_UNIT', `Unknown report unit: ${root.attrs.ReportUnit}`);
    if (![geometry.width, geometry.height, geometry.dpi].every(n => Number.isFinite(n) && n > 0) ||
        geometry.margins.some(n => n < 0) || geometry.printableWidth <= 0 || geometry.printableHeight <= 0) add('error', 'PAGE_GEOMETRY', 'Page dimensions and margins must leave a positive printable area.');
    if (root.attrs.Margins && !numbers(root.attrs.Margins, 4)) add('error', 'MARGINS', 'Margins must contain four finite numbers: left, right, top, bottom.');
    if (root.attrs.PaperKind && !['Letter', 'A4', 'Legal', 'A3', 'A5', 'Custom'].includes(root.attrs.PaperKind) && (!root.attrs.PageWidth || !root.attrs.PageHeight)) add('warning', 'PAPER_APPROXIMATION', 'This paper preset requires explicit PageWidth and PageHeight for an accurate preview.');
    if (!collection(root, 'Bands').some(band => band.type === 'DetailBand')) add('error', 'DETAIL_BAND', 'The root report has no DetailBand.');
    function walk(node) {
        all.push(node);
        const a = node.attrs;
        if (a.Name && (node.type?.startsWith('XR') || node.type?.endsWith('Band'))) {
            let owner = node;
            while (owner.parent && owner.tag !== 'ReportSource') owner = owner.parent;
            const key = owner.id + ':' + a.Name;
            if (names.has(key)) add('warning', 'DUPLICATE_NAME', `Another control or band in this report is named ${a.Name}.`, node);
            else names.set(key, node);
        }
        if (a.Ref !== undefined) {
            if (!/^\d+$/.test(a.Ref)) add('error', 'REF_FORMAT', `Invalid reference ID: ${a.Ref}`, node);
            else if (refs.has(a.Ref)) add('error', 'DUPLICATE_REF', `Reference ${a.Ref} identifies more than one object.`, node);
            else refs.set(a.Ref, node);
        }
        Object.entries(a).forEach(([property, value]) => { if (/^#Ref-/.test(value)) links.push({ node, property, value }); });
        for (const [property, count] of [['SizeF', 2], ['LocationFloat', 2], ['LocationF', 2]]) {
            if (a[property] !== undefined && !numbers(a[property], count)) add('error', 'INVALID_DIMENSION', `${property} must contain ${count} finite numbers.`, node);
        }
        const size = numbers(a.SizeF, 2);
        if (size?.some(n => n < 0)) add('error', 'NEGATIVE_SIZE', 'Control dimensions cannot be negative.', node);
        for (const property of ['HeightF', 'WidthF', 'Weight', 'BorderWidth', 'Dpi']) {
            if (a[property] !== undefined && (!a[property].trim() || !Number.isFinite(Number(a[property])) || Number(a[property]) < 0 || (['Weight', 'Dpi'].includes(property) && Number(a[property]) === 0))) add('error', 'INVALID_NUMBER', `${property} has an invalid value: ${a[property]}`, node);
        }
        if (a.Padding) {
            const parts = a.Padding.split(',');
            const padding = numbers(a.Padding, parts.length);
            if (![4, 5].includes(parts.length) || !padding || padding.some(n => n < 0) || (parts.length === 5 && padding[4] <= 0)) add('error', 'PADDING', 'Padding must contain left, right, top, bottom and optionally a positive DPI.', node);
        }
        if (node.type?.startsWith('XR') && !SUPPORTED_CONTROLS.has(node.type)) add('warning', 'UNSUPPORTED_CONTROL', `${node.type} is shown as a placeholder; its runtime rendering is not implemented.`, node);
        if (node.type?.startsWith('XR') && !['XRTableRow', 'XRTableCell', 'XRPageBreak'].includes(node.type) && !a.SizeF) add('warning', 'MISSING_BOUNDS', 'Control size uses a DevExpress runtime default. Explicit SizeF is needed for an accurate local preview.', node);
        if (node.type?.endsWith('Band') && !['TopMarginBand', 'BottomMarginBand', 'PageHeaderBand', 'PageFooterBand', 'ReportHeaderBand', 'ReportFooterBand', 'GroupHeaderBand', 'GroupFooterBand', 'DetailBand', 'DetailReportBand', 'SubBand'].includes(node.type)) add('warning', 'UNSUPPORTED_BAND', `${node.type} layout is not implemented in this preview.`, node);
        if (node.parent?.tag === 'Bands' && node.parent.parent?.type === 'DetailReportBand' && ['TopMarginBand', 'BottomMarginBand', 'PageHeaderBand', 'PageFooterBand'].includes(node.type)) add('error', 'BAND_PLACEMENT', 'Margin and page bands belong to the root report, not a DetailReportBand.', node);
        if (node.type === 'XRPictureBox' && (a.ImageUrl || a.ImageSource && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(a.ImageSource))) add('info', 'IMAGE_SOURCE_UNVERIFIED', 'External or serialized image content requires runtime resolution; only embedded raster images are rendered locally.', node);
        if (a.CanGrow === 'true' || a.CanShrink === 'true' || a.Angle && Number(a.Angle) !== 0 || a.AutoWidth === 'true') add('info', 'RUNTIME_LAYOUT', 'Growth, shrinkage, rotation or automatic width can change the runtime layout; this preview uses design bounds.', node);
        if (node.type === 'XRTable' && !collection(node, 'Rows').length) add('error', 'TABLE_ROWS', 'Table has no rows.', node);
        if (node.type === 'XRTableRow' && !collection(node, 'Cells').length) add('error', 'TABLE_CELLS', 'Table row has no cells.', node);
        if (node.type === 'DetailReportBand' && !collection(node, 'Bands').some(band => band.type === 'DetailBand')) add('error', 'DETAIL_BAND', 'DetailReportBand has no child DetailBand.', node);
        if (node.parent?.tag === 'ExpressionBindings') {
            if (!a.PropertyName || !a.EventName || !a.Expression?.trim()) add('error', 'EXPRESSION_BINDING', 'Expression binding requires EventName, PropertyName, and Expression.', node);
            else {
                const issue = expressionIssue(a.Expression);
                if (issue) add('error', 'EXPRESSION_SYNTAX', issue, node.parent.parent || node);
            }
        }
        const controls = collection(node, 'Controls');
        const width = size?.[0] ?? geometry.printableWidth;
        const column = childrenNamed(node, 'MultiColumn')[0];
        const contentWidth = column?.attrs.Mode === 'UseColumnWidth' ? Number(column.attrs.ColumnWidth) || width :
            column?.attrs.Mode === 'UseColumnCount' && Number(column.attrs.ColumnCount) > 0 ? (width - (Number(column.attrs.ColumnCount) - 1) * (Number(column.attrs.ColumnSpacing) || 0)) / Number(column.attrs.ColumnCount) : width;
        if (column && column.attrs.Mode !== 'None') add('info', 'MULTICOLUMN_PREVIEW', 'Column width is checked, but data-driven column flow requires runtime pagination.', node);
        controls.forEach(control => {
            const location = numbers(control.attrs.LocationFloat || control.attrs.LocationF || '0,0', 2), bounds = numbers(control.attrs.SizeF, 2);
            if (location && bounds && (location[0] < 0 || location[1] < 0 || location[0] + bounds[0] > contentWidth + 0.01)) add('warning', 'PRINT_AREA', 'Control extends outside its container or printable width. This can create extra pages or clipped output.', control);
            if (location && bounds && size && location[1] + bounds[1] > size[1] + 0.01) add('warning', 'CONTAINER_BOUNDS', 'Control extends below its container design bounds.', control);
            if (location && bounds && node.type?.endsWith('Band') && location[1] + bounds[1] > (Number(a.HeightF) || 0) + 0.01) add('info', 'BAND_EXTENT', 'Control extends below the declared band height. The preview uses the child extent; runtime band growth must be verified.', control);
        });
        for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
            const left = controls[i], right = controls[j];
            if (left.attrs.Visible === 'false' || right.attrs.Visible === 'false') continue;
            const a = numbers(left.attrs.LocationFloat || left.attrs.LocationF || '0,0', 2), b = numbers(right.attrs.LocationFloat || right.attrs.LocationF || '0,0', 2);
            const sa = numbers(left.attrs.SizeF, 2), sb = numbers(right.attrs.SizeF, 2);
            if (a && b && sa && sb && Math.min(a[0] + sa[0], b[0] + sb[0]) - Math.max(a[0], b[0]) > 0.01 && Math.min(a[1] + sa[1], b[1] + sb[1]) - Math.max(a[1], b[1]) > 0.01) add('warning', 'OVERLAP', `Overlaps ${right.attrs.Name || right.type}. Overlapping controls can cause tabular export issues.`, left);
        }
        node.children.forEach(walk);
    }
    walk(root);
    for (const { node, property, value } of links) {
        const target = refs.get(value.slice(5));
        if (!target) add('error', 'MISSING_REFERENCE', `${property} points to missing object ${value}.`, node);
        else if (property === 'DataSource' && !target.attrs.ObjectType?.includes('DataSource') && !target.type?.includes('DataSource')) add('error', 'DATASOURCE_TARGET', 'DataSource points to an object that is not a datasource.', node);
    }
    const styles = new Set(collection(root, 'StyleSheet').map(style => style.attrs.Name));
    all.forEach(node => {
        for (const property of ['StyleName', 'OddStyleName', 'EvenStyleName']) if (node.attrs[property] && !styles.has(node.attrs[property])) add('warning', 'MISSING_STYLE', `Style ${node.attrs[property]} is not defined.`, node);
    });
    if (all.some(node => node.parent?.tag === 'ExpressionBindings')) add('info', 'EXPRESSIONS_UNVERIFIED', 'Bound values are placeholders. Expression functions, types, parameters and data-dependent visibility require the DevExpress expression engine.');
    if (all.some(node => node.tag === 'Scripts' || Object.keys(node.attrs).some(key => key.startsWith('OnBefore') || key === 'ScriptsSource'))) add('warning', 'SCRIPTS_UNVERIFIED', 'Report scripts are not executed or compiled in this client-side viewer.');
    add('info', 'STATIC_PREVIEW', 'Design-layout preview: each detail band is shown once. Database rows, data grouping, runtime pagination, font metrics and export validation require the DevExpress runtime.');
    return diagnostics;
}
