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

### Generators
- **Printout From Form** - Generate DevExpress printouts from Form.io JSON files
- **Table From Form** - Generate SQL table creation statements from Form.io JSON
- **Form From Table** - Generate Form.io JSON from SQL table definitions

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

#### Signature Pad
- **Library**: Signature Pad
- **Version**: 4.0.0
- **CDN**: `https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js`
- **Source**: [https://github.com/szimek/signature_pad](https://github.com/szimek/signature_pad)
- **License**: MIT
- **Purpose**: HTML5 canvas-based signature pad for capturing signatures

#### Prettier (Code Formatting)
- **Library**: Prettier Standalone
- **Version**: 2.8.8
- **CDN Base**: `https://unpkg.com/prettier@2.8.8/`
- **Source**: [https://prettier.io/](https://prettier.io/)
- **License**: MIT
- **Purpose**: Code formatting and beautification

**Components Used:**
| Component | CDN Path | Purpose |
|-----------|----------|---------|
| Standalone | `standalone.js` | Core Prettier engine |
| HTML Parser | `parser-html.js` | HTML formatting |
| Babel Parser | `parser-babel.js` | JavaScript/JSX formatting |
| TypeScript Parser | `parser-typescript.js` | TypeScript formatting |
| PostCSS Parser | `parser-postcss.js` | CSS/SCSS/Less formatting |

#### JS Beautify
- **Library**: JS Beautify
- **Version**: 1.14.9
- **CDN Base**: `https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/`
- **Source**: [https://beautifier.io/](https://beautifier.io/)
- **License**: MIT
- **Purpose**: Alternative code beautification

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

#### He (HTML Entities)
- **Library**: He
- **Version**: 1.2.0
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/he/1.2.0/he.min.js`
- **Source**: [https://github.com/mathiasbynens/he](https://github.com/mathiasbynens/he)
- **License**: MIT
- **Purpose**: HTML entity encoding/decoding

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

## License

All tools developed in part or in full by Joshua "Blü" Morse.

---

## Version History

See [Patch Notes](patchNotes.html) for detailed version history and updates.