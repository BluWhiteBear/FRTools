import { analyzeDataSources } from './reportDataValidation.js';
import { parseReportXml, analyzeReport, shortType, unitDpi } from './reportModel.js';
import { paginateReport } from './reportPagination.js';

// Report XML to HTML Converter and Viewer
export class ReportViewer {
    constructor(container) {
        this.container = container;
        this.scale = 1.0;
        this.showBoundaries = false;
        this.selectedComponent = null;
        this.reportData = null;
        this.initEventHandlers();
    }

    initEventHandlers() {
        document.getElementById('zoomIn')?.addEventListener('click', () => this.setZoom(this.scale * 1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.setZoom(this.scale * 0.8));

        const boundaryToggle = document.getElementById('showBoundaries');
        const applyBoundaries = (enabled) => {
            this.showBoundaries = Boolean(enabled);
            this.container.classList.toggle('show-boundaries', this.showBoundaries);

            if (!boundaryToggle) return;

            if (boundaryToggle.tagName === 'BUTTON') {
                boundaryToggle.setAttribute('aria-pressed', this.showBoundaries ? 'true' : 'false');
                boundaryToggle.classList.toggle('btn-primary', this.showBoundaries);
                boundaryToggle.classList.toggle('btn-outline-secondary', !this.showBoundaries);
            } else if ('checked' in boundaryToggle) {
                boundaryToggle.checked = this.showBoundaries;
            }
        };

        if (boundaryToggle) {
            if (boundaryToggle.tagName === 'BUTTON') {
                boundaryToggle.addEventListener('click', () => applyBoundaries(!this.showBoundaries));
                applyBoundaries(false);
            } else {
                boundaryToggle.addEventListener('change', (e) => applyBoundaries(e.target.checked));
            }
        }

        document.getElementById('reportUpload')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('copyJsonBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-json'));
        document.getElementById('copyXmlBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-xml'));
    }

    async handleFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const generation = this.uploadGeneration = (this.uploadGeneration || 0) + 1;
        this.container.replaceChildren();
        this.selectedComponent = null;
        this.reportData = null;
        const selector = document.getElementById('reportSelection');
        if (selector) selector.hidden = true;
        for (const id of ['devexpress-json', 'devexpress-xml']) document.getElementById(id)?.replaceChildren();
        this.showDiagnostics([{ severity: 'info', code: 'LOADING', message: 'Reading report…' }]);
        try {
            const text = await file.text();
            if (generation !== this.uploadGeneration) return;
            if (!text.trim()) throw new Error('File content is empty.');
            let xml;
            if (text.trimStart().startsWith('<')) {
                xml = text;
                this.renderJsonOutput({ format: 'XML report layout' });
            } else {
                const data = JSON.parse(text);
                const reports = Array.isArray(data) ? data : [data];
                if (!reports.length || reports.some(report => typeof report?.ReportTemplate !== 'string')) throw new Error('Expected report JSON with a ReportTemplate string, or an XML/REPX layout.');
                this.renderJsonOutput(data);
                this.uploadedReports = reports;
                const selector = document.getElementById('reportSelection');
                if (selector) {
                    selector.replaceChildren();
                    reports.forEach((report, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = report.ReportName || 'Report ' + (index + 1);
                        selector.appendChild(option);
                    });
                    selector.hidden = reports.length < 2;
                    selector.onchange = () => {
                        try { const content = this.decompressReport(reports[Number(selector.value)].ReportTemplate); this.renderXmlOutput(content); this.renderReport(content); }
                        catch (error) { this.reportFailure(error); }
                    };
                }
                xml = this.decompressReport(reports[0].ReportTemplate);
            }
            const output = document.getElementById('output-wrapper');
            if (output) output.style.display = 'block';
            this.renderXmlOutput(xml);
            this.renderReport(xml);
            const previewTab = document.getElementById('preview-tab');
            if (previewTab) { previewTab.classList.remove('disabled'); globalThis.bootstrap?.Tab.getOrCreateInstance(previewTab).show(); }
        } catch (error) { if (generation === this.uploadGeneration) this.reportFailure(error); }
    }

    reportFailure(error) {
        this.container.replaceChildren();
        this.reportData = null;
        this.selectedComponent = null;
        this.updateInspector(null);
        this.showDiagnostics([{ severity: 'error', code: 'LOAD_FAILED', message: error.message || String(error) }]);
    }

    showDiagnostics(diagnostics) {
        this.diagnostics = diagnostics;
        let panel = this.diagnosticsPanel || document.getElementById('reportDiagnostics');
        if (!panel) {
            panel = document.createElement('section');
            panel.className = 'report-diagnostics';
            panel.setAttribute('aria-label', 'Report validation');
            panel.setAttribute('aria-live', 'polite');
            this.container.parentElement.before(panel);
            this.diagnosticsPanel = panel;
        }
        panel.hidden = false;
        this.diagnosticsPanel = panel;
        panel.replaceChildren();
        const heading = document.createElement('strong');
        const counts = level => diagnostics.filter(item => item.severity === level).length;
        heading.textContent = 'Report checks: ' + counts('error') + ' errors, ' + counts('warning') + ' warnings, ' + counts('info') + ' notices';
        panel.appendChild(heading);
        const filter = document.createElement('select');
        filter.setAttribute('aria-label', 'Filter report diagnostics');
        for (const level of ['all', 'error', 'warning', 'info']) {
            const option = document.createElement('option'); option.value = level; option.textContent = level === 'all' ? 'All messages' : level; filter.appendChild(option);
        }
        panel.appendChild(filter);
        const list = document.createElement('ul');
        panel.appendChild(list);
        const update = () => {
            list.replaceChildren();
            diagnostics.filter(item => filter.value === 'all' || filter.value === item.severity).slice(0, 500).forEach(item => {
                const row = document.createElement('li');
                row.className = 'diagnostic-' + item.severity;
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = item.severity.toUpperCase() + ' · ' + item.code + (item.name ? ' · ' + item.name : '') + ': ' + item.message;
                button.onclick = () => {
                    const target = Array.from(this.container.querySelectorAll('[data-viewer-id]')).find(element => element.dataset.viewerId === item.nodeId);
                    if (target) { target.scrollIntoView({ block: 'center' }); this.selectComponent(target); }
                };
                row.appendChild(button); list.appendChild(row);
            });
            if (diagnostics.length > 500) { const note = document.createElement('li'); note.textContent = 'Showing the first 500 matching messages.'; list.appendChild(note); }
        };
        filter.onchange = update;
        update();
    }

    renderJsonOutput(jsonData) {
        const jsonPre = document.getElementById('devexpress-json');
        if (!jsonPre) return;

        jsonPre.className = 'language-json m-0 text-light';
        let jsonCode = jsonPre.querySelector('code');
        if (!jsonCode) {
            jsonCode = document.createElement('code');
            jsonCode.className = 'language-json';
            jsonPre.appendChild(jsonCode);
        }

        jsonCode.textContent = JSON.stringify(jsonData, null, 2);
        if (typeof Prism !== 'undefined') Prism.highlightElement(jsonCode);
    }

    renderXmlOutput(xmlData) {
        const xmlPre = document.getElementById('devexpress-xml');
        if (!xmlPre) return;

        xmlPre.className = 'language-markup m-0 text-light';
        let xmlCode = xmlPre.querySelector('code');
        if (!xmlCode) {
            xmlCode = document.createElement('code');
            xmlCode.className = 'language-markup';
            xmlPre.appendChild(xmlCode);
        }

        xmlCode.textContent = this.prettyPrintXml(xmlData);
        if (typeof Prism !== 'undefined') Prism.highlightElement(xmlCode);
    }

    decompressReport(template) {
        if (typeof template !== 'string' || !template.trim()) throw new Error('ReportTemplate is empty.');
        if (template.trimStart().startsWith('<')) return template;
        const compressed = template.replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compressed) || compressed.length % 4 === 1) throw new Error('ReportTemplate is not valid Base64.');
        const bytes = Uint8Array.from(atob(compressed), character => character.charCodeAt(0));
        const plain = new TextDecoder().decode(bytes);
        if (plain.trimStart().startsWith('<')) return plain;
        if (!globalThis.pako) throw new Error('The report decompression library did not load.');
        try { return pako.inflate(bytes, { to: 'string' }); }
        catch { throw new Error('ReportTemplate could not be decompressed as gzip or zlib XML.'); }
    }

    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            await navigator.clipboard.writeText(element.textContent || '');
        } catch (err) {
            console.error('Failed to copy content to clipboard:', err);
        }
    }

    // Keep the exact uploaded XML. Reformatting entities changes report content.
    prettyPrintXml(xml) { return xml; }

    renderReport(xmlString) {
        try {
            const model = parseReportXml(xmlString);
            this.model = model;
            this.reportData = model.document;
            this.selectedComponent = null;
            this.dpi = model.geometry.dpi;
            this.unitScale = model.geometry.pixelsPerUnit;
            this.currentMargins = { left: model.geometry.margins[0], right: model.geometry.margins[1] };
            const issues = [...analyzeReport(model.root), ...analyzeDataSources(model)];
            this.styles = new Map(Array.from(model.document.querySelectorAll('StyleSheet > *'), style => [style.getAttribute('Name'), style]));
            const pagination = paginateReport(model.root);
            pagination.overflow.forEach(node => issues.push({ severity: 'warning', code: 'OVERSIZE_BAND', message: 'Band is taller than the printable page. Runtime splitting cannot be reproduced from design bounds.', nodeId: node.id, name: node.attrs.Name }));
            if (pagination.unusable) issues.push({ severity: 'error', code: 'PAGE_BANDS', message: 'Page header and footer leave no body area.' });
            this.container.replaceChildren();
            this.showDiagnostics(issues);
            if (issues.some(item => ['PAGE_GEOMETRY', 'MARGINS'].includes(item.code))) return false;
            pagination.pages.forEach((bands, pageIndex) => {
                const frame = document.createElement('div');
                frame.className = 'report-page-frame';
                const page = document.createElement('div');
                page.className = 'report-page';
                page.dataset.pageNumber = pageIndex + 1;
                page.style.width = model.geometry.width + 'px';
                page.style.height = model.geometry.height + 'px';
                this.applyFont(page, model.root.attrs.Font || 'Times New Roman, 9pt');
                for (const { node, y, height } of bands) {
                    const band = this.createBandElement(node.element);
                    band.style.top = y + 'px';
                    band.style.height = height + 'px';
                    this.processComponents(node.element, band, this.currentMargins.left);
                    page.appendChild(band);
                }
                frame.appendChild(page);
                this.container.appendChild(frame);
            });
            this.container.querySelectorAll('.page-info-placeholder').forEach(element => {
                const page = element.closest('.report-page');
                element.textContent = element.dataset.pageInfo === 'Number' ? page.dataset.pageNumber : 'Page ' + page.dataset.pageNumber + ' of ' + pagination.pages.length;
            });
            this.setZoom(this.scale);
            this.updateInspector(null);
            return true;
        } catch (error) { this.reportFailure(error); return false; }
    }

    parseMargins(marginsStr) {
        if (!marginsStr) return { left: 50, right: 50, top: 50, bottom: 50 };
        const p = marginsStr.split(',').map((n) => parseFloat(n.trim()) || 0);
        return {
            left: p[0] ?? 50,
            right: p[1] ?? 50,
            top: p[2] ?? 50,
            bottom: p[3] ?? 50,
        };
    }

    createBandElement(bandXml) {
        const band = document.createElement('div');
        band.className = 'report-band';

        const controlType = shortType(bandXml.getAttribute('ControlType'));
        band.dataset.bandType = controlType;

        const name = bandXml.getAttribute('Name');
        if (name) band.dataset.name = name;

        band.dataset.xml = bandXml.outerHTML;
        band.dataset.viewerId = this.model?.byElement.get(bandXml)?.id || '';
        this.markIssues(band);
        band.addEventListener('click', event => {
            event.stopPropagation();
            this.selectComponent(band);
        });
        band.style.height = `${parseFloat(bandXml.getAttribute('HeightF')) || 0}px`;
        this.applyVisualStyles(band, bandXml);
        return band;
    }

    processComponents(parentXml, parentElement, xOffset = 0) {
        const controls = this.childByTag(parentXml, 'Controls');
        if (!controls) return;

        Array.from(controls.children).forEach((controlXml) => {
            const controlType = shortType(controlXml.getAttribute('ControlType'));
            if (!controlType.startsWith('XR') || controlXml.getAttribute('Visible') === 'false') return;
            const child = this.createComponentElement(controlXml, xOffset);
            if (child) parentElement.appendChild(child);
        });
    }

    /** Find the first direct child element whose tagName matches (case-sensitive, for XML). */
    childByTag(el, tagName) {
        return Array.from(el.children).find((c) => c.tagName === tagName) || null;
    }

    createComponentElement(componentXml, xOffset = 0) {
        if (componentXml.getAttribute('Visible') === 'false') return null;
        const controlType = shortType(componentXml.getAttribute('ControlType'));

        const element = document.createElement('div');
        element.className = 'report-component';
        if (controlType) {
            // XRLabel → component-label, XRCheckBox → component-check-box, XRTable → component-table …
            const suffix = controlType
                .replace(/^XR/, '')
                .replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' + c.toLowerCase() : c.toLowerCase()));
            element.classList.add(`component-${suffix}`);
        }
        element.dataset.type = controlType;

        const name = componentXml.getAttribute('Name');
        if (name) element.dataset.name = name;

        const locStr = componentXml.getAttribute('LocationFloat') || componentXml.getAttribute('LocationF') || '0,0';
        const sizeStr = componentXml.getAttribute('SizeF');
        if (locStr && sizeStr) {
            const [x, y] = locStr.split(',').map((n) => parseFloat(n.trim()) || 0);
            const [w, h] = sizeStr.split(',').map((n) => parseFloat(n.trim()) || 0);
            element.style.left = `${x + xOffset}px`;
            element.style.top = `${y}px`;
            element.style.width = `${w}px`;
            element.style.height = `${h}px`;
        }

        // Apply common non-font visual styles for every control type.
        this.applyVisualStyles(element, componentXml);

        element.dataset.xml = componentXml.outerHTML;
        element.style.whiteSpace = componentXml.getAttribute('Multiline') === 'true' ? 'pre-wrap' : componentXml.getAttribute('WordWrap') === 'false' ? 'nowrap' : 'normal';
        element.dataset.viewerId = this.model?.byElement.get(componentXml)?.id || '';
        if (componentXml.getAttribute('Visible') === 'false') element.hidden = true;
        this.markIssues(element);
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectComponent(element);
        });

        switch (controlType) {
            case 'XRLabel':
                this.renderLabel(element, componentXml);
                break;
            case 'XRCheckBox':
                this.renderCheckBox(element, componentXml);
                break;
            case 'XRPictureBox':
                this.renderPictureBox(element, componentXml);
                break;
            case 'XRPanel':
                this.renderPanel(element, componentXml);
                break;
            case 'XRTable':
                this.renderTable(element, componentXml);
                break;
            case 'XRPageInfo':
                this.renderPageInfo(element, componentXml);
                break;
            case 'XRLine':
                this.renderLine(element, componentXml);
                break;
            case 'XRPageBreak':
                element.textContent = 'Page break';
                break;
            default:
                element.textContent = '[' + controlType + ': preview unavailable]';
                element.classList.add('unsupported-control');
                break;
        }

        return element;
    }

    parseFont(fontStr) {
        if (!fontStr) return null;
        const firstComma = fontStr.indexOf(',');
        if (firstComma === -1) {
            return { family: fontStr.trim(), size: 10, bold: false, italic: false, underline: false, strikeout: false };
        }

        const family = fontStr.substring(0, firstComma).trim();
        const rest = fontStr.substring(firstComma + 1).trim();
        const parts = rest.split(',').map((p) => p.trim());

        const sizeMatch = (parts[0] || '').match(/(\d+(?:\.\d+)?)\s*pt/i);
        const size = sizeMatch ? parseFloat(sizeMatch[1]) : 10;

        const styleStr = parts.slice(1).join(' ').toLowerCase();
        return {
            family,
            size,
            bold: styleStr.includes('bold'),
            italic: styleStr.includes('italic'),
            underline: styleStr.includes('underline'),
            strikeout: styleStr.includes('strikeout'),
        };
    }

    parseColor(colorStr) {
        if (!colorStr) return null;
        const lc = colorStr.toLowerCase().trim();
        if (lc === 'transparent') return 'transparent';
        if (/^[0-9a-f]{6}$/.test(lc)) return `#${lc}`;

        if (/^[0-9a-f]{8}$/.test(lc)) {
            const a = parseInt(lc.substring(0, 2), 16) / 255;
            const hex = lc.substring(2);
            if (a >= 1) return `#${hex}`;
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r},${g},${b},${a.toFixed(2)})`;
        }

        const argb = colorStr.split(',').map(value => Number(value.trim()));
        if (argb.length === 4 && argb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return 'rgba(' + argb.slice(1).join(',') + ',' + argb[0] / 255 + ')';
        if (colorStr.startsWith('#')) return colorStr;
        return colorStr;
    }

    parsePadding(paddingStr) {
        if (!paddingStr) return null;
        const p = paddingStr.split(',').map((n) => parseFloat(n.trim()) || 0);
        const factor = (this.dpi || 100) / (p[4] || 100);
        for (let i = 0; i < 4; i++) p[i] *= factor;
        if (p.length < 4) return null;
        return { left: p[0], right: p[1], top: p[2], bottom: p[3] };
    }

    applyBorders(element, bordersStr, borderColorStr, borderWidthStr) {
        if (!bordersStr || bordersStr.toLowerCase() === 'none') return;

        const color = this.parseColor(borderColorStr) || '#000000';
        const width = borderWidthStr === null || borderWidthStr === undefined ? (this.dpi || 100) / 96 : Math.max(0, Number(borderWidthStr)) * (this.dpi || 100) / 96;
        const bw = `${width}px solid ${color}`;

        if (bordersStr.toLowerCase() === 'all') {
            element.style.border = bw;
            return;
        }

        const sides = bordersStr.toLowerCase().split(',').map((s) => s.trim());
        if (sides.includes('left')) element.style.borderLeft = bw;
        if (sides.includes('right')) element.style.borderRight = bw;
        if (sides.includes('top')) element.style.borderTop = bw;
        if (sides.includes('bottom')) element.style.borderBottom = bw;
    }

    applyVisualStyles(element, xmlData) {
        this.applyBorders(
            element,
            this.effectiveAttribute(xmlData, 'Borders'),
            this.effectiveAttribute(xmlData, 'BorderColor'),
            this.effectiveAttribute(xmlData, 'BorderWidth')
        );

        const backColor = this.parseColor(this.effectiveAttribute(xmlData, 'BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        const foreColor = this.parseColor(this.effectiveAttribute(xmlData, 'ForeColor'));
        if (foreColor) element.style.color = foreColor;
    }

    applyFont(element, fontStr) {
        const font = this.parseFont(fontStr);
        if (!font) return;

        element.style.fontFamily = `"${font.family}", serif`;
        element.style.fontSize = `${font.size * (this.dpi || 100) / 72}px`;
        element.style.fontWeight = font.bold ? 'bold' : 'normal';
        element.style.fontStyle = font.italic ? 'italic' : 'normal';

        const decorations = [];
        if (font.underline) decorations.push('underline');
        if (font.strikeout) decorations.push('line-through');
        if (decorations.length) element.style.textDecoration = decorations.join(' ');
    }

    applyTextAlignment(element, textAlignment) {
        if (!textAlignment) return;
        const ta = textAlignment.toLowerCase();

        const justify = ta.includes('right') ? 'flex-end' : ta.includes('center') ? 'center' : 'flex-start';
        const align = ta.includes('bottom') ? 'flex-end' : ta.includes('middle') ? 'center' : 'flex-start';
        const text = ta.includes('right') ? 'right' : ta.includes('center') ? 'center' : 'left';

        element.style.display = 'flex';
        element.style.justifyContent = justify;
        element.style.alignItems = align;
        element.style.textAlign = text;
    }

    sanitizeMarkup(markup) {
        // Parse into an inert template, then rebuild with a small tag/attribute
        // allowlist. Never retain event handlers, URLs or uploaded HTML styles.
        const template = document.createElement('template');
        template.innerHTML = markup
            .replace(/<size=(\d+(?:\.\d+)?)>/gi, '<span data-report-size="$1">').replace(/<\/size>/gi, '</span>')
            .replace(/<color=([#a-zA-Z0-9(),. %]+)>/gi, '<span data-report-color="$1">').replace(/<\/color>/gi, '</span>');
        const output = document.createElement('div');
        const allowed = new Set(['B', 'I', 'U', 'EM', 'STRONG', 'SPAN', 'BR', 'S', 'SUB', 'SUP']);
        function copy(source, target) {
            for (const child of source.childNodes) {
                if (child.nodeType === 3) { target.appendChild(document.createTextNode(child.textContent)); continue; }
                if (child.nodeType !== 1 || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(child.tagName)) continue;
                if (!allowed.has(child.tagName)) { copy.call(this, child, target); continue; }
                const element = document.createElement(child.tagName.toLowerCase());
                const size = Number(child.getAttribute('data-report-size'));
                if (size > 0 && size <= 500) element.style.fontSize = size * (this.dpi || 100) / 72 + 'px';
                const color = child.getAttribute('data-report-color');
                if (color && /^(#[a-f0-9]{3,8}|[a-z]+|rgba?\([\d., %]+\))$/i.test(color)) element.style.color = color;
                copy.call(this, child, element); target.appendChild(element);
            }
        }
        copy.call(this, template.content, output);
        return output.innerHTML;
    }

    effectiveAttribute(node, property) {
        const style = this.styles?.get(node.getAttribute('StyleName'));
        const priority = this.childByTag(node, 'StylePriority');
        const fromStyle = style?.getAttribute(property);
        if (fromStyle !== null && fromStyle !== undefined && priority?.getAttribute('Use' + property) === 'false') return fromStyle;
        const own = node.getAttribute(property);
        if (own !== null) return own;
        if (fromStyle !== null && fromStyle !== undefined) return fromStyle;
        if (['Font', 'ForeColor', 'TextAlignment'].includes(property) && node.parentElement) return this.effectiveAttribute(node.parentElement, property);
        return null;
    }

    renderLabel(element, xmlData) {
        this.applyFont(element, this.effectiveAttribute(xmlData, 'Font'));
        this.applyTextAlignment(element, this.effectiveAttribute(xmlData, 'TextAlignment'));
        this.applyBorders(
            element,
            this.effectiveAttribute(xmlData, 'Borders'),
            this.effectiveAttribute(xmlData, 'BorderColor'),
            this.effectiveAttribute(xmlData, 'BorderWidth')
        );

        const padding = this.parsePadding(this.effectiveAttribute(xmlData, 'Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        const backColor = this.parseColor(this.effectiveAttribute(xmlData, 'BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        const foreColor = this.parseColor(this.effectiveAttribute(xmlData, 'ForeColor'));
        if (foreColor) element.style.color = foreColor;

        const exprNode = Array.from(this.childByTag(xmlData, 'ExpressionBindings')?.children || [])
            .find((n) => n.getAttribute('PropertyName') === 'Text');

        if (exprNode) {
            element.textContent = exprNode.getAttribute('Expression') || '';
            element.classList.add('expression-field');
            return;
        }

        const text = xmlData.getAttribute('Text') ?? '';
        if (xmlData.getAttribute('AllowMarkupText') === 'true' && text) {
            const span = document.createElement('span');
            span.innerHTML = this.sanitizeMarkup(text);
            element.appendChild(span);
        } else {
            element.textContent = text;
        }
    }

    renderCheckBox(element, xmlData) {
        this.applyFont(element, this.effectiveAttribute(xmlData, 'Font'));
        this.applyTextAlignment(element, this.effectiveAttribute(xmlData, 'TextAlignment') || 'MiddleLeft');

        const padding = this.parsePadding(this.effectiveAttribute(xmlData, 'Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        this.applyBorders(
            element,
            this.effectiveAttribute(xmlData, 'Borders'),
            this.effectiveAttribute(xmlData, 'BorderColor'),
            this.effectiveAttribute(xmlData, 'BorderWidth')
        );

        const glyph = document.createElement('div');
        glyph.className = 'checkbox-glyph';
        glyph.style.cssText = [
            'flex-shrink:0',
            'width:13px',
            'height:13px',
            'border:1.5px solid #444',
            'background:#fff',
            'box-sizing:border-box',
            'margin-right:5px',
            'display:flex',
            'align-items:center',
            'justify-content:center'
        ].join(';');

        const checkState = xmlData.getAttribute('CheckBoxState') || xmlData.getAttribute('CheckState') || (xmlData.getAttribute('Checked') === 'true' ? 'Checked' : 'Unchecked');
        if (checkState === 'Indeterminate') { glyph.textContent = '−'; }
        else if (checkState === 'Checked') {
            glyph.innerHTML = '<svg width="9" height="9" viewBox="0 0 9 9">'
                + '<polyline points="1,4 3.5,7.5 8,1.5" stroke="#222" stroke-width="1.8" fill="none" '
                + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else {
            const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
                .find((n) => ['CheckBoxState', 'CheckState'].includes(n.getAttribute('PropertyName')));
            if (exprNode) element.classList.add('expression-field');
        }

        element.appendChild(glyph);

        const text = xmlData.getAttribute('Text') || '';
        if (text) {
            const label = document.createElement('span');
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';
            label.textContent = text;
            element.appendChild(label);
        }
    }

    renderPictureBox(element, xmlData) {
        const raw = xmlData.getAttribute('ImageSource') || this.childByTag(xmlData, 'ImageSource')?.textContent || this.childByTag(xmlData, 'Image')?.textContent;
        const imageData = raw && (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(raw) ? raw : /^[A-Za-z0-9+/=\s]+$/.test(raw) ? 'data:image/png;base64,' + raw.replace(/\s/g, '') : null);
        if (imageData) {
            const img = document.createElement('img');
            img.alt = xmlData.getAttribute('Name') || 'Report image';
            img.src = imageData;
            img.style.width = '100%'; img.style.height = '100%';
            img.style.objectFit = { StretchImage: 'fill', ZoomImage: 'contain', Squeeze: 'scale-down', Normal: 'none', CenterImage: 'none', Cover: 'cover' }[xmlData.getAttribute('Sizing')] || 'contain';
            img.onerror = () => { img.alt = 'Embedded report image could not be decoded'; };
            element.appendChild(img); return;
        }

        const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
            .find((n) => ['ImageSource', 'Image'].includes(n.getAttribute('PropertyName')));

        element.style.background = '#f0f0f0';
        element.style.border = '1px dashed #bbb';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';

        const placeholder = document.createElement('span');
        placeholder.style.cssText = 'font-size:9pt;color:#888;text-align:center;padding:4px;';
        placeholder.textContent = exprNode ? `[${exprNode.getAttribute('Expression')}]` : '[Image]';
        element.appendChild(placeholder);
    }

    renderPanel(element, xmlData) {
        const backColor = this.parseColor(this.effectiveAttribute(xmlData, 'BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        this.applyBorders(
            element,
            this.effectiveAttribute(xmlData, 'Borders'),
            this.effectiveAttribute(xmlData, 'BorderColor'),
            this.effectiveAttribute(xmlData, 'BorderWidth')
        );

        element.style.overflow = 'visible';
        const padding = this.parsePadding(this.effectiveAttribute(xmlData, 'Padding'));

        const controls = this.childByTag(xmlData, 'Controls');
        if (!controls) return;

        Array.from(controls.children).forEach((controlXml) => {
            const controlType = shortType(controlXml.getAttribute('ControlType'));
            if (!controlType.startsWith('XR')) return;
            const child = this.createComponentElement(controlXml);
            if (child) {
                if (padding) { child.style.left = parseFloat(child.style.left) + padding.left + 'px'; child.style.top = parseFloat(child.style.top) + padding.top + 'px'; }
                element.appendChild(child);
            }
        });
    }

    renderTable(element, xmlData) {
        const [tableW, tableH] = (xmlData.getAttribute('SizeF') || '0,0')
            .split(',')
            .map((n) => parseFloat(n.trim()) || 0);

        const rowsContainer = this.childByTag(xmlData, 'Rows');
        if (!rowsContainer) return;

        const rowXmls = Array.from(rowsContainer.children)
            .filter((el) => shortType(el.getAttribute('ControlType')) === 'XRTableRow');

        if (!rowXmls.length) return;

        const totalWeight = rowXmls.reduce((sum, row) => sum + (parseFloat(row.getAttribute('Weight')) || 1), 0);

        let rowY = 0;
        rowXmls.forEach((rowXml) => {
            const weight = parseFloat(rowXml.getAttribute('Weight')) || 1;
            const rowH = totalWeight > 0 ? (weight / totalWeight) * tableH : tableH / rowXmls.length;

            const rowDiv = document.createElement('div');
            rowDiv.className = 'report-table-row';
            this.applyVisualStyles(rowDiv, rowXml);
            this.applyFont(rowDiv, this.effectiveAttribute(rowXml, 'Font'));
            rowDiv.style.position = 'absolute';
            rowDiv.style.left = '0';
            rowDiv.style.top = `${rowY}px`;
            rowDiv.style.width = `${tableW}px`;
            rowDiv.style.height = `${rowH}px`;

            const cellsContainer = this.childByTag(rowXml, 'Cells');
            const cellXmls = cellsContainer
                ? Array.from(cellsContainer.children).filter((el) => shortType(el.getAttribute('ControlType')) === 'XRTableCell')
                : [];

            const totalCellWeight = cellXmls.reduce((sum, c) => sum + (parseFloat(c.getAttribute('Weight')) || 1), 0);

            let cellX = 0;
            cellXmls.forEach((cellXml) => {
                const cellWeight = parseFloat(cellXml.getAttribute('Weight')) || 1;
                const cellW = totalCellWeight > 0 ? (cellWeight / totalCellWeight) * tableW : tableW / cellXmls.length;

                const cellDiv = document.createElement('div');
                cellDiv.className = 'report-table-cell';
                cellDiv.dataset.type = 'XRTableCell';
                cellDiv.dataset.viewerId = this.model?.byElement.get(cellXml)?.id || '';
                cellDiv.dataset.xml = cellXml.outerHTML;
                cellDiv.addEventListener('click', event => { event.stopPropagation(); this.selectComponent(cellDiv); });
                this.applyVisualStyles(cellDiv, cellXml);
                this.markIssues(cellDiv);
                cellDiv.dataset.name = cellXml.getAttribute('Name') || '';
                cellDiv.style.left = `${cellX}px`;
                cellDiv.style.top = '0';
                cellDiv.style.width = `${cellW}px`;
                cellDiv.style.height = `${rowH}px`;

                this.applyBorders(
                    cellDiv,
                    this.effectiveAttribute(cellXml, 'Borders'),
                    this.effectiveAttribute(cellXml, 'BorderColor'),
                    this.effectiveAttribute(cellXml, 'BorderWidth')
                );

                const padding = this.parsePadding(this.effectiveAttribute(cellXml, 'Padding'));
                if (padding) {
                    cellDiv.style.paddingLeft = `${padding.left}px`;
                    cellDiv.style.paddingRight = `${padding.right}px`;
                    cellDiv.style.paddingTop = `${padding.top}px`;
                    cellDiv.style.paddingBottom = `${padding.bottom}px`;
                }

                const backColor = this.parseColor(this.effectiveAttribute(cellXml, 'BackColor'));
                if (backColor && backColor !== 'transparent') cellDiv.style.backgroundColor = backColor;

                const controls = this.childByTag(cellXml, 'Controls');
                if (controls) {
                    Array.from(controls.children).forEach((controlXml) => {
                        const controlType = shortType(controlXml.getAttribute('ControlType'));
                        if (!controlType.startsWith('XR')) return;
                        const child = this.createComponentElement(controlXml);
                        if (child) cellDiv.appendChild(child);
                    });
                } else {
                    this.renderLabel(cellDiv, cellXml);
                }

                rowDiv.appendChild(cellDiv);
                cellX += cellW;
            });

            element.appendChild(rowDiv);
            rowY += rowH;
        });
    }

    renderPageInfo(element, xmlData) {
        this.applyFont(element, this.effectiveAttribute(xmlData, 'Font'));
        this.applyTextAlignment(element, this.effectiveAttribute(xmlData, 'TextAlignment'));

        const padding = this.parsePadding(this.effectiveAttribute(xmlData, 'Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        const foreColor = this.parseColor(this.effectiveAttribute(xmlData, 'ForeColor'));
        if (foreColor) element.style.color = foreColor;

        element.classList.add('page-info-placeholder');
        element.dataset.pageInfo = xmlData.getAttribute('PageInfo') || 'NumberOfTotal';
    }

    renderLine(element, xmlData) {
        const h = parseFloat((xmlData.getAttribute('SizeF') || '1,2').split(',')[1]) || 2;
        const lineColor = this.parseColor(this.effectiveAttribute(xmlData, 'ForeColor') || this.effectiveAttribute(xmlData, 'BorderColor')) || '#000';
        const lineWidth = parseFloat(xmlData.getAttribute('LineWidth') ?? this.effectiveAttribute(xmlData, 'BorderWidth') ?? '1');

        const lineDiv = document.createElement('div');
        lineDiv.style.position = 'absolute';
        lineDiv.style.left = '0';
        lineDiv.style.top = `${Math.max(0, h / 2 - lineWidth / 2)}px`;
        lineDiv.style.width = '100%';
        lineDiv.style.borderTop = `${lineWidth}px solid ${lineColor}`;

        element.appendChild(lineDiv);
    }

    selectComponent(component) {
        if (this.selectedComponent) this.selectedComponent.classList.remove('selected');

        this.selectedComponent = component;
        component.classList.add('selected');

        this.updateInspector(component);

        const modal = document.getElementById('inspectorModal');
        if (!modal || !globalThis.bootstrap) return;
        const inspectorModal = bootstrap.Modal.getOrCreateInstance(modal, { backdrop: false });
        inspectorModal.show();

        const modalTitle = document.getElementById('inspectorModalLabel');
        const componentName = component.dataset.name || 'Unnamed Component';
        const componentType = component.dataset.type || 'Unknown Type';
        modalTitle.textContent = `${componentName} (${componentType})`;
    }

    updateInspector(component) {
        const propertiesTab = document.getElementById('propertyInspector');
        const xmlTab = document.getElementById('xmlViewer');

        if (!propertiesTab || !xmlTab) return;
        if (!component) {
            propertiesTab.innerHTML = '<p class="text-muted">No component selected</p>';
            xmlTab.innerHTML = '';
            return;
        }

        const xmlData = new DOMParser().parseFromString(component.dataset.xml, 'text/xml').documentElement;
        const properties = this.extractComponentProperties(xmlData);

        propertiesTab.innerHTML = Object.entries(properties)
            .map(([group, props]) => `
                <div class="property-group">
                    <h6>${this.escapeHtml(group)}</h6>
                    ${Object.entries(props)
                        .map(([key, value]) => `
                            <div class="mb-1">
                                <div class="inspector-row">
                                    <span class="property-key">${this.escapeHtml(key)}: </span> <span class="property-value">${this.escapeHtml(String(value))}</span>
                                </div>
                            </div>
                        `).join('')}
                </div>
            `).join('');

        xmlTab.textContent = this.formatXML(component.dataset.xml);
    }

    extractComponentProperties(xmlElement) {
        const properties = {
            Layout: {},
            Font: {},
            General: {},
        };

        const location = xmlElement.getAttribute('LocationFloat')?.split(',');
        const size = xmlElement.getAttribute('SizeF')?.split(',');

        properties.Layout = {
            X: location ? `${location[0]} report units` : '0 report units',
            Y: location ? `${location[1]} report units` : '0 report units',
            Width: size ? `${size[0]} report units` : '0 report units',
            Height: size ? `${size[1]} report units` : '0 report units',
        };

        const fontStr = xmlElement.getAttribute('Font');
        const font = this.parseFont(fontStr);
        if (font) {
            properties.Font = {
                Name: font.family,
                Size: `${font.size}pt`,
                Bold: font.bold ? 'Yes' : 'No',
                Italic: font.italic ? 'Yes' : 'No',
            };
        }

        properties.General = {
            Type: xmlElement.getAttribute('ControlType') || xmlElement.tagName,
            Name: xmlElement.getAttribute('Name') || '',
            Text: xmlElement.getAttribute('Text') || '',
        };

        properties.Attributes = Object.fromEntries(Array.from(xmlElement.attributes, attr => [attr.name, attr.value]));
        const bindings = this.childByTag(xmlElement, 'ExpressionBindings');
        if (bindings) properties.Expressions = Object.fromEntries(Array.from(bindings.children, (binding, index) => [(index + 1) + '. ' + binding.getAttribute('EventName') + ' / ' + binding.getAttribute('PropertyName'), binding.getAttribute('Expression') || '']));
        return properties;
    }

    formatXML(xml) {
        return this.prettyPrintXml(xml);
    }

    markIssues(element) {
        const issues = (this.diagnostics || []).filter(issue => issue.nodeId === element.dataset.viewerId);
        if (issues.some(issue => issue.severity === 'error')) element.classList.add('report-validation-error');
        else if (issues.some(issue => issue.severity === 'warning')) element.classList.add('report-validation-warning');
        if (issues.length) element.title = issues.map(issue => issue.code + ': ' + issue.message).join('\n');
    }

    escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }

    setZoom(scale) {
        this.scale = Math.max(0.1, Math.min(5, scale));
        const actualScale = this.scale * (this.unitScale || 0.96);
        for (const page of this.container.querySelectorAll('.report-page')) {
            page.style.transform = 'scale(' + actualScale + ')';
            page.parentElement.style.width = parseFloat(page.style.width) * actualScale + 'px';
            page.parentElement.style.height = parseFloat(page.style.height) * actualScale + 'px';
        }
        const label = document.getElementById('zoomLevel');
        if (label) label.textContent = Math.round(this.scale * 100) + '%';
    }

}

/**
 * Creates a DevExpress preview from JSON data and decoded template
 * @param {Object} devExpressData - The DevExpress JSON data
 * @param {Object} decodedTemplate - The decoded template containing XML content
 */
export function createDevExpressPreview(devExpressData, decodedTemplate) {
    const container = document.getElementById('reportContainer');
    if (!container) return;

    if (!window.viewer) window.viewer = new ReportViewer(container);

    if (decodedTemplate?.content) {
        window.viewer.renderReport(decodedTemplate.content);
    }
}

// Initialize viewer when DOM is ready
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('reportContainer');
    if (container) window.viewer = new ReportViewer(container);
});
