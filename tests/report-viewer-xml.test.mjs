import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { parseReportXml, analyzeReport } from '../scripts/Tools/ReportViewer/reportModel.js';
import { analyzeDataSources } from '../scripts/Tools/ReportViewer/reportDataValidation.js';

// XML integration without a production dependency: System.Xml parses the real
// XML, then an element adapter exposes the DOM methods used by the model layer.
// Browser rendering is exercised separately by report-viewer.browser.html.
class SystemXmlParser {
    parseFromString(source) {
        const serialized = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
            $ErrorActionPreference='Stop'
            [Console]::InputEncoding=[Text.Encoding]::UTF8
            [Console]::OutputEncoding=[Text.Encoding]::UTF8
            $doc=New-Object System.Xml.XmlDocument
            $doc.XmlResolver=$null
            $doc.LoadXml([Console]::In.ReadToEnd())
            function Convert-Element($element) {
                $attrs=[ordered]@{}
                foreach($attr in $element.Attributes) { $attrs[$attr.Name]=$attr.Value }
                $children=@(foreach($child in $element.ChildNodes) { if($child.NodeType -eq 'Element') { Convert-Element $child } })
                return @{ tagName=$element.get_Name(); attrs=$attrs; children=$children; textContent=$element.InnerText }
            }
            Convert-Element $doc.DocumentElement | ConvertTo-Json -Compress -Depth 100
        `], { input: source, encoding: 'utf8', windowsHide: true });
        function element(raw, parentElement = null) {
            const result = { tagName: raw.tagName, textContent: raw.textContent, parentElement,
                attributes: Object.entries(raw.attrs).map(([name, value]) => ({ name, value })),
                getAttribute: name => raw.attrs[name] ?? null,
                getElementsByTagName(name) {
                    return this.children.flatMap(child => [ ...(child.tagName === name ? [child] : []), ...child.getElementsByTagName(name) ]);
                } };
            result.children = raw.children.map(child => element(child, result));
            return result;
        }
        const documentElement = element(JSON.parse(serialized.replace(/^\uFEFF/, '')));
        return { documentElement, getElementsByTagName: name => [ ...(documentElement.tagName === name ? [documentElement] : []), ...documentElement.getElementsByTagName(name) ] };
    }
}

test('real XML parser preserves escaped Unicode, validates field schemas, and reports missing query bindings', { skip: process.platform !== 'win32' }, () => {
    const schema = Buffer.from('<SqlDataSource><ResultSchema><DataSet><View Name="rows"><Field Name="known"/></View></DataSet></ResultSchema></SqlDataSource>').toString('base64');
    const xml = `<?xml version="1.0"?><XtraReportsLayoutSerializer DataSource="#Ref-325" DataMember="rows" PageWidth="850" PageHeight="1100"><Bands><Item1 ControlType="DetailBand" HeightF="50"><Controls><Item1 ControlType="DevExpress.XtraReports.UI.XRLabel, DevExpress.XtraReports.v23.2" Text="Café &amp; B  C" SizeF="100,25"><ExpressionBindings><Item1 EventName="BeforePrint" PropertyName="Text" Expression="Concat([missing], ?missingParameter)"/></ExpressionBindings></Item1></Controls></Item1></Bands><ComponentStorage><Item1 Ref="325" ObjectType="DevExpress.DataAccess.Sql.SqlDataSource" Base64="${schema}"/></ComponentStorage></XtraReportsLayoutSerializer>`;
    const model = parseReportXml(xml, SystemXmlParser);
    assert.equal(model.root.children[0].children[0].children[0].children[0].attrs.Text, 'Café & B  C');
    assert.ok(!analyzeReport(model.root).some(issue => issue.severity === 'error'));
    const issues = analyzeDataSources(model, SystemXmlParser);
    assert.ok(issues.some(issue => issue.code === 'UNKNOWN_FIELD'), JSON.stringify(issues));
    assert.ok(issues.some(issue => issue.code === 'UNKNOWN_PARAMETER'));
    model.root.attrs.DataMember = 'missingQuery';
    assert.ok(analyzeDataSources(model, SystemXmlParser).some(issue => issue.code === 'DATA_MEMBER'));
});

test('existing example XML layouts parse and receive static diagnostics', { skip: process.platform !== 'win32' }, () => {
    const directory = new URL('../Examples/devexpress/', import.meta.url);
    let count = 0;
    function visit(directory) {
        for (const child of readdirSync(directory, { withFileTypes: true })) {
            const url = new URL(encodeURIComponent(child.name) + (child.isDirectory() ? '/' : ''), directory);
            if (child.isDirectory()) { visit(url); continue; }
            if (child.name !== 'print.xml') continue;
            const text = readFileSync(url, 'utf8');
            if (url.pathname.includes('/Base/')) {
                assert.throws(() => parseReportXml(text, SystemXmlParser)); // Existing fixture has a trailing extra >.
                count++;
                continue;
            }
            const model = parseReportXml(text, SystemXmlParser);
            assert.equal(model.root.tag, 'XtraReportsLayoutSerializer');
            assert.ok(analyzeReport(model.root).some(issue => issue.code === 'STATIC_PREVIEW'));
            count++;
        }
    }
    visit(directory);
    assert.ok(count > 0, 'No example report layouts were tested');
});
