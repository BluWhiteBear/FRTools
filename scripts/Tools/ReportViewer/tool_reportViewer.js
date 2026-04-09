// Report XML to HTML Converter and Viewer
class ReportViewer {
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

        document.getElementById('showBoundaries')?.addEventListener('change', (e) => {
            this.showBoundaries = e.target.checked;
            this.container.classList.toggle('show-boundaries', this.showBoundaries);
        });

        document.getElementById('reportUpload')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('copyJsonBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-json'));
        document.getElementById('copyXmlBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-xml'));
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        document.getElementById('output-wrapper').style.display = 'block';

        const previewTab = document.getElementById('preview-tab');
        previewTab.classList.remove('disabled');
        new bootstrap.Tab(previewTab).show();

        try {
            const text = await file.text();
            if (!text?.trim()) throw new Error('File content is empty');

            const jsonData = JSON.parse(text);
            const report = Array.isArray(jsonData) ? jsonData[0] : jsonData;

            this.renderJsonOutput(jsonData);

            if (!report?.ReportTemplate) {
                throw new Error('JSON file missing required "ReportTemplate" field');
            }

            const xmlData = this.decompressReport(report.ReportTemplate);
            if (!xmlData) throw new Error('No XML data extracted from JSON');

            this.renderXmlOutput(xmlData);
            this.renderReport(xmlData);
        } catch (error) {
            console.error('Error processing file:', error);
            alert(`Error loading report file: ${error.message}`);
        }
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

    decompressReport(compressed) {
        if (!compressed) return null;

        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compressed)) {
            throw new Error('Invalid Base64 report template');
        }

        const binaryString = atob(compressed);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return pako.inflate(bytes, { to: 'string' });
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

    prettyPrintXml(xml) {
        const decoded = xml
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');

        const formatted = decoded
            .replace(/(>)\s*(<)(\/*)/g, '$1\n$2$3')
            .replace(/\s{2,}/g, ' ');

        let indent = 0;
        const tab = '  ';
        let result = '';

        formatted.split('\n').forEach((line) => {
            line = line.trim();
            if (!line) return;

            const isClosingTag = line.startsWith('</');
            const isSelfClosingTag = line.includes('/>');
            const hasOpeningTag = line.startsWith('<') && !line.startsWith('</');

            if (isClosingTag && indent > 0) indent--;
            result += tab.repeat(indent) + line + '\n';
            if (hasOpeningTag && !isSelfClosingTag && !isClosingTag) indent++;
        });

        return result.trim();
    }

    renderReport(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            alert('Failed to parse the report XML.');
            return;
        }

        this.reportData = xmlDoc;
        this.container.innerHTML = '';

        const page = document.createElement('div');
        page.className = 'report-page';

        const rootEl = xmlDoc.querySelector('XtraReportsLayoutSerializer');
        const pageWidth = parseFloat(rootEl?.getAttribute('PageWidth')) || 850;
        const margins = this.parseMargins(rootEl?.getAttribute('Margins'));
        this.currentMargins = margins;

        page.style.width = `${pageWidth}px`;

        const bandsContainer = xmlDoc.querySelector('XtraReportsLayoutSerializer > Bands');
        if (!bandsContainer) {
            this.container.appendChild(page);
            return;
        }

        let currentY = 0;
        const processBand = (bandXml) => {
            const controlType = bandXml.getAttribute('ControlType') || '';
            if (!controlType.includes('Band')) return;

            if (controlType === 'DetailReportBand') {
                const nested = bandXml.querySelector('Bands');
                if (nested) Array.from(nested.children).forEach((b) => processBand(b));
                return;
            }

            const bandEl = this.createBandElement(bandXml);
            bandEl.style.top = `${currentY}px`;
            this.processComponents(bandXml, bandEl, this.currentMargins.left);
            page.appendChild(bandEl);

            currentY += parseFloat(bandXml.getAttribute('HeightF')) || 0;
        };

        Array.from(bandsContainer.children).forEach((b) => processBand(b));
        page.style.height = `${currentY}px`;

        this.container.appendChild(page);
        this.setZoom(1.0);
        this.updateInspector(null);
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

        const controlType = bandXml.getAttribute('ControlType') || '';
        band.dataset.bandType = controlType;

        const name = bandXml.getAttribute('Name');
        if (name) band.dataset.name = name;

        band.style.height = `${parseFloat(bandXml.getAttribute('HeightF')) || 0}px`;
        this.applyVisualStyles(band, bandXml);
        return band;
    }

    processComponents(parentXml, parentElement, xOffset = 0) {
        const controls = this.childByTag(parentXml, 'Controls');
        if (!controls) return;

        Array.from(controls.children).forEach((controlXml) => {
            const controlType = controlXml.getAttribute('ControlType') || '';
            if (!controlType.startsWith('XR')) return;
            const child = this.createComponentElement(controlXml, xOffset);
            if (child) parentElement.appendChild(child);
        });
    }

    /** Find the first direct child element whose tagName matches (case-sensitive, for XML). */
    childByTag(el, tagName) {
        return Array.from(el.children).find((c) => c.tagName === tagName) || null;
    }

    createComponentElement(componentXml, xOffset = 0) {
        const controlType = componentXml.getAttribute('ControlType') || '';

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

        const locStr = componentXml.getAttribute('LocationFloat');
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
            default:
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

        if (colorStr.startsWith('#')) return colorStr;
        return colorStr;
    }

    parsePadding(paddingStr) {
        if (!paddingStr) return null;
        const p = paddingStr.split(',').map((n) => parseFloat(n.trim()) || 0);
        if (p.length < 4) return null;
        return { left: p[0], right: p[1], top: p[2], bottom: p[3] };
    }

    applyBorders(element, bordersStr, borderColorStr, borderWidthStr) {
        if (!bordersStr || bordersStr.toLowerCase() === 'none') return;

        const color = this.parseColor(borderColorStr) || '#000000';
        const width = parseFloat(borderWidthStr) || 1;
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
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth')
        );

        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
        if (foreColor) element.style.color = foreColor;
    }

    applyFont(element, fontStr) {
        const font = this.parseFont(fontStr);
        if (!font) return;

        element.style.fontFamily = `"${font.family}", serif`;
        element.style.fontSize = `${font.size}pt`;
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

    sanitizeMarkup(html) {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<(?!\/?(?:b|i|u|em|strong|span|br|s)\b)[^>]+>/gi, '');
    }

    renderLabel(element, xmlData) {
        this.applyFont(element, xmlData.getAttribute('Font'));
        this.applyTextAlignment(element, xmlData.getAttribute('TextAlignment'));
        this.applyBorders(
            element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth')
        );

        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
        if (foreColor) element.style.color = foreColor;

        const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
            .find((n) => n.getAttribute('PropertyName') === 'Text');

        if (exprNode) {
            element.textContent = `[${exprNode.getAttribute('Expression') || ''}]`;
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
        this.applyFont(element, xmlData.getAttribute('Font'));
        this.applyTextAlignment(element, xmlData.getAttribute('TextAlignment') || 'MiddleLeft');

        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        this.applyBorders(
            element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth')
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

        const checkState = xmlData.getAttribute('CheckState');
        if (checkState === 'Checked') {
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
        const imageData = xmlData.querySelector('Image')?.textContent;
        if (imageData) {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${imageData}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            element.appendChild(img);
            return;
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
        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        this.applyBorders(
            element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth')
        );

        element.style.overflow = 'visible';

        const controls = this.childByTag(xmlData, 'Controls');
        if (!controls) return;

        Array.from(controls.children).forEach((controlXml) => {
            const controlType = controlXml.getAttribute('ControlType') || '';
            if (!controlType.startsWith('XR')) return;
            const child = this.createComponentElement(controlXml);
            if (child) element.appendChild(child);
        });
    }

    renderTable(element, xmlData) {
        const [tableW, tableH] = (xmlData.getAttribute('SizeF') || '0,0')
            .split(',')
            .map((n) => parseFloat(n.trim()) || 0);

        const rowsContainer = this.childByTag(xmlData, 'Rows');
        if (!rowsContainer) return;

        const rowXmls = Array.from(rowsContainer.children)
            .filter((el) => el.getAttribute('ControlType') === 'XRTableRow');

        if (!rowXmls.length) return;

        const totalWeight = rowXmls.reduce((sum, row) => sum + (parseFloat(row.getAttribute('Weight')) || 1), 0);

        let rowY = 0;
        rowXmls.forEach((rowXml) => {
            const weight = parseFloat(rowXml.getAttribute('Weight')) || 1;
            const rowH = totalWeight > 0 ? (weight / totalWeight) * tableH : tableH / rowXmls.length;

            const rowDiv = document.createElement('div');
            rowDiv.className = 'report-table-row';
            rowDiv.style.position = 'absolute';
            rowDiv.style.left = '0';
            rowDiv.style.top = `${rowY}px`;
            rowDiv.style.width = `${tableW}px`;
            rowDiv.style.height = `${rowH}px`;

            const cellsContainer = this.childByTag(rowXml, 'Cells');
            const cellXmls = cellsContainer
                ? Array.from(cellsContainer.children).filter((el) => el.getAttribute('ControlType') === 'XRTableCell')
                : [];

            const totalCellWeight = cellXmls.reduce((sum, c) => sum + (parseFloat(c.getAttribute('Weight')) || 1), 0);

            let cellX = 0;
            cellXmls.forEach((cellXml) => {
                const cellWeight = parseFloat(cellXml.getAttribute('Weight')) || 1;
                const cellW = totalCellWeight > 0 ? (cellWeight / totalCellWeight) * tableW : tableW / cellXmls.length;

                const cellDiv = document.createElement('div');
                cellDiv.className = 'report-table-cell';
                cellDiv.dataset.type = 'XRTableCell';
                cellDiv.dataset.name = cellXml.getAttribute('Name') || '';
                cellDiv.style.left = `${cellX}px`;
                cellDiv.style.top = '0';
                cellDiv.style.width = `${cellW}px`;
                cellDiv.style.height = `${rowH}px`;

                this.applyBorders(
                    cellDiv,
                    cellXml.getAttribute('Borders'),
                    cellXml.getAttribute('BorderColor'),
                    cellXml.getAttribute('BorderWidth')
                );

                const padding = this.parsePadding(cellXml.getAttribute('Padding'));
                if (padding) {
                    cellDiv.style.paddingLeft = `${padding.left}px`;
                    cellDiv.style.paddingRight = `${padding.right}px`;
                    cellDiv.style.paddingTop = `${padding.top}px`;
                    cellDiv.style.paddingBottom = `${padding.bottom}px`;
                }

                const backColor = this.parseColor(cellXml.getAttribute('BackColor'));
                if (backColor && backColor !== 'transparent') cellDiv.style.backgroundColor = backColor;

                const controls = this.childByTag(cellXml, 'Controls');
                if (controls) {
                    Array.from(controls.children).forEach((controlXml) => {
                        const controlType = controlXml.getAttribute('ControlType') || '';
                        if (!controlType.startsWith('XR')) return;
                        const child = this.createComponentElement(controlXml);
                        if (child) cellDiv.appendChild(child);
                    });
                } else {
                    // XRTableCell with a direct Text attribute or ExpressionBindings (no child Controls)
                    let cellText = cellXml.getAttribute('Text');
                    if (!cellText) {
                        // Look for a BeforePrint Text expression binding
                        const exprBindings = this.childByTag(cellXml, 'ExpressionBindings');
                        if (exprBindings) {
                            const binding = Array.from(exprBindings.children).find(
                                (b) => b.getAttribute('PropertyName') === 'Text' && b.getAttribute('EventName') === 'BeforePrint'
                            );
                            if (binding) cellText = `[${binding.getAttribute('Expression') || ''}]`;
                        }
                    }
                    if (cellText) {
                        const textAlign = cellXml.getAttribute('TextAlignment') || '';
                        this.applyTextAlignment(cellDiv, textAlign);
                        this.applyFont(cellDiv, cellXml.getAttribute('Font'));
                        const fg = this.parseColor(cellXml.getAttribute('ForeColor'));
                        if (fg) cellDiv.style.color = fg;
                        cellDiv.textContent = cellText;
                    }
                }

                rowDiv.appendChild(cellDiv);
                cellX += cellW;
            });

            element.appendChild(rowDiv);
            rowY += rowH;
        });
    }

    renderPageInfo(element, xmlData) {
        this.applyFont(element, xmlData.getAttribute('Font'));
        this.applyTextAlignment(element, xmlData.getAttribute('TextAlignment'));

        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft = `${padding.left}px`;
            element.style.paddingRight = `${padding.right}px`;
            element.style.paddingTop = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
        if (foreColor) element.style.color = foreColor;

        element.textContent = 'Page 1 of N';
    }

    renderLine(element, xmlData) {
        const h = parseFloat((xmlData.getAttribute('SizeF') || '1,2').split(',')[1]) || 2;
        const lineColor = this.parseColor(xmlData.getAttribute('ForeColor') || xmlData.getAttribute('BorderColor')) || '#000';
        const lineWidth = parseFloat(xmlData.getAttribute('LineWidth') ?? xmlData.getAttribute('BorderWidth') ?? '1');

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

        const inspectorModal = new bootstrap.Modal(document.getElementById('inspectorModal'), { backdrop: false });
        inspectorModal.show();

        const modalTitle = document.getElementById('inspectorModalLabel');
        const componentName = component.dataset.name || 'Unnamed Component';
        const componentType = component.dataset.type || 'Unknown Type';
        modalTitle.textContent = `${componentName} (${componentType})`;
    }

    updateInspector(component) {
        const propertiesTab = document.getElementById('propertyInspector');
        const xmlTab = document.getElementById('xmlViewer');

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
                    <h6>${group}</h6>
                    ${Object.entries(props)
                        .map(([key, value]) => `
                            <div class="mb-1">
                                <div class="inspector-row">
                                    <span class="property-key">${key}: </span> <span class="property-value">${value}</span>
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
            X: location ? `${location[0]}px` : '0px',
            Y: location ? `${location[1]}px` : '0px',
            Width: size ? `${size[0]}px` : '0px',
            Height: size ? `${size[1]}px` : '0px',
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

        return properties;
    }

    formatXML(xml) {
        return this.prettyPrintXml(xml);
    }

    setZoom(scale) {
        this.scale = Math.max(0.1, Math.min(5, scale));
        const page = this.container.querySelector('.report-page');
        if (page) page.style.transform = `scale(${this.scale})`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.scale * 100)}%`;
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
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('reportContainer');
    if (container) window.viewer = new ReportViewer(container);
});
