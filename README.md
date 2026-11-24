# UniTools

A collection of utilities for Form.io and DevExpress development.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [External Dependencies](#external-dependencies)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)

---

## Overview

UniTools is a browser-based toolkit designed to help developers work with Form.io forms and DevExpress reports. It provides viewers, generators, and utility tools that streamline the development workflow for form and report creation.

---

## Features

### Viewers
- **Form Viewer** - Preview Form.io JSON configurations and extract client/server scripts
- **Report Viewer** - Preview DevExpress Report configurations with zoom controls

The [Report Viewer implementation notes](scripts/Tools/ReportViewer/README.md)
describe its static validation rules, rendering coverage, test commands, and
the DevExpress runtime checks that cannot be verified by this client-side tool.

### Generators
- **Printout From Form** - Generate DevExpress printouts from Form.io JSON files
- **Table From Form** - Generate SQL table creation statements from Form.io JSON
- **TableUpdaterTool** - Generate ALTER statements to sync two table definitions
- **Form From Table** - Generate Form.io JSON from SQL table definitions
- **Mini Printout Module** - Embeddable one-click Form.io to DevExpress report converter

### Printout From Form maintenance

The main converter accepts a standard Form.io schema with a `components` array,
or the existing application export with an object/string `FormioTemplate`.
Input property order is irrelevant. Conversion works on a copy of the schema.

The conversion modules live in `scripts/Tools/PrintoutFromForm/`:

| Module | Responsibility |
|---|---|
| `componentMappings.js` | Form.io mapping registry: renderer, target profile, bindings, and datasource types |
| `definitions/fieldControls.js`, `definitions/layoutControls.js` | DevExpress presentation profiles |
| `formSchema.js` | Input validation, normalization, child traversal, datasource field discovery |
| `componentCleaner.js` | Recursive cleanup and repeating-section hoisting |
| `componentProcessor.js` | Control generation and layout, sized from rendered children |
| `reportLayout.js` | Moving control groups between bands while preserving relative coordinates |
| `gridModel.js` | Shared grid discovery, custom FormGrid classification, and procedure naming |
| `dataSource.js` | Embedded SQL datasource schemas |
| `reportCodec.js` | UTF-8, gzip, and base64 template encoding |
| `xmlProcessor.js`, `xmlValidator.js` | XML serialization, collection numbering, reference integrity |
| `tool_printoutFromForm.js` | Page settings, upload/download handlers, report bands, SQL generation |

See the [component mapping guide](scripts/Tools/PrintoutFromForm/MAPPINGS.md) for extension examples and the registry contract.

The downloaded JSON preserves this application's existing import envelope:
`ReportTemplate` contains gzip/base64 XML targeting DevExpress 23.2.5. It is
different from the JSON returned by DevExpress's `IReportJsonSerializer`.
SQL connections, table names, and stored procedures remain specific to the
existing backend; a native Form.io schema does not supply that database mapping.

Grid report flow uses one bound `DetailReportBand` per grid, containing a repeating
`GroupHeaderBand` and a row `DetailBand`. Following non-grid content is explicitly
bound back to the main form. Datasource entries are allocated from the actual
rendered grid markers, in order. Panels are split around grids with their heading
and before/after fields retained; grids are never serialized as panel controls.

Both `type: "formgrid"` and `type: "datagrid", IsFormGrid: true` use the custom
FormGrid path. `btn_view.Form_DBTable` identifies its dialog-table join. Without
that metadata, SQL selects the link table and conversion warns that referenced
fields may require a join. Procedure names now consistently follow
`cstm_<DepartmentName>_<FormName>_<gridKey>` (main form: `_Printout`) in the SQL,
datasource schema, and report binding. Regenerate/review the companion SQL when
updating reports; the converter does not install procedures in a database.

Repeating sections inside layouts are moved into separate report bands, with a
conversion warning. Panel content is split around grids while preserving field order; other affected layouts may change. Repeating grids inside
other grids, nested data paths in Container components, and arbitrary Form.io
JavaScript/conditional behavior are not translated into equivalent report logic.
The HTML preview is an approximation; verify final pagination and data binding
in the target DevExpress runtime. The embeddable Mini Printout Module still has
its own separate conversion core.

Run regression tests with Node.js 22 or newer:

```powershell
node --experimental-default-type=module --test tests/printout.test.mjs
```

The Windows integration test converts both a native schema and the supplied
example export, checks compression round trips, and parses the outer/embedded
XML with `System.Xml`. Unit tests use a minimal DOM substitute and do not check
browser typography or DevExpress rendering. The integration test is skipped on
other operating systems.

References: [Form.io form JSON](https://help.form.io/form-building/form-json),
[Form.io conditions](https://help.form.io/form-building/logic-and-conditions),
[DevExpress report units](https://docs.devexpress.com/XtraReports/DevExpress.XtraReports.UI.XtraReport.ReportUnit),
[DevExpress tables](https://docs.devexpress.com/XtraReports/DevExpress.XtraReports.UI.XRTable),
and [DevExpress JSON serialization](https://docs.devexpress.com/XtraReports/DevExpress.XtraReports.Web.ReportDesigner.Services.IReportJsonSerializer).

### Utilities
- **Code Formatter** - Format and beautify code in multiple languages
- **GUID Cheat Sheet** - Reference guide for common GUIDs

---

## Technologies Used

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Page structure and markup |
| CSS3 | - | Styling and layouts |
| JavaScript (ES6+) | - | Application logic and interactivity |

---

## Mini Printout Module

`Mini Printout Module` is a reusable version of the Printout From Form conversion engine designed for embedding into other websites.

### Location

- Module entry: `scripts/Tools/MiniPrintoutModule/mini_printout_module.js`
- Copied conversion core: `scripts/Tools/MiniPrintoutModule/core/`

### What It Does

- Opens a file picker when your button is clicked
- Accepts a Form.io JSON payload
- Converts it to DevExpress report JSON
- Automatically downloads the generated report JSON file
- Automatically downloads the generated SQL file

### Minimal Integration

```html
<button id="generatePrintoutBtn">Generate Printout</button>

<script type="module">
	import { attachMiniPrintoutModule } from './scripts/Tools/MiniPrintoutModule/mini_printout_module.js';

	attachMiniPrintoutModule({
		buttonId: 'generatePrintoutBtn'
	});
</script>
```

By default, the module auto-loads `./printout-config.dxs` (JSON format) from the same folder as the module entry script.

### Optional Hooks

- `onSuccess(result)` - Called after successful conversion/download
- `onError(error)` - Called if conversion fails
- `outputFileName` - Override output file name
- `sqlFileName` - Override generated SQL file name
- `downloadSql` - Set to `false` to disable SQL auto-download
- `pakoCdnUrl` - Override the pako CDN URL used for compression
- `configUrl` - Override settings file path (default: `./printout-config.dxs`)
- `config` - Provide settings object directly instead of loading a file
- `useConfigFile` - Set to `false` to skip loading `.dxs` file
- `forceReloadConfig` - Set to `true` to reload config file each conversion

---

## External Dependencies

### CSS Frameworks & Stylesheets

#### Bootstrap
- **Library**: Bootstrap CSS Framework
- **Version**: 5.3.0-alpha3 (primary), 5.1.3 (patch notes page)
- **CDN**: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css`
- **Source**: [https://getbootstrap.com/](https://getbootstrap.com/)
- **License**: MIT
- **Purpose**: Responsive grid system, UI components, and utility classes

#### Bootstrap Icons
- **Library**: Bootstrap Icons
- **Version**: 1.7.2
- **CDN**: `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css`
- **Source**: [https://icons.getbootstrap.com/](https://icons.getbootstrap.com/)
- **License**: MIT
- **Purpose**: Icon font library for UI elements

#### Google Fonts - Inter
- **Library**: Google Fonts
- **Font**: Inter (weights: 400, 500, 600)
- **CDN**: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap`
- **Source**: [https://fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter)
- **License**: SIL Open Font License 1.1
- **Purpose**: Primary typography font

#### Prism.js Themes
- **Library**: Prism.js Tomorrow Theme
- **Version**: 1.29.0
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css`
- **Source**: [https://prismjs.com/](https://prismjs.com/)
- **License**: MIT
- **Purpose**: Syntax highlighting theme for code blocks

---

### JavaScript Libraries

#### Bootstrap Bundle
- **Library**: Bootstrap JavaScript Bundle (includes Popper.js)
- **Version**: 5.3.0-alpha3
- **CDN**: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js`
- **Source**: [https://getbootstrap.com/](https://getbootstrap.com/)
- **License**: MIT
- **Purpose**: Bootstrap components requiring JavaScript (modals, tabs, tooltips, etc.)

#### Form.io
- **Library**: Form.io JavaScript SDK
- **Version**: Latest (via CDN)
- **CDN**: `https://cdn.form.io/formiojs/formio.full.min.js`
- **Source**: [https://form.io/](https://form.io/)
- **Documentation**: [https://help.form.io/](https://help.form.io/)
- **License**: MIT
- **Purpose**: Form rendering, validation, and form builder functionality
- **Used In**: Form Viewer, Form From Table, Printout From Form

#### Prism.js (Syntax Highlighting)
- **Library**: Prism.js Core & Language Components
- **Version**: 1.29.0
- **CDN Base**: `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/`
- **Source**: [https://prismjs.com/](https://prismjs.com/)
- **License**: MIT
- **Purpose**: Syntax highlighting for code display

**Components Used:**
| Component | CDN Path | Purpose |
|-----------|----------|---------|
| Core | `prism.min.js` | Core syntax highlighting engine |
| Autoloader | `plugins/autoloader/prism-autoloader.min.js` | Automatic language loading |
| C-like | `components/prism-clike.min.js` | C-like language support |
| JavaScript | `components/prism-javascript.min.js` | JavaScript syntax |
| TypeScript | `components/prism-typescript.min.js` | TypeScript syntax |
| JSON | `components/prism-json.min.js` | JSON syntax |
| Markup/HTML | `components/prism-markup.min.js` | HTML/XML syntax |
| CSS | `components/prism-css.min.js` | CSS syntax |
| SQL | `components/prism-sql.min.js` | SQL syntax |
| VB.NET | `components/prism-vbnet.min.js` | VB.NET syntax |
| BASIC | `components/prism-basic.min.js` | BASIC syntax |

#### Pako (Compression)
- **Library**: Pako
- **Version**: 2.0.4 / 2.1.0
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.4/pako.min.js`
- **CDN**: `https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js`
- **Source**: [https://github.com/nodeca/pako](https://github.com/nodeca/pako)
- **License**: MIT
- **Purpose**: zlib port to JavaScript for compression/decompression operations

#### Moment.js (Date/Time)
- **Library**: Moment.js
- **Version**: 2.29.4
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js`
- **Source**: [https://momentjs.com/](https://momentjs.com/)
- **License**: MIT
- **Purpose**: Date parsing, validation, manipulation, and formatting

#### Moment Timezone
- **Library**: Moment Timezone (with data)
- **Version**: 0.5.43
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.43/moment-timezone-with-data.min.js`
- **Source**: [https://momentjs.com/timezone/](https://momentjs.com/timezone/)
- **License**: MIT
- **Purpose**: Timezone support for Moment.js

#### Prettier (Code Formatting)
- **Library**: Prettier Standalone
- **Version**: 2.8.8
- **CDN Base**: `https://unpkg.com/prettier@2.8.8/`
- **Source**: [https://prettier.io/](https://prettier.io/)
- **License**: MIT
- **Purpose**: Code formatting and beautification (HTML, CSS, JSON, TypeScript, JSX)

**Components Used:**
| Component | CDN Path | Purpose |
|-----------|----------|---------|
| Standalone | `standalone.js` | Core Prettier engine |
| HTML Parser | `parser-html.js` | HTML formatting |
| Babel Parser | `parser-babel.js` | JSX formatting |
| TypeScript Parser | `parser-typescript.js` | TypeScript formatting |
| PostCSS Parser | `parser-postcss.js` | CSS/SCSS/Less formatting |

#### JS Beautify
- **Library**: JS Beautify
- **Version**: 1.14.9
- **CDN Base**: `https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/`
- **Source**: [https://beautifier.io/](https://beautifier.io/)
- **License**: MIT
- **Purpose**: JavaScript beautification with Allman-style brace placement

**Code Formatter Usage:**
- JavaScript in the Code Formatter tool uses `js_beautify(...)` with `brace_style: "expand"` so opening braces appear on the next line.
- If JS Beautify is unavailable at runtime, the tool falls back to Prettier for JavaScript.

**Components Used:**
| Component | CDN Path | Purpose |
|-----------|----------|---------|
| Beautify | `beautify.min.js` | JavaScript beautification |
| Beautify HTML | `beautify-html.min.js` | HTML beautification |
| Beautify CSS | `beautify-css.min.js` | CSS beautification |

#### SQL Formatter
- **Library**: SQL Formatter
- **Version**: 12.2.3
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/sql-formatter/12.2.3/sql-formatter.min.js`
- **Source**: [https://github.com/sql-formatter-org/sql-formatter](https://github.com/sql-formatter-org/sql-formatter)
- **License**: MIT
- **Purpose**: SQL query formatting and beautification

#### VKBeautify
- **Library**: VKBeautify
- **Version**: 0.99.3
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/vkbeautify/0.99.3/vkbeautify.min.js`
- **Source**: [https://github.com/nicedoc/vkbeautify](https://github.com/nicedoc/vkbeautify)
- **License**: MIT
- **Purpose**: XML and CSS beautification

#### Lang Detector
- **Library**: Lang Detector
- **Version**: 1.0.6
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/lang-detector/1.0.6/lang-detector.min.js`
- **Source**: [https://github.com/nicedoc/lang-detector](https://github.com/nicedoc/lang-detector)
- **License**: MIT
- **Purpose**: Programming language detection from code snippets

---

## CDN Sources

All external dependencies are loaded from the following CDN providers:

| CDN Provider | URL | Libraries Hosted |
|--------------|-----|------------------|
| jsDelivr | https://cdn.jsdelivr.net | Bootstrap, Pako, Signature Pad |
| cdnjs | https://cdnjs.cloudflare.com | Prism.js, Moment.js, JS Beautify, SQL Formatter, VKBeautify, He, Lang Detector |
| unpkg | https://unpkg.com | Prettier |
| Google Fonts | https://fonts.googleapis.com | Inter font family |
| Form.io CDN | https://cdn.form.io | Form.io SDK |

---

## Version History

See [Patch Notes](patchNotes.html) for detailed version history and updates.
