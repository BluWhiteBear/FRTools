import { collection, pageGeometry, numbers } from './reportModel.js';

// Design pagination: each detail band appears once. No data records are fabricated.
export function paginateReport(root) {
    const geometry = pageGeometry(root), pages = [], overflow = [];
    const bands = collection(root, 'Bands').filter(node => node.attrs.Visible !== 'false');
    const headers = bands.filter(node => node.type === 'PageHeaderBand');
    const reportHeaders = bands.filter(node => node.type === 'ReportHeaderBand');
    const footers = bands.filter(node => node.type === 'PageFooterBand');
    const heightOf = node => Math.max(0, Number(node.attrs.HeightF) || 0,
        ...collection(node, 'Controls').filter(control => control.attrs.Visible !== 'false').map(control => {
            const location = numbers(control.attrs.LocationFloat || control.attrs.LocationF || '0,0', 2);
            const size = numbers(control.attrs.SizeF, 2);
            return location && size ? location[1] + size[1] : 0;
        }));
    const headerHeight = headers.reduce((sum, node) => sum + heightOf(node), 0);
    const footerHeight = footers.reduce((sum, node) => sum + heightOf(node), 0);
    let current, y, hasBody;
    function page() {
        current = [];
        pages.push(current);
        let headerY = geometry.margins[2];
        if (pages.length === 1) for (const node of reportHeaders) {
            current.push({ node, y: headerY, height: heightOf(node) });
            headerY += heightOf(node);
        }
        for (const node of headers) { current.push({ node, y: headerY, height: heightOf(node) }); headerY += heightOf(node); }
        let footerY = geometry.height - geometry.margins[3] - footerHeight;
        for (const node of footers) { current.push({ node, y: footerY, height: heightOf(node) }); footerY += heightOf(node); }
        for (const node of bands.filter(band => ['TopMarginBand', 'BottomMarginBand'].includes(band.type))) {
            current.push({ node, y: node.type === 'TopMarginBand' ? 0 : geometry.height - geometry.margins[3], height: heightOf(node) });
        }
        y = headerY;
        hasBody = pages.length === 1 && reportHeaders.some(node => heightOf(node) > 0);
    }
    const priority = type => ({ ReportHeaderBand: 0, GroupHeaderBand: 1, DetailBand: 2, DetailReportBand: 3, GroupFooterBand: 4, ReportFooterBand: 5 })[type] ?? 6;
    const ordered = list => list.map((node, index) => ({ node, index })).sort((a, b) => priority(a.node.type) - priority(b.node.type) ||
        (a.node.type === 'DetailReportBand' ? Number(a.node.attrs.Level || 0) - Number(b.node.attrs.Level || 0) : 0) || a.index - b.index).map(entry => entry.node);
    const flow = [];
    function flatten(list) {
        for (const node of ordered(list)) {
            if (node.attrs.Visible === 'false' || ['PageHeaderBand', 'PageFooterBand', 'TopMarginBand', 'BottomMarginBand'].includes(node.type)) continue;
            if (node.type === 'DetailReportBand') flatten(collection(node, 'Bands'));
            else if (node.type?.endsWith('Band')) { flow.push(node); flatten(collection(node, 'SubBands')); }
        }
    }
    flatten(bands.filter(node => node.type !== 'ReportHeaderBand'));
    page();
    for (let index = 0; index < flow.length; index++) {
        const node = flow[index], height = heightOf(node);
        if (hasBody && ['BeforeBand', 'BeforeBandExceptFirstEntry'].includes(node.attrs.PageBreak)) page();
        let required = height;
        if (node.type === 'GroupHeaderBand' && node.attrs.GroupUnion === 'WithFirstDetail' && flow[index + 1]) required += heightOf(flow[index + 1]);
        if (hasBody && y + required > geometry.height - geometry.margins[3] - footerHeight + 0.01) page();
        if (height > geometry.printableHeight - headerHeight - footerHeight) overflow.push(node);
        current.push({ node, y, height });
        y += height;
        hasBody = hasBody || height > 0;
        if (['AfterBand', 'AfterBandExceptLastEntry'].includes(node.attrs.PageBreak) && index < flow.length - 1) page();
    }
    return { pages, geometry, overflow, unusable: headerHeight + footerHeight >= geometry.printableHeight };
}
