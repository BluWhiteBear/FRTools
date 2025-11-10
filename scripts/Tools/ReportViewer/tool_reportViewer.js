// Report XML to HTML Converter and Viewer
class ReportViewer {
    constructor(container) {
        this.container = container;
        this.scale = 1.0;
        this.showBoundaries = false;
        this.selectedComponent = null;
        this.reportData = null;
        this.xmlIndentSize = 2;

        console.log('ReportViewer initialized with container:', container);
        // Initialize event handlers
        this.initEventHandlers();
    }

    initEventHandlers() {
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.setZoom(this.scale * 1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.setZoom(this.scale * 0.8));

        // Show boundaries toggle
        document.getElementById('showBoundaries')?.addEventListener('change', (e) => {
            this.showBoundaries = e.target.checked;
            this.container.classList.toggle('show-boundaries', this.showBoundaries);
        });

        // File upload
        const uploadElement = document.getElementById('reportUpload');
        console.log('Found upload element:', uploadElement);
        uploadElement?.addEventListener('change', (e) => this.handleFileUpload(e));

        // Copy buttons
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
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            alert('Failed to parse the report XML. Please check the console for details.');
            return;
        }
        
        this.reportData = xmlDoc;
        console.log('XML successfully parsed');

        // Log root element info
        console.log('Root element:', {
            name: xmlDoc.documentElement.tagName,
            attributes: Array.from(xmlDoc.documentElement.attributes)
                .map(a => `${a.name}="${a.value}"`)
                .join(', ')
        });

        // Find the Bands container
        const bandsContainer = xmlDoc.querySelector('XtraReportsLayoutSerializer > Bands');
        if (!bandsContainer) {
            console.error('No Bands container found in the report');
            return;
        }

        console.log('Found Bands container with', bandsContainer.childNodes.length, 'children');

        // Clear previous content
        this.container.innerHTML = '';

        // Create report page
        const page = document.createElement('div');
        page.className = 'report-page';
        
        // Set page size from XtraReport element
        const report = xmlDoc.querySelector('XtraReport');
        if (report) {
            const pageWidth = parseFloat(report.getAttribute('PageWidth')) || 850;
            const pageHeight = parseFloat(report.getAttribute('PageHeight')) || 1100;
            page.style.width = `${pageWidth}px`;
            page.style.height = `${pageHeight}px`;
        }

        // Get all band elements in order
        const bandElements = Array.from(bandsContainer.children).filter(el => {
            const controlType = el.getAttribute('ControlType');
            return controlType && controlType.includes('Band');
        });

        console.log('Found band elements:', bandElements.map(band => ({
            type: band.getAttribute('ControlType'),
            name: band.getAttribute('Name'),
            height: band.getAttribute('HeightF')
        })));

        console.log('Found bands:', bandElements.length);
        if (bandElements.length === 0) {
            // If no bands found, let's log more structure details
            console.log('Document structure:', this.dumpElementStructure(xmlDoc.documentElement));
        }

        let currentY = 0;
        
        // Helper function to process a band and its nested reports
        const processBandAndNestedReports = (band) => {
            const controlType = band.getAttribute('ControlType');
            let totalHeight = 0;

            // If this is a DetailReportBand, process its nested bands
            if (controlType === 'DetailReportBand') {
                const reportBandHeight = parseFloat(band.getAttribute('HeightF') || 0);
                console.log('Processing DetailReportBand:', {
                    name: band.getAttribute('Name'),
                    height: reportBandHeight
                });
                
                // Find the Detail band within this DetailReportBand
                const nestedBands = band.querySelector('Bands');
                if (nestedBands) {
                    const nestedBandElements = Array.from(nestedBands.children).filter(el => {
                        const type = el.getAttribute('ControlType');
                        return type && type.includes('Band');
                    });

                    console.log(`Found ${nestedBandElements.length} nested bands`);
                    
                    // Special case: single DetailBand should inherit parent's height if it's larger
                    if (nestedBandElements.length === 1 && 
                        nestedBandElements[0].getAttribute('ControlType') === 'DetailBand') {
                        
                        const detailBand = nestedBandElements[0];
                        const detailBandHeight = parseFloat(detailBand.getAttribute('HeightF') || 0);
                        
                        console.log('Single DetailBand found, comparing heights:', {
                            detailBandHeight,
                            reportBandHeight,
                            name: detailBand.getAttribute('Name')
                        });
                        
                        // Use the larger of the two heights
                        if (reportBandHeight > detailBandHeight) {
                            console.log(`Using DetailReportBand height (${reportBandHeight}) instead of DetailBand height (${detailBandHeight})`);
                            detailBand.setAttribute('HeightF', reportBandHeight.toString());
                        } else if (detailBandHeight > reportBandHeight) {
                            console.log(`Keeping DetailBand height (${detailBandHeight}) as it's larger than DetailReportBand height (${reportBandHeight})`);
                        }
                        
                        const nestedHeight = processBandAndNestedReports(detailBand);
                        totalHeight = nestedHeight;
                    } else {
                        // Process each nested band normally
                        nestedBandElements.forEach(nestedBand => {
                            const nestedHeight = processBandAndNestedReports(nestedBand);
                            totalHeight += nestedHeight;
                        });
                    }
                }
            } else {
                // Regular band processing
                console.log(`Processing band:`, {
                    type: controlType,
                    name: band.getAttribute('Name'),
                    height: band.getAttribute('HeightF')
                });
                
                const bandElement = this.createBandElement(band);
                bandElement.style.top = `${currentY}px`;
                
                // Process components within band
                this.processComponents(band, bandElement);
                
                page.appendChild(bandElement);
                
                const height = parseFloat(band.getAttribute('HeightF') || 0);
                totalHeight = height;
                currentY += height;
            }

            return totalHeight;
        };

        // Process all top-level bands
        bandElements.forEach((band, index) => {
            const height = processBandAndNestedReports(band);
            console.log(`Processed band ${index + 1}/${bandElements.length}, height: ${height}px`);
        });

        if (bandElements.length === 0) {
            console.warn('No bands found in the report template');
        }

        this.container.appendChild(page);
        this.setZoom(1.0); // Reset zoom
        this.updateInspector(null); // Clear inspector
    }

    createBandElement(bandXml) {
        const band = document.createElement('div');
        band.className = 'report-band';
        
        // Set band type based on ControlType
        const controlType = bandXml.getAttribute('ControlType');
        band.dataset.bandType = controlType || 'UnknownBand';
        
        // Add specific class based on band type
        if (controlType) {
            // Convert DevExpress band type to CSS class name
            // e.g., TopMarginBand -> band-top-margin
            const cssClass = 'band-' + controlType
                .replace('Band', '')
                .split(/(?=[A-Z])/)
                .join('-')
                .toLowerCase();
            band.classList.add(cssClass);
            
            // Also add a general class for the band category
            if (controlType.includes('Margin')) {
                band.classList.add('band-margin');
            } else if (controlType.includes('Header')) {
                band.classList.add('band-header');
            } else if (controlType.includes('Footer')) {
                band.classList.add('band-footer');
            } else if (controlType.includes('Detail')) {
                band.classList.add('band-content');
            }
        }
        
        // Set name if available
        const name = bandXml.getAttribute('Name');
        if (name) {
            band.dataset.name = name;
        }
        
        // Set height
        const height = parseFloat(bandXml.getAttribute('HeightF') || 0);
        band.style.height = `${height}px`;
        
        // Debug info
        console.log('Creating band element:', {
            type: controlType,
            cssClasses: Array.from(band.classList),
            name: name,
            height: height,
            controls: bandXml.querySelector('Controls')?.childNodes.length || 0
        });
        
        return band;
    }

    processComponents(bandXml, bandElement) {
        // Process all XRControl elements under the Controls node
        const controls = Array.from(bandXml.querySelectorAll('Controls > *[ControlType^="XR"]'));
        if (controls.length === 0) {
            console.log('No XRControl elements found in band:', bandElement.dataset.name);
            return;
        }

        console.log(`Processing ${controls.length} XR controls in band ${bandElement.dataset.name}`);

        controls.forEach((control, index) => {
            const controlType = control.getAttribute('ControlType');
            console.log(`Processing control ${index + 1}/${controls.length}:`, {
                type: controlType,
                name: control.getAttribute('Name')
            });

            switch (controlType) {
                case 'XRLabel':
                case 'XRPictureBox':
                case 'XRCheckBox':
                case 'XRPanel':
                    // For top-level components in a band, pass null as parent since positions are band-relative
                    const componentElement = this.createComponentElement(control, null);
                    if (componentElement) {
                        bandElement.appendChild(componentElement);
                    }
                    break;
                default:
                    console.log(`Skipping unsupported control type: ${controlType}`);
            }
        });
    }

    createComponentElement(componentXml, parentComponent = null) {
        const component = document.createElement('div');
        const controlType = componentXml.getAttribute('ControlType');
        
        // Add base component class
        component.className = 'report-component';
        
        // Add specific class based on component type
        if (controlType) {
            // Convert XRLabel to component-label, XRCheckBox to component-checkbox, etc.
            const cssClass = 'component-' + controlType
                .substring(2) // Remove 'XR' prefix
                .split(/(?=[A-Z])/)
                .join('-')
                .toLowerCase();
            component.classList.add(cssClass);
            
            // Also add a general class for the component category
            if (controlType.includes('Label')) {
                component.classList.add('component-text');
            } else if (controlType.includes('CheckBox')) {
                component.classList.add('component-input');
            } else if (controlType.includes('Picture')) {
                component.classList.add('component-media');
            } else if (controlType.includes('Panel')) {
                component.classList.add('component-container');
            }
        }
        
        component.dataset.type = controlType;
        
        // Get component name if available
        const name = componentXml.getAttribute('Name');
        if (name) {
            component.dataset.name = name;
        }

        // Position
        const locationString = componentXml.getAttribute('LocationFloat');
        const sizeString = componentXml.getAttribute('SizeF');
        
        console.log('Component position data:', {
            type: controlType,
            name: name,
            location: locationString,
            size: sizeString,
            parentType: parentComponent?.dataset.type
        });

        if (locationString && sizeString) {
            const [x, y] = locationString.split(',').map(n => parseFloat(n) || 0);
            const [width, height] = sizeString.split(',').map(n => parseFloat(n) || 0);
            
            // If this is a child of a panel or other container, adjust position relative to parent
            if (parentComponent) {
                const parentX = parseFloat(parentComponent.style.left) || 0;
                const parentY = parseFloat(parentComponent.style.top) || 0;
                console.log('Adjusting position relative to parent:', {
                    parentX,
                    parentY,
                    originalX: x,
                    originalY: y,
                    adjustedX: x - parentX,
                    adjustedY: y - parentY
                });
                component.style.left = `${x - parentX}px`;
                component.style.top = `${y - parentY}px`;
            } else {
                component.style.left = `${x}px`;
                component.style.top = `${y}px`;
            }
            
            component.style.width = `${width}px`;
            component.style.height = `${height}px`;
        } else {
            console.warn('Missing position/size data for component:', { type: controlType, name });
        }

        // Store XML data for inspection
        component.dataset.xml = componentXml.outerHTML;

        // Add click handler for inspection
        component.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectComponent(component);
        });

        // Render component content based on type
        switch (controlType) {
            case 'XRLabel':
                this.renderLabel(component, componentXml);
                break;
            case 'XRPictureBox':
                this.renderPictureBox(component, componentXml);
                break;
            case 'XRCheckBox':
                this.renderCheckBox(component, componentXml);
                break;
            case 'XRPanel':
                this.renderPanel(component, componentXml);
                break;
            // Add more component types as needed
        }

        return component;
    }

    renderLabel(element, xmlData) {
        // First check for ExpressionBindings
        const expressionBinding = xmlData.querySelector('ExpressionBindings > Item1[PropertyName="Text"]');
        let text = null;
        let expression = null;

        if (expressionBinding) {
            expression = expressionBinding.getAttribute('Expression');
            if (expression) {
                element.textContent = `${expression}`;
                element.classList.add('expression-field');
                console.log('Found expression binding:', expression);
            }
        } else {
            // If no expression binding, use the Text attribute
            text = xmlData.getAttribute('Text');
            if (text !== null) {
                element.textContent = text;
                console.log('Using static text:', text);
            } else {
                element.textContent = '[Empty]';
                console.log('No text content found');
            }
        }

        // Apply text formatting
        const font = xmlData.querySelector('Font');
        if (font) {
            element.style.fontFamily = font.getAttribute('Name') || 'Arial';
            element.style.fontSize = `${font.getAttribute('Size') || 10}pt`;
            element.style.fontWeight = font.getAttribute('Bold') === 'true' ? 'bold' : 'normal';
            element.style.fontStyle = font.getAttribute('Italic') === 'true' ? 'italic' : 'normal';
            
            // Handle additional font properties
            if (font.getAttribute('Underline') === 'true') element.style.textDecoration = 'underline';
            if (font.getAttribute('Strikeout') === 'true') element.style.textDecoration = 'line-through';
        }

        // Text alignment
        const textAlignment = xmlData.getAttribute('TextAlignment');
        if (textAlignment) {
            switch(textAlignment.toLowerCase()) {
                case 'middleleft': 
                    element.style.textAlign = 'left';
                    element.style.verticalAlign = 'middle';
                    break;
                case 'middlecenter':
                    element.style.textAlign = 'center';
                    element.style.verticalAlign = 'middle';
                    break;
                case 'middleright':
                    element.style.textAlign = 'right';
                    element.style.verticalAlign = 'middle';
                    break;
                case 'topleft':
                    element.style.textAlign = 'left';
                    element.style.verticalAlign = 'top';
                    break;
                case 'topcenter':
                    element.style.textAlign = 'center';
                    element.style.verticalAlign = 'top';
                    break;
                case 'topright':
                    element.style.textAlign = 'right';
                    element.style.verticalAlign = 'top';
                    break;
                case 'bottomleft':
                    element.style.textAlign = 'left';
                    element.style.verticalAlign = 'bottom';
                    break;
                case 'bottomcenter':
                    element.style.textAlign = 'center';
                    element.style.verticalAlign = 'bottom';
                    break;
                case 'bottomright':
                    element.style.textAlign = 'right';
                    element.style.verticalAlign = 'bottom';
                    break;
                default:
                    element.style.textAlign = 'left';
                    element.style.verticalAlign = 'top';
            }
        }

        // Handle background color
        const backColor = xmlData.getAttribute('BackColor');
        if (backColor) {
            element.style.backgroundColor = `#${backColor}`;
        }

        // Handle fore color (text color)
        const foreColor = xmlData.getAttribute('ForeColor');
        if (foreColor) {
            element.style.color = `#${foreColor}`;
        }

        console.log('Rendered label:', {
            text: text,
            expression: expression,
            font: font ? {
                name: font.getAttribute('Name'),
                size: font.getAttribute('Size'),
                bold: font.getAttribute('Bold'),
                italic: font.getAttribute('Italic')
            } : null,
            alignment: textAlignment
        });
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
        }
    }

    renderCheckBox(element, xmlData) {
        // Create checkbox wrapper for better styling
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';
        
        // Create checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'report-checkbox';
        
        // Handle check state
        const checkState = xmlData.getAttribute('CheckState');
        checkbox.checked = checkState === 'Checked';
        checkbox.disabled = true; // Make it read-only in preview
        
        // Apply text alignment
        const textAlignment = xmlData.getAttribute('TextAlignment');
        if (textAlignment) {
            wrapper.style.justifyContent = this.getAlignmentStyle(textAlignment);
            wrapper.style.alignItems = this.getVerticalAlignmentStyle(textAlignment);
        }
        
        // Handle expression bindings
        const expressionBinding = xmlData.querySelector('ExpressionBindings > Item[PropertyName="CheckState"]');
        if (expressionBinding) {
            const expression = expressionBinding.getAttribute('Expression');
            if (expression) {
                element.classList.add('expression-field');
                element.setAttribute('data-expression', expression);
            }
        }
        
        // Apply size styles to checkbox based on element dimensions
        const size = Math.min(
            parseInt(element.style.width),
            parseInt(element.style.height)
        );
        checkbox.style.width = `${Math.min(size, 20)}px`;
        checkbox.style.height = `${Math.min(size, 20)}px`;
        
        // Apply colors if specified
        const backColor = xmlData.getAttribute('BackColor');
        if (backColor) {
            wrapper.style.backgroundColor = `#${backColor}`;
        }
        
        // Add checkbox to wrapper and wrapper to element
        wrapper.appendChild(checkbox);
        element.appendChild(wrapper);
    }
    
    getAlignmentStyle(textAlignment) {
        if (!textAlignment) return 'flex-start';
        if (textAlignment.toLowerCase().includes('center')) return 'center';
        if (textAlignment.toLowerCase().includes('right')) return 'flex-end';
        return 'flex-start';
    }
    
    getVerticalAlignmentStyle(textAlignment) {
        if (!textAlignment) return 'flex-start';
        if (textAlignment.toLowerCase().includes('middle')) return 'center';
        if (textAlignment.toLowerCase().includes('bottom')) return 'flex-end';
        return 'flex-start';
    }

    renderPanel(element, xmlData) {
        // Create panel wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'panel-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        
        // Apply panel styling
        const borderColor = xmlData.getAttribute('BorderColor');
        const borderWidth = xmlData.getAttribute('BorderWidth');
        if (borderColor) {
            wrapper.style.border = `${borderWidth || 1}px solid #${borderColor}`;
        }

        // Apply background color if specified
        const backColor = xmlData.getAttribute('BackColor');
        if (backColor) {
            wrapper.style.backgroundColor = `#${backColor}`;
        }

        // Process child controls within the panel
        const controls = xmlData.querySelectorAll('Controls > *[ControlType^="XR"]');
        controls.forEach(control => {
            // Pass the panel element as the parent for proper positioning
            const childComponent = this.createComponentElement(control, element);
            if (childComponent) {
                wrapper.appendChild(childComponent);
            }
        });

        element.appendChild(wrapper);
    }

    selectComponent(component) {
        // Remove previous selection
        if (this.selectedComponent) {
            this.selectedComponent.classList.remove('selected');
        }
        
        this.selectedComponent = component;
        component.classList.add('selected');
        
        // Update inspector and show modal
        this.updateInspector(component);
        
        // Show the modal
        const inspectorModal = new bootstrap.Modal(document.getElementById('inspectorModal'), {
            backdrop: false
        });
        inspectorModal.show();
        
        // Update modal title with component info
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

        // Update Properties tab
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