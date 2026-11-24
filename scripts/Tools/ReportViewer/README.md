# Report Viewer

This is a client-side **design-layout preview and static analyzer**, not the
DevExpress document engine. It does not claim that a report with zero local
errors will render, query, execute scripts, or export successfully in DevExpress.

## Structure

| Module | Responsibility |
|---|---|
| `reportModel.js` | XML parsing, normalized types, physical units, geometry and static diagnostics |
| `reportDataValidation.js` | Embedded datasource XML, query/view names, simple field/parameter references |
| `reportPagination.js` | Fixed-page design projection, band order, section levels and band page breaks |
| `tool_reportViewer.js` | Input formats, safe rendering, diagnostics panel, selection and inspector |

Uploads accept XML/REPX layouts and the existing JSON envelope containing
`ReportTemplate`. Templates may contain XML directly, Base64 UTF-8 XML, or
gzip/zlib-compressed Base64 XML. Multi-report envelopes have a report selector.
DevExpress's native JSON serializer format is a different format and is not
silently interpreted as this application's envelope.

## Checks performed locally

Errors include malformed XML, wrong root element, invalid page geometry, malformed
numeric dimensions/padding, negative sizes, duplicate or dangling object
references, incorrect datasource reference targets, missing detail bands, invalid
table structure, incompatible nested page bands, missing query/view names in
available embedded schemas, malformed embedded datasource XML, incomplete
expression bindings, and unbalanced expression delimiters/string literals.

Warnings include sibling overlaps, printable-width/container overflow, duplicate
names, unknown styles, unknown simple fields/parameters in available schemas,
oversized bands, missing bounds, unsupported controls/bands, and unimplemented
paper presets without explicit dimensions. Hidden siblings do not contribute
overlap warnings; container-parent relationships are not counted as overlaps.

Messages include a severity, rule code, source name and explanation. Click a
message to locate and inspect its rendered control when available. Errors remain
visible outside the Preview tab, including after upload/parse failure. The list
can be filtered by severity; it displays up to 500 matching messages while the
summary counts all issues. Local rule codes are not presented as DevExpress XRE
codes: a similarly named check is not proof of identical analyzer behavior.

The original XML is preserved for viewing/copying; entities and whitespace are
never globally rewritten. Uploaded markup is rebuilt with an allowlist. Scripts,
event-handler attributes, DTD declarations and entity definitions are not run.
Database queries and external image URLs are not fetched automatically.

## Rendering coverage

Labels, checkbox states, embedded raster images, panels, weighted table
rows/cells, page information and horizontal lines are supported. Table cells can
be inspected individually and use the same label renderer for markup/bindings.
Assembly-qualified type names are normalized. Font/foreground/alignment inheritance
and named styles with explicit StylePriority flags are applied for the implemented
properties. XML visibility and report-unit/DPI-aware font/padding/border scaling
are respected. Unsupported controls appear as placeholders with diagnostics.

Pages have a fixed physical width/height. Page headers/footers repeat in the design
projection; root report headers appear once, before the first page header. Detail
reports are ordered by Level. Each detail band is represented once. Band-level
page breaks and keeping a group header with the first detail are projected.
Zoom updates both the page transform and its scroll bounds.

## Validation and rendering not verified locally

| Requires the DevExpress runtime | Why |
|---|---|
| Query execution, joins, credentials and actual rows | An embedded schema is not a live datasource |
| Full expression compilation and type checking | Lexical checks do not implement DevExpress functions or its type system |
| Scripts, calculated fields, summaries and conditional formatting | They execute during document creation |
| Data grouping and repeating detail rows | No report data is executed or fabricated |
| Exact pagination, CanGrow/CanShrink, column flow, repeated groups and subreports | Requires document-generation state and font metrics |
| Fonts, rich text, charts, barcodes, shapes, PDF content and complex images | These need control-specific layout/rendering engines |
| XLSX/PDF/DOCX export diagnostics and accessibility parity | Static HTML does not create DevExpress export bricks |

The viewer always displays a notice about this boundary. It does not translate
DevExpress expressions into JavaScript `eval`. Full 1:1 validation and output
would require integrating a licensed DevExpress runtime and surfacing its analyzer
and document-generation results; no server integration is included here.

## Tests

```powershell
node --experimental-default-type=module --test tests/*.test.mjs
```

The XML integration tests use Windows System.Xml through an element adapter.
They check real embedded schemas, Unicode/entity preservation and the supplied
XML examples. The existing `Base/print.xml` fixture intentionally remains unchanged:
its trailing extra `>` must be rejected, not silently repaired.

Serve the repository locally and open `tests/report-viewer.browser.html` to run
the DOM/rendering tests. Its result panel lists each result and the page title
becomes PASS or FAIL. These tests cover inspector/markup safety, DOM ownership,
assembly-qualified types, checkboxes, tables, physical scaling and pagination.
Browser execution was unavailable in the implementation environment; these
browser tests have been supplied but are not marked as verified.

## Primary references

- [DevExpress layout validation](https://docs.devexpress.com/XtraReports/402372/feature-guide-to-devexpress-reports/use-report-controls/manipulate-report-controls/validate-report-layout)
- [DevExpress analyzer messages](https://docs.devexpress.com/XtraReports/403060/report-designer-ides/report-designer-for-visual-studio/dock-panels/error-list/errors-warnings-and-information-messages)
- [Report units](https://docs.devexpress.com/XtraReports/DevExpress.XtraReports.UI.ReportUnit)
- [Banded report behavior](https://docs.devexpress.com/XtraReports/2587/feature-guide-to-devexpress-reports/introduction-to-banded-reports)
