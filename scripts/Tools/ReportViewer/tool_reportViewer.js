// Report XML to HTML Converter and Viewer
class ReportViewer {
    constructor(container) {
        this.container = container;
        this.scale = 1.0;
        this.showBoundaries = false;
        this.selectedComponent = null;
        this.reportData = null;
        this.xmlIndentSize = 2;
        this.initEventHandlers();
    }

    initEventHandlers() {
        document.getElementById('zoomIn')?.addEventListener('click', () => this.setZoom(this.scale * 1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.setZoom(this.scale * 0.8));
        document.getElementById('showBoundaries')?.addEventListener('change', (e) => {
            this.showBoundaries = e.target.checked;
            this.container.classList.toggle('show-boundaries', this.showBoundaries);
        });
        const uploadElement = document.getElementById('reportUpload');
        uploadElement?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('copyJsonBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-json'));
        document.getElementById('copyXmlBtn')?.addEventListener('click', () => this.copyToClipboard('devexpress-xml'));
    }

    async handleFileUpload(event) {
        console.log('File upload event triggered');
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('Processing file:', file.name, 'type:', file.type);
        
        // Show the output wrapper
        document.getElementById('output-wrapper').style.display = 'block';
        
        // Enable and switch to preview tab
        const previewTab = document.getElementById('preview-tab');
        previewTab.classList.remove('disabled');
        const previewTabBtn = new bootstrap.Tab(previewTab);
        try {
            console.log('Starting to read file...');
            const text = await file.text();
            
            if (!text) {
                console.error('File content is empty');
                throw new Error('File content is empty');
            }
            
            console.log('File content loaded, length:', text.length);

            // Parse the JSON data once
            const jsonData = JSON.parse(text);
            
            // Handle array of reports or single report
            const report = Array.isArray(jsonData) ? jsonData[0] : jsonData;
            console.log('Processing report:', report);

            // Display formatted JSON in the output
            const jsonPre = document.getElementById('devexpress-json');
            if (jsonPre) {
                jsonPre.className = 'language-json m-0 text-light';
                if (!jsonPre.querySelector('code')) {
                    const codeElem = document.createElement('code');
                    codeElem.className = 'language-json';
                    jsonPre.appendChild(codeElem);
                }
                const jsonCode = jsonPre.querySelector('code');
                jsonCode.textContent = JSON.stringify(jsonData, null, 2);
                if (typeof Prism !== 'undefined') {
                    Prism.highlightElement(jsonCode);
                }
            }

            // Display decompressed XML if available
            const xmlPre = document.getElementById('devexpress-xml');
            console.log('XML Pre element:', xmlPre);
            console.log('Report object:', report);
            console.log('ReportTemplate exists:', !!report?.ReportTemplate);
            
            if (xmlPre) {
                if (!report?.ReportTemplate) {
                    console.warn('No ReportTemplate found in JSON data');
                    xmlPre.textContent = 'No ReportTemplate found in JSON data';
                    return;
                }

                console.log('Attempting to decompress report template...');
                try {
                    const xmlData = this.decompressReport(report.ReportTemplate);
                    console.log('Decompression result:', xmlData ? 'Success' : 'Failed');
                    
                    if (xmlData) {
                        console.log('Setting XML content, length:', xmlData.length);
                        const formattedXml = this.prettyPrintXml(xmlData);
                        xmlPre.className = 'language-markup m-0 text-light';
                        if (!xmlPre.querySelector('code')) {
                            const codeElem = document.createElement('code');
                            codeElem.className = 'language-markup';
                            xmlPre.appendChild(codeElem);
                        }
                        const xmlCode = xmlPre.querySelector('code');
                        xmlCode.textContent = formattedXml;
                        if (typeof Prism !== 'undefined') {
                            console.log('Applying Prism highlighting');
                            Prism.highlightElement(xmlCode);
                        }
                    } else {
                        if (!xmlPre.querySelector('code')) {
                            const codeElem = document.createElement('code');
                            xmlPre.appendChild(codeElem);
                        }
                        xmlPre.querySelector('code').textContent = 'Failed to decompress XML data';
                    }
                } catch (error) {
                    console.error('Failed to process XML:', error);
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack,
                        reportTemplateLength: jsonData.ReportTemplate.length
                    });
                    xmlPre.textContent = 'Failed to extract XML: ' + error.message;
                }
            } else {
                console.error('Could not find XML preview element (devexpress-xml)');
            }
            console.log('File content preview:', text.length > 100 ? text.substring(0, 100) + '...' : text);
            
            if (file.name.endsWith('.xml')) {
                console.log('Processing as XML file');
                this.renderReport(text);
            } else if (file.name.endsWith('.json')) {
                console.log('Processing as JSON file');
                if (!text.trim()) {
                    throw new Error('JSON file is empty');
                }
                
                const jsonData = JSON.parse(text);
                console.log('JSON structure:', jsonData);
                
                // Handle array of reports
                const report = Array.isArray(jsonData) ? jsonData[0] : jsonData;
                
                // Look for ReportTemplate property
                if (!report.ReportTemplate) {
                    throw new Error('JSON file missing required "ReportTemplate" field');
                }
                
                console.log('Report found:', {
                    name: report.ReportName,
                    template: report.ReportTemplate.substring(0, 50) + '...',
                    length: report.ReportTemplate.length
                });

                // Always decompress for DevExpress reports
                console.log('Decompressing report template...');
                const xmlData = this.decompressReport(report.ReportTemplate);                if (!xmlData) {
                    throw new Error('No XML data extracted from JSON');
                }
                
                console.log('XML data prepared:', {
                    length: xmlData.length,
                    preview: xmlData.length > 100 ? xmlData.substring(0, 100) + '...' : xmlData
                });
                this.renderReport(xmlData);
            } else {
                console.warn('Unsupported file type:', file.name);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            console.error('Stack trace:', error.stack);
            alert('Error loading report file. Please check the console for details.');
        }
    }

    decompressReport(compressed) {
        if (!compressed) {
            console.error('No compressed data provided');
            return null;
        }

        console.log('Starting decompression of data length:', compressed.length);
        console.log('Data preview:', compressed.substring(0, 50) + '...');
        
        try {
            // Check if the input is Base64
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compressed)) {
                console.error('Invalid Base64 input');
                return null;
            }

            const binaryString = atob(compressed);
            console.log('Base64 decoded, binary length:', binaryString.length);
            
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log('Converted to bytes, length:', bytes.length);
            console.log('First few bytes:', Array.from(bytes.slice(0, 5)));
            
            const decompressed = pako.inflate(bytes, { to: 'string' });
            console.log('Decompression successful, result length:', decompressed.length);
            console.log('Decompressed preview:', decompressed.substring(0, 50) + '...');
            
            return decompressed;
        } catch (error) {
            console.error('Decompression error:', error);
            console.error('Stack trace:', error.stack);
            console.error('Error details:', {
                inputType: typeof compressed,
                inputLength: compressed?.length,
                errorName: error.name,
                errorMessage: error.message
            });
            throw error;
        }
    }

    // Alias for prettyPrintXml
    formatXml(xml) {
        return this.prettyPrintXml(xml);
    }

    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        try {
            await navigator.clipboard.writeText(element.textContent);
            console.log('Content copied to clipboard');
        } catch (err) {
            console.error('Failed to copy content to clipboard:', err);
        }
    }

    jsonToDevExpressXml(jsonData) {
        console.log('Converting JSON to XML:', jsonData);
        const createXmlElement = (name, attributes = {}, content = '') => {
            const attrs = Object.entries(attributes)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
            
            return attrs
                ? `<${name} ${attrs}>${content}</${name}>`
                : `<${name}>${content}</${name}>`;
        };

        const processComponent = (component) => {
            const { type, name, location, size, text, ...rest } = component;
            const attributes = {
                Name: name,
                ...location && { LocationFloat: `${location.x}, ${location.y}` },
                ...size && { SizeF: `${size.width}, ${size.height}` },
                ...text && { Text: text },
                ...rest
            };
            return createXmlElement(type || 'XRLabel', attributes);
        };

        const processBand = (band) => {
            const { type, name, location, size, components = [], bands = [], ...rest } = band;
            const childContent = [
                ...components.map(processComponent),
                ...bands.map(processBand)
            ].join('');
            
            const attributes = {
                Name: name,
                ...location && { LocationFloat: `${location.x}, ${location.y}` },
                ...size && { SizeF: `${size.width}, ${size.height}` },
                ...rest
            };
            
            return createXmlElement(type || 'Band', attributes, childContent);
        };

        try {
            const { bands = [], components = [], name = 'Report', pageWidth, pageHeight, margins, ...rest } = jsonData;
            const reportContent = [
                ...bands.map(processBand),
                ...components.map(processComponent)
            ].join('');

            const reportAttributes = {
                Name: name,
                ...(pageWidth && { PageWidth: pageWidth }),
                ...(pageHeight && { PageHeight: pageHeight }),
                ...(margins && { Margins: margins }),
                ...rest
            };

            return `<?xml version="1.0" encoding="utf-8"?>
<XtraReportsLayoutSerializer SerializerVersion="19.2.5.0" Ref="1" ControlType="DevExpress.XtraReports.UI.XtraReport, DevExpress.XtraReports.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" ${Object.entries(reportAttributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ')} Version="19.2">
    ${reportContent}
</XtraReportsLayoutSerializer>`;
        } catch (error) {
            console.error('Error converting JSON to XML:', error);
            throw error;
        }
    }

    prettyPrintXml(xml) {
        // First, properly decode any HTML entities
        const decoded = xml.replace(/&quot;/g, '"')
                         .replace(/&apos;/g, "'")
                         .replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>')
                         .replace(/&amp;/g, '&');

        // Add newlines between elements and remove extra whitespace
        let formatted = decoded.replace(/(>)\s*(<)(\/*)/g, '$1\n$2$3')
                             .replace(/\s{2,}/g, ' ');
        
        let indent = 0;
        const tab = '  '; // 2 spaces for indentation
        let result = '';

        // Split into lines and process each one
        formatted.split('\n').forEach(line => {
            line = line.trim();
            if (line.length === 0) return;

            // Check if this line is a closing tag
            const isClosingTag = line.indexOf('</') === 0;
            // Check if this line is a self-closing tag
            const isSelfClosingTag = line.indexOf('/>') > -1;
            // Check if this line contains an opening tag
            const hasOpeningTag = line.indexOf('<') === 0 && line.indexOf('</') !== 0;

            // Adjust indent before adding this line
            if (isClosingTag && indent > 0) {
                indent--;
            }

            // Add line with proper indentation
            result += tab.repeat(indent) + line + '\n';

            // Adjust indent for next line
            if (hasOpeningTag && !isSelfClosingTag && !isClosingTag) {
                indent++;
            }
        });

        return result.trim();
    }

    renderReport(xmlString) {
        console.log('Starting report render with XML string length:', xmlString.length);
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            alert('Failed to parse the report XML.');
            return;
        }

        this.reportData = xmlDoc;
        this.container.innerHTML = '';

        const page = document.createElement('div');
        page.className = 'report-page';

        const rootEl = xmlDoc.querySelector('XtraReportsLayoutSerializer');
        const pageWidth = parseFloat(rootEl?.getAttribute('PageWidth')) || 850;
        const margins = this._parseMargins(rootEl?.getAttribute('Margins'));
        page.style.width = `${pageWidth}px`;
        page.style.paddingLeft   = `${margins.left}px`;
        page.style.paddingRight  = `${margins.right}px`;
        page.style.paddingTop    = `${margins.top}px`;
        page.style.paddingBottom = `${margins.bottom}px`;
        page.style.boxSizing = 'border-box';

        const bandsContainer = xmlDoc.querySelector('XtraReportsLayoutSerializer > Bands');
        if (!bandsContainer) {
            console.error('No Bands container found');
            this.container.appendChild(page);
            return;
        }

        let currentY = 0;

        const processBand = (bandXml) => {
            const ct = bandXml.getAttribute('ControlType') || '';
            if (!ct.includes('Band')) return;

            // DetailReportBand: expand its nested Bands inline
            if (ct === 'DetailReportBand') {
                const nested = bandXml.querySelector('Bands');
                if (nested) Array.from(nested.children).forEach(b => processBand(b));
                return;
            }

            const bandEl = this.createBandElement(bandXml);
            bandEl.style.top = `${currentY}px`;
            this.processComponents(bandXml, bandEl);
            page.appendChild(bandEl);
            currentY += parseFloat(bandXml.getAttribute('HeightF')) || 0;
        };

        Array.from(bandsContainer.children).forEach(b => processBand(b));
        page.style.height = `${currentY}px`;

        this.container.appendChild(page);
        this.setZoom(1.0);
        this.updateInspector(null);
    }

    _parseMargins(marginsStr) {
        // DevExpress format: "Left, Right, Top, Bottom"
        if (!marginsStr) return { left: 50, right: 50, top: 50, bottom: 50 };
        const p = marginsStr.split(',').map(n => parseFloat(n.trim()) || 0);
        return { left: p[0] ?? 50, right: p[1] ?? 50, top: p[2] ?? 50, bottom: p[3] ?? 50 };
    }

    createBandElement(bandXml) {
        const band = document.createElement('div');
        band.className = 'report-band';
        const ct = bandXml.getAttribute('ControlType') || '';
        band.dataset.bandType = ct;
        const name = bandXml.getAttribute('Name');
        if (name) band.dataset.name = name;
        band.style.height = `${parseFloat(bandXml.getAttribute('HeightF')) || 0}px`;
        if (ct.includes('Margin')) band.style.backgroundColor = '#f5f5f5';
        return band;
    }

    processComponents(bandXml, bandElement) {
        const controls = bandXml.querySelector('Controls');
        if (!controls) return;
        Array.from(controls.children).forEach(ctrl => {
            const ct = ctrl.getAttribute('ControlType') || '';
            if (!ct.startsWith('XR')) return;
            const el = this.createComponentElement(ctrl);
            if (el) bandElement.appendChild(el);
        });
    }

    createComponentElement(componentXml) {
        const ct = componentXml.getAttribute('ControlType') || '';
        const el = document.createElement('div');
        el.className = 'report-component';
        if (ct) {
            // XRLabel → component-label, XRCheckBox → component-check-box, etc.
            const suffix = ct.replace(/^XR/, '')
                .replace(/([A-Z])/g, (m, c, i) => i > 0 ? '-' + c.toLowerCase() : c.toLowerCase());
            el.classList.add(`component-${suffix}`);
        }
        el.dataset.type = ct;
        const name = componentXml.getAttribute('Name');
        if (name) el.dataset.name = name;

        // Absolute position and size from XML attributes
        const locStr  = componentXml.getAttribute('LocationFloat');
        const sizeStr = componentXml.getAttribute('SizeF');
        if (locStr && sizeStr) {
            const [x, y] = locStr.split(',').map(n => parseFloat(n.trim()) || 0);
            const [w, h] = sizeStr.split(',').map(n => parseFloat(n.trim()) || 0);
            el.style.left   = `${x}px`;
            el.style.top    = `${y}px`;
            el.style.width  = `${w}px`;
            el.style.height = `${h}px`;
        }

        el.dataset.xml = componentXml.outerHTML;
        el.addEventListener('click', e => { e.stopPropagation(); this.selectComponent(el); });

        switch (ct) {
            case 'XRLabel':      this.renderLabel(el, componentXml);      break;
            case 'XRCheckBox':   this.renderCheckBox(el, componentXml);   break;
            case 'XRPictureBox': this.renderPictureBox(el, componentXml); break;
            case 'XRPanel':      this.renderPanel(el, componentXml);      break;
            case 'XRTable':      this.renderTable(el, componentXml);      break;
            case 'XRPageInfo':   this.renderPageInfo(el, componentXml);   break;
            case 'XRLine':       this.renderLine(el, componentXml);       break;
            default: /* unknown type: still shows as a positioned box */ break;
        }

        return el;
    }
        const xmlTab = document.getElementById('xmlViewer');
    // ─── HELPER PARSERS ──────────────────────────────────────────

    /**
     * Parse DevExpress Font string attribute.
     * Format: "Times New Roman, 9pt" or "Times New Roman, 14pt, style=Bold" or "Arial, 10pt, style=Bold, Italic"
     */
    parseFont(fontStr) {
        if (!fontStr) return null;
        const firstComma = fontStr.indexOf(',');
        if (firstComma === -1) return { family: fontStr.trim(), size: 10, bold: false, italic: false, underline: false, strikeout: false };
        const family = fontStr.substring(0, firstComma).trim();
        const rest = fontStr.substring(firstComma + 1).trim();
        const parts = rest.split(',').map(p => p.trim());
        const sizeMatch = (parts[0] || '').match(/(\d+(?:\.\d+)?)\s*pt/i);
        const size = sizeMatch ? parseFloat(sizeMatch[1]) : 10;
        const styleStr = parts.slice(1).join(' ').toLowerCase();
        return {
            family,
            size,
            bold:      styleStr.includes('bold'),
            italic:    styleStr.includes('italic'),
            underline: styleStr.includes('underline'),
            strikeout: styleStr.includes('strikeout'),
        };
    }

    /**
     * Convert a DevExpress color value to a CSS color string.
     * Handles named colors (DarkGray, Transparent…), bare hex (rrggbb / aarrggbb).
     */
    parseColor(colorStr) {
        if (!colorStr) return null;
        const lc = colorStr.toLowerCase().trim();
        if (lc === 'transparent') return 'transparent';
        if (/^[0-9a-f]{6}$/.test(lc)) return `#${lc}`;
        if (/^[0-9a-f]{8}$/.test(lc)) {
            // ARGB 8-digit hex: first 2 = alpha
            const a = parseInt(lc.substring(0, 2), 16) / 255;
            const hex = lc.substring(2);
            return a >= 1 ? `#${hex}` : `rgba(${parseInt(hex.substring(0,2),16)},${parseInt(hex.substring(2,4),16)},${parseInt(hex.substring(4,6),16)},${a.toFixed(2)})`;
        }
        if (colorStr.startsWith('#')) return colorStr;
        // Named color — CSS and .NET share most names (DarkGray, LightGray, etc.)
        return colorStr;
    }

    /**
     * Parse DevExpress Padding attribute: "Left,Right,Top,Bottom[,DPI]"
     */
    parsePadding(paddingStr) {
        if (!paddingStr) return null;
        const p = paddingStr.split(',').map(n => parseFloat(n.trim()) || 0);
        if (p.length < 4) return null;
        return { left: p[0], right: p[1], top: p[2], bottom: p[3] };
    }

    /**
     * Apply CSS borders from DevExpress Borders / BorderColor / BorderWidth attributes.
     * bordersStr: "None" | "All" | "Left" | "Right" | "Top" | "Bottom" | comma combinations
     */
    applyBorders(element, bordersStr, borderColorStr, borderWidthStr) {
        if (!bordersStr || bordersStr.toLowerCase() === 'none') return;
        const color = this.parseColor(borderColorStr) || '#000000';
        const width = parseFloat(borderWidthStr) || 1;
        const bw = `${width}px solid ${color}`;
        if (bordersStr.toLowerCase() === 'all') { element.style.border = bw; return; }
        const sides = bordersStr.toLowerCase().split(',').map(s => s.trim());
        if (sides.includes('left'))   element.style.borderLeft   = bw;
        if (sides.includes('right'))  element.style.borderRight  = bw;
        if (sides.includes('top'))    element.style.borderTop    = bw;
        if (sides.includes('bottom')) element.style.borderBottom = bw;
    }

    /**
     * Apply font from a DevExpress Font string attribute to an HTML element.
     */
    applyFont(element, fontStr) {
        const font = this.parseFont(fontStr);
        if (!font) return;
        element.style.fontFamily = `"${font.family}", serif`;
        element.style.fontSize   = `${font.size}pt`;
        element.style.fontWeight = font.bold   ? 'bold'   : 'normal';
        element.style.fontStyle  = font.italic ? 'italic' : 'normal';
        const deco = [font.underline && 'underline', font.strikeout && 'line-through'].filter(Boolean).join(' ');
        if (deco) element.style.textDecoration = deco;
    }

    /**
     * Apply flexbox-based text alignment from a DevExpress TextAlignment string.
     * TextAlignment values: "MiddleLeft", "TopCenter", "BottomRight", etc.
     */
    applyTextAlignment(element, textAlignment) {
        if (!textAlignment) return;
        const ta = textAlignment.toLowerCase();
        const jsContent = ta.includes('right')  ? 'flex-end' : ta.includes('center') ? 'center' : 'flex-start';
        const asItems   = ta.includes('bottom') ? 'flex-end' : ta.includes('middle') ? 'center' : 'flex-start';
        const cssText   = ta.includes('right')  ? 'right'    : ta.includes('center') ? 'center' : 'left';
        element.style.display        = 'flex';
        element.style.alignItems     = asItems;
        element.style.justifyContent = jsContent;
        element.style.textAlign      = cssText;
    }
        
    // ─── COMPONENT RENDERERS ─────────────────────────────────────
        if (!component) {
    renderLabel(element, xmlData) {
        this.applyFont(element, xmlData.getAttribute('Font'));
        this.applyTextAlignment(element, xmlData.getAttribute('TextAlignment'));
        this.applyBorders(element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth'));

        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;
        const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
        if (foreColor) element.style.color = foreColor;

        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft   = `${padding.left}px`;
            element.style.paddingRight  = `${padding.right}px`;
            element.style.paddingTop    = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }

        // Text content: expression binding takes priority
        const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
            .find(n => n.getAttribute('PropertyName') === 'Text');
        if (exprNode) {
            element.textContent = `[${exprNode.getAttribute('Expression') || ''}]`;
            element.classList.add('expression-field');
        } else {
            const text = xmlData.getAttribute('Text') ?? '';
            if (xmlData.getAttribute('AllowMarkupText') === 'true' && text) {
                const span = document.createElement('span');
                span.innerHTML = this._sanitizeMarkup(text);
                element.appendChild(span);
            } else {
                element.textContent = text;
            }
        }
    }
            propertiesTab.innerHTML = '<p class="text-muted">No component selected</p>';
    _sanitizeMarkup(html) {
        // Allow basic inline formatting tags only; strip everything else
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<(?!\/?(?:b|i|u|em|strong|span|br|s)\b)[^>]+>/gi, '');
    }
            xmlTab.innerHTML = '';
    renderCheckBox(element, xmlData) {
        this.applyBorders(element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth'));
        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;

        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft   = `${padding.left}px`;
            element.style.paddingRight  = `${padding.right}px`;
            element.style.paddingTop    = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }
            return;
        element.style.display    = 'flex';
        element.style.flexDirection = 'row';
        element.style.alignItems = 'center';
        element.style.overflow   = 'hidden';
        }
        // Checkbox glyph square
        const glyph = document.createElement('div');
        glyph.className = 'checkbox-glyph';
        glyph.style.cssText = 'flex-shrink:0;width:13px;height:13px;border:1.5px solid #444;background:#fff;'
            + 'box-sizing:border-box;margin-right:5px;display:flex;align-items:center;justify-content:center;';

        // Check state
        const checkState = xmlData.getAttribute('CheckState');
        if (checkState === 'Checked') {
            glyph.innerHTML = '<svg width="9" height="9" viewBox="0 0 9 9">'
                + '<polyline points="1,4 3.5,7.5 8,1.5" stroke="#222" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
                + '</svg>';
        } else {
            const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
                .find(n => n.getAttribute('PropertyName') === 'CheckBoxState' || n.getAttribute('PropertyName') === 'CheckState');
            if (exprNode) element.classList.add('expression-field');
        }
        element.appendChild(glyph);
        // Update Properties tab
        // Text label
        const text = xmlData.getAttribute('Text') || '';
        if (text) {
            const label = document.createElement('span');
            label.style.overflow     = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace   = 'nowrap';
            this.applyFont(label, xmlData.getAttribute('Font'));
            const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
            if (foreColor) label.style.color = foreColor;
            label.textContent = text;
            element.appendChild(label);
        }
    }
        const xmlData = new DOMParser().parseFromString(component.dataset.xml, 'text/xml').documentElement;
    renderPictureBox(element, xmlData) {
        const imageData = xmlData.querySelector('Image')?.textContent;
        if (imageData) {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${imageData}`;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
            element.appendChild(img);
        } else {
            // Show expression placeholder
            const exprNode = Array.from(xmlData.querySelectorAll('ExpressionBindings > *'))
                .find(n => n.getAttribute('PropertyName') === 'ImageSource' || n.getAttribute('PropertyName') === 'Image');
            element.style.background  = '#f0f0f0';
            element.style.border      = '1px dashed #bbb';
            element.style.display     = 'flex';
            element.style.alignItems  = 'center';
            element.style.justifyContent = 'center';
            const ph = document.createElement('span');
            ph.style.cssText = 'font-size:9pt;color:#888;text-align:center;padding:4px;';
            ph.textContent = exprNode ? `[${exprNode.getAttribute('Expression')}]` : '[Image]';
            element.appendChild(ph);
        }
    }
        const properties = this.extractComponentProperties(xmlData);
    renderPanel(element, xmlData) {
        // Panel is position:absolute (set by createComponentElement).
        // Children use LocationFloat relative to this panel's origin,
        // so this element itself is the CSS containing block (position:absolute is already set).
        const backColor = this.parseColor(xmlData.getAttribute('BackColor'));
        if (backColor && backColor !== 'transparent') element.style.backgroundColor = backColor;
        this.applyBorders(element,
            xmlData.getAttribute('Borders'),
            xmlData.getAttribute('BorderColor'),
            xmlData.getAttribute('BorderWidth'));
        element.style.overflow = 'visible';
        
        const controls = xmlData.querySelector('Controls');
        if (!controls) return;
        Array.from(controls.children).forEach(ctrl => {
            const ct = ctrl.getAttribute('ControlType') || '';
            if (!ct.startsWith('XR')) return;
            const child = this.createComponentElement(ctrl);
            if (child) element.appendChild(child);
        });
    }
        propertiesTab.innerHTML = Object.entries(properties)
    renderTable(element, xmlData) {
        const [tableW, tableH] = (xmlData.getAttribute('SizeF') || '0,0')
            .split(',').map(n => parseFloat(n.trim()) || 0);
        const rowsContainer = xmlData.querySelector('Rows');
        if (!rowsContainer) return;
            .map(([group, props]) => `
        const rowXmls = Array.from(rowsContainer.children)
            .filter(el => el.getAttribute('ControlType') === 'XRTableRow');
        if (!rowXmls.length) return;
                <div class="property-group">
        const totalWeight = rowXmls.reduce((s, r) => s + (parseFloat(r.getAttribute('Weight')) || 1), 0);
        element.style.overflow = 'visible';
                    <h6>${group}</h6>
        let rowY = 0;
        rowXmls.forEach(rowXml => {
            const weight = parseFloat(rowXml.getAttribute('Weight')) || 1;
            const rowH   = totalWeight > 0 ? (weight / totalWeight) * tableH : tableH / rowXmls.length;
                    ${Object.entries(props)
            const rowDiv = document.createElement('div');
            rowDiv.className = 'report-table-row';
            rowDiv.style.cssText = `position:absolute;top:${rowY}px;left:0;width:${tableW}px;height:${rowH}px;`;
                        .map(([key, value]) => `
            const cellXmls = Array.from((rowXml.querySelector('Cells') || { children: [] }).children)
                .filter(el => el.getAttribute('ControlType') === 'XRTableCell');
                            <div class="mb-1">
            let cellX = 0;
            cellXmls.forEach(cellXml => {
                const cellW = parseFloat(cellXml.getAttribute('WidthF')) || 0;
                const cellH = rowH;

                const cellDiv = document.createElement('div');
                cellDiv.className = 'report-table-cell';
                cellDiv.dataset.type = 'XRTableCell';
                cellDiv.dataset.name = cellXml.getAttribute('Name') || '';
                cellDiv.style.cssText = `position:absolute;left:${cellX}px;top:0;width:${cellW}px;height:${cellH}px;`
                    + 'box-sizing:border-box;overflow:visible;';
                                <div class="inspector-row">
                this.applyBorders(cellDiv,
                    cellXml.getAttribute('Borders'),
                    cellXml.getAttribute('BorderColor'),
                    cellXml.getAttribute('BorderWidth'));
                                    <span class="property-key">${key}: </span> <span class="property-value">${value}</span>
                const cellPad = this.parsePadding(cellXml.getAttribute('Padding'));
                if (cellPad) {
                    cellDiv.style.paddingLeft   = `${cellPad.left}px`;
                    cellDiv.style.paddingRight  = `${cellPad.right}px`;
                    cellDiv.style.paddingTop    = `${cellPad.top}px`;
                    cellDiv.style.paddingBottom = `${cellPad.bottom}px`;
                }
                                </div>
                const backColor = this.parseColor(cellXml.getAttribute('BackColor'));
                if (backColor && backColor !== 'transparent') cellDiv.style.backgroundColor = backColor;
                            </div>
                // Render controls inside cell — their LocationFloat is cell-relative
                const controls = cellXml.querySelector('Controls');
                if (controls) {
                    Array.from(controls.children).forEach(ctrl => {
                        const ct = ctrl.getAttribute('ControlType') || '';
                        if (!ct.startsWith('XR')) return;
                        const child = this.createComponentElement(ctrl);
                        if (child) cellDiv.appendChild(child);
                    });
                }
                        `).join('')}
                rowDiv.appendChild(cellDiv);
                cellX += cellW;
            });
                </div>
            element.appendChild(rowDiv);
            rowY += rowH;
        });
    }
            `).join('');
    renderPageInfo(element, xmlData) {
        this.applyFont(element, xmlData.getAttribute('Font'));
        this.applyTextAlignment(element, xmlData.getAttribute('TextAlignment'));
        const padding = this.parsePadding(xmlData.getAttribute('Padding'));
        if (padding) {
            element.style.paddingLeft   = `${padding.left}px`;
            element.style.paddingRight  = `${padding.right}px`;
            element.style.paddingTop    = `${padding.top}px`;
            element.style.paddingBottom = `${padding.bottom}px`;
        }
        const foreColor = this.parseColor(xmlData.getAttribute('ForeColor'));
        if (foreColor) element.style.color = foreColor;
        element.textContent = 'Page 1 of N';
    }

    renderLine(element, xmlData) {
        element.style.overflow = 'visible';
        const h = parseFloat((xmlData.getAttribute('SizeF') || '1,2').split(',')[1]) || 2;
        const lineColor = this.parseColor(
            xmlData.getAttribute('ForeColor') || xmlData.getAttribute('BorderColor')
        ) || '#000000';
        const lineWidth = parseFloat(xmlData.getAttribute('LineWidth') ?? xmlData.getAttribute('BorderWidth') ?? '1');
        const lineDiv = document.createElement('div');
        lineDiv.style.cssText = `position:absolute;left:0;top:${Math.max(0, h / 2 - lineWidth / 2)}px;`
            + `width:100%;border-top:${lineWidth}px solid ${lineColor};`;
        element.appendChild(lineDiv);
    }
        // Update XML tab
        xmlTab.innerHTML = this.formatXML(component.dataset.xml);
    }

    extractComponentProperties(xmlElement) {
        const properties = {
            Layout: {},
            Font: {},
            General: {}
        };

        // Layout properties
        const location = xmlElement.getAttribute('LocationFloat')?.split(',');
        const size = xmlElement.getAttribute('SizeF')?.split(',');
        properties.Layout = {
            X: location ? `${location[0]}px` : '0px',
            Y: location ? `${location[1]}px` : '0px',
            Width: size ? `${size[0]}px` : '0px',
            Height: size ? `${size[1]}px` : '0px'
        };

        // Font properties
        const font = xmlElement.querySelector('Font');
        if (font) {
            properties.Font = {
                Name: font.getAttribute('Name') || 'Arial',
                Size: `${font.getAttribute('Size') || 10}pt`,
                Bold: font.getAttribute('Bold') === 'true' ? 'Yes' : 'No',
                Italic: font.getAttribute('Italic') === 'true' ? 'Yes' : 'No'
            };
        }

        // General properties
        properties.General = {
            Type: xmlElement.tagName,
            Name: xmlElement.getAttribute('Name') || '',
            Text: xmlElement.querySelector('Text')?.textContent || ''
        };

        return properties;
    }

    // Helper method to format XML for display
    formatXML(xml) {
        return this.prettyPrintXml(xml);
    }

    // Helper method to dump XML structure for debugging
    dumpElementStructure(element, depth = 0) {
        if (!element) return 'null';
        if (depth > 10) return '[max depth reached]';
        
        const indent = '  '.repeat(depth);
        let result = `${indent}${element.tagName}\n`;
        
        if (element.attributes && element.attributes.length > 0) {
            result += `${indent}Attributes: ${Array.from(element.attributes)
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(', ')}\n`;
        }
        
        if (element.childNodes && element.childNodes.length > 0) {
            result += `${indent}Children:\n`;
            Array.from(element.childNodes)
                .filter(node => node.nodeType === 1) // Only element nodes
                .forEach(child => {
                    result += this.dumpElementStructure(child, depth + 1);
                });
        }
        
        return result;
    }

    setZoom(scale) {
        this.scale = Math.max(0.1, Math.min(5, scale)); // Limit scale between 0.1 and 5
        const page = this.container.querySelector('.report-page');
        if (page) {
            page.style.transform = `scale(${this.scale})`;
        }
        document.getElementById('zoomLevel').textContent = `${Math.round(this.scale * 100)}%`;
    }
}

/**
 * Creates a DevExpress preview from JSON data and decoded template
 * @param {Object} devExpressData - The DevExpress JSON data
 * @param {Object} decodedTemplate - The decoded template containing XML content
 */
export function createDevExpressPreview(devExpressData, decodedTemplate) {
    console.log('createDevExpressPreview called with:', {
        hasDevExpressData: Boolean(devExpressData),
        hasDecodedTemplate: Boolean(decodedTemplate),
        templateType: decodedTemplate?.type
    });

    const container = document.getElementById('reportContainer');
    if (!container) {
        console.error('Report container not found for preview');
        return;
    }

    // Create or reuse viewer instance
    if (!window.viewer) {
        window.viewer = new ReportViewer(container);
    }

    // If we have XML content, render it
    if (decodedTemplate?.content) {
        window.viewer.renderReport(decodedTemplate.content);
    }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ReportViewer');
    const container = document.getElementById('reportContainer');
    if (container) {
        console.log('Report container found, creating viewer instance');
        window.viewer = new ReportViewer(container);
    } else {
        console.error('Report container element not found!');
    }
});