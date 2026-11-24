import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeReport, expressionIssue, pageGeometry, shortType, numbers } from '../scripts/Tools/ReportViewer/reportModel.js';
import { paginateReport } from '../scripts/Tools/ReportViewer/reportPagination.js';
import { ReportViewer } from '../scripts/Tools/ReportViewer/tool_reportViewer.js';

let nextId = 0;
function node(tag, attrs = {}, children = []) {
    const result = { tag, attrs, type: shortType(attrs.ControlType), id: String(++nextId), children };
    children.forEach(child => { child.parent = result; });
    return result;
}
const band = (type, height, children = [], attrs = {}) => node('Item1', { ControlType: type, HeightF: String(height), ...attrs }, children);
const root = bands => node('XtraReportsLayoutSerializer', { PageWidth: '850', PageHeight: '1100', Margins: '50,50,50,50' }, [node('Bands', {}, bands)]);

test('report geometry honors physical units, zero margins, and explicit landscape dimensions', () => {
    assert.equal(pageGeometry(root([])).pixelsPerUnit, 0.96);
    const metric = root([]); metric.attrs = { ReportUnit: 'TenthsOfAMillimeter', PaperKind: 'A4', Margins: '0,0,0,0' };
    assert.ok(Math.abs(pageGeometry(metric).width - 2100) < 0.001);
    assert.equal(pageGeometry(metric).dpi, 254);
    const landscape = root([]); Object.assign(landscape.attrs, { Landscape: 'true', PageWidth: '1100', PageHeight: '850' });
    assert.equal(pageGeometry(landscape).width, 1100);
    assert.equal(pageGeometry(landscape).height, 850);
    landscape.attrs.ReportUnit = 'Unknown';
    assert.ok(analyzeReport(landscape).some(issue => issue.code === 'REPORT_UNIT'));
});
test('strict numeric parsing rejects partially valid values instead of converting them to zero', () => {
    assert.equal(numbers('12px,30', 2), null);
    assert.equal(numbers('0,', 2), null);
    assert.deepEqual(numbers('-1,0', 2), [-1, 0]);
});
test('reference validation preserves sparse IDs and detects duplicates and dangling pointers', () => {
    const model = root([band('DetailBand', 20)]);
    model.children.push(node('ComponentStorage', {}, [node('Item1', { Ref: '325', ObjectType: 'DevExpress.DataAccess.Sql.SqlDataSource' })]));
    model.attrs.DataSource = '#Ref-325';
    assert.ok(!analyzeReport(model).some(issue => issue.code.includes('REFERENCE') || issue.code.includes('REF')));
    model.children.push(node('Other', { Ref: '325', DataSource: '#Ref-999' }));
    const codes = analyzeReport(model).map(issue => issue.code);
    assert.ok(codes.includes('DUPLICATE_REF'));
    assert.ok(codes.includes('MISSING_REFERENCE'));
});
test('layout checks detect overlaps and horizontal overflow without treating band growth as a page error', () => {
    const controls = node('Controls', {}, [
        node('Item1', { ControlType: 'XRLabel', Name: 'one', LocationFloat: '0,0', SizeF: '100,30' }),
        node('Item2', { ControlType: 'XRLabel', Name: 'two', LocationFloat: '50,10', SizeF: '100,30' }),
        node('Item3', { ControlType: 'XRLabel', Name: 'outside', LocationFloat: '740,0', SizeF: '20,30' })
    ]);
    const issues = analyzeReport(root([band('DetailBand', 40, [controls])]));
    assert.ok(issues.some(issue => issue.code === 'OVERLAP'));
    assert.ok(issues.some(issue => issue.code === 'PRINT_AREA' && issue.name === 'outside'));
    assert.ok(!issues.some(issue => issue.severity === 'error'));
});
test('expression lexical checks respect quoted brackets, escaped quotes and balanced function calls', () => {
    for (const expression of ["Iif([value] = True, '(', ')')", "Concat('it''s', [name])", '[field]']) assert.equal(expressionIssue(expression), null);
    for (const expression of ['Iif([value], True', '[field', "'unclosed", ')']) assert.ok(expressionIssue(expression));
});
test('unknown controls remain warnings and runtime validation remains explicitly unverified', () => {
    const model = root([band('DetailBand', 30, [node('Controls', {}, [node('Item1', { ControlType: 'XRChart', Name: 'chart', SizeF: '100,30' })])])]);
    const issues = analyzeReport(model);
    assert.ok(issues.some(issue => issue.code === 'UNSUPPORTED_CONTROL' && issue.name === 'chart'));
    assert.ok(issues.some(issue => issue.code === 'STATIC_PREVIEW'));
});
test('pagination respects paper size, margin space, page bands, section levels, and explicit page breaks', () => {
    const model = root([
        band('DetailReportBand', 0, [node('Bands', {}, [band('DetailBand', 500)])], { Level: '1' }),
        band('DetailBand', 100),
        band('DetailReportBand', 0, [node('Bands', {}, [band('DetailBand', 500)])], { Level: '0' }),
        band('PageHeaderBand', 25), band('PageFooterBand', 25), band('TopMarginBand', 50)
    ]);
    const { pages } = paginateReport(model);
    assert.equal(pages.length, 2);
    assert.equal(pages[0].find(item => item.node.type === 'DetailBand').y, 75);
    assert.equal(pages[0].find(item => item.node.type === 'PageFooterBand').y, 1025);
    assert.ok(pages.every(page => page.some(item => item.node.type === 'PageHeaderBand')));
    const broken = root([band('DetailBand', 10, [], { PageBreak: 'AfterBand' }), band('ReportFooterBand', 10)]);
    assert.equal(paginateReport(broken).pages.length, 2);
});
test('oversize bands do not cause an infinite stream of blank pages', () => {
    const result = paginateReport(root([band('DetailBand', 3000)]));
    assert.equal(result.pages.length, 1);
    assert.equal(result.overflow.length, 1);
});

test('report header precedes the first page header and is not repeated on later pages', () => {
    const model = root([band('ReportHeaderBand', 40), band('PageHeaderBand', 20), band('DetailBand', 800), band('ReportFooterBand', 300)]);
    const { pages } = paginateReport(model);
    assert.equal(pages.length, 2);
    assert.equal(pages[0].find(item => item.node.type === 'ReportHeaderBand').y, 50);
    assert.equal(pages[0].find(item => item.node.type === 'PageHeaderBand').y, 90);
    assert.ok(!pages[1].some(item => item.node.type === 'ReportHeaderBand'));
});

test('missing or undersized band height does not silently hide its controls', () => {
    const model = root([band('DetailBand', 0, [node('Controls', {}, [node('Item1', { ControlType: 'XRLabel', LocationFloat: '0,10', SizeF: '100,25' })])])]);
    assert.equal(paginateReport(model).pages[0][0].height, 35);
    assert.ok(analyzeReport(model).some(issue => issue.code === 'BAND_EXTENT'));
});
test('unit-sensitive renderer helpers keep padding DPI and font sizes consistent', () => {
    const viewer = Object.create(ReportViewer.prototype);
    viewer.dpi = 254;
    assert.deepEqual(viewer.parsePadding('10,20,30,40,100'), { left: 25.4, right: 50.8, top: 76.2, bottom: 101.6 });
    assert.equal(viewer.prettyPrintXml('<Report Text="A &amp; B  C"/>'), '<Report Text="A &amp; B  C"/>');
    assert.equal(viewer.parseColor('128,255,0,0'), 'rgba(255,0,0,0.5019607843137255)');
});
