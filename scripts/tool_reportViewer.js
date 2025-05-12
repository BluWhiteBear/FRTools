let currentScale = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

async function loadViewerComponent(containerId) {
  try {
    // Fetch the shared component HTML
    const response = await fetch('components/devexpress-viewer.html');
    const html = await response.text();
    
    // Insert the component into the specified container
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }
    container.innerHTML = html;

    // Now that the component is loaded, we can proceed with initialization
    return true;
  } catch (error) {
    console.error('Error loading viewer component:', error);
    return false;
  }
}

const PREVIEW_HANDLERS = {
  XRLabel: (control, sanitizedText) => {
    control.classList.add('preview-label');
    control.textContent = sanitizedText;
  },

  XRCheckBox: (control, sanitizedText, xmlControl) => {
    control.classList.add('preview-checkbox');
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
  
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.disabled = true;
    checkbox.style.margin = '0';
    checkbox.style.flexShrink = '0';
  
    // Handle checkbox state
    const expressionBinding = xmlControl.querySelector('ExpressionBindings Item1[PropertyName="CheckBoxState"]');
    if (expressionBinding) {
      const expression = expressionBinding.getAttribute('Expression');
      if (expression) {
        checkbox.checked = Boolean(expression);
      }
    }
    
    wrapper.appendChild(checkbox);
  
    // Add label only if Text exists and isn't the default placeholder
    const text = xmlControl.getAttribute('Text');
    if (text && text.trim() && !text.startsWith('checkBox')) {
      const label = document.createElement('span');
      label.textContent = text;
      label.style.flexGrow = '1';
      wrapper.appendChild(label);
    }
  
    control.appendChild(wrapper);
  },

  XRPanel: (control) => {
    control.classList.add('preview-panel');
    control.style.border = '1px dashed #666';
    control.style.backgroundColor = 'rgba(0,0,0,0.02)';
    control.style.position = 'absolute';
    control.style.boxSizing = 'border-box';
    
    // Get padding from control's padding attribute
    const padding = control.getAttribute('Padding')?.split(',').map(Number) || [2,2,0,0,96];
    control.style.padding = `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;
    
    // Set z-index to ensure proper stacking
    control.style.zIndex = '1';
  },

  XRTable: (control, _, xmlControl) => {
    control.classList.add('preview-table');
    const rows = xmlControl.querySelectorAll('Rows Item1');
    const columns = xmlControl.querySelectorAll('Columns Item1');
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.border = '1px solid #ccc';

    // Process table structure...
    control.appendChild(table);
  },

  XRTableCell: (control, sanitizedText, xmlControl) => {
    control.classList.add('preview-cell');
    control.style.border = '1px solid #ccc';
    control.style.padding = '4px';
    control.style.textAlign = 'center';
    control.textContent = sanitizedText;

    // Handle spans...
  },

  XRPageBreak: (control) => {
    control.classList.add('preview-pagebreak');
    control.style.borderTop = '2px dashed #666';
    control.style.padding = '4px';
    control.textContent = 'Page Break';
  },

  XRPictureBox: (control) => {
    control.classList.add('preview-picturebox');
    control.style.border = '1px solid #ccc';
    control.style.padding = '4px';
    control.style.textAlign = 'center';
    control.textContent = 'Image';
  }
};

// DevExpress Report Preview Functions
function sanitizeXmlContent(content) {
  if (!content) return '';
  
  // First decode all HTML entities to get raw text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const rawText = tempDiv.textContent;

  // Then properly escape XML special characters
  return rawText
    .replace(/&/g, '&amp;')     // Must be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createDevExpressPreview(devExpressJson, decodedTemplate) {
  // First ensure the viewer component is loaded
  const success = await loadViewerComponent('viewer-container');
  if (!success) {
    const container = document.getElementById('viewer-container');
    if (container) {
      showError(container, 'Failed to load viewer component');
    }
    return;
  }

  const previewContainer = document.getElementById('devexpress-preview');
  if (!previewContainer) {
      console.error('Preview container not found');
      showError(document.querySelector('.preview-container'), 'Preview container not found');
      return;
  }

  const page = previewContainer.querySelector('.preview-page');
  if (!page) {
      console.error('Preview page element not found');
      showError(previewContainer, 'Preview page element not found');
      return;
  }

  try {
      // Parse XML to get page dimensions
      const xmlDoc = parseXmlContent(decodedTemplate.content);
      const rootElement = xmlDoc.documentElement;
      
      // Get page dimensions from XML
      const pageWidth = parseFloat(rootElement.getAttribute('PageWidth') || '850');
      const pageHeight = parseFloat(rootElement.getAttribute('PageHeight') || '1100');
      const isLandscape = rootElement.getAttribute('Landscape') === 'true';
      const scale = 1;
      
      // Reset page content
      page.innerHTML = '';
      
      // Get bands container and process margins
      const bandsContainer = xmlDoc.querySelector('Bands');
      if (!bandsContainer) {
          throw new Error('No bands container found in report template');
      }

      const topMarginBand = bandsContainer.querySelector('Item1[ControlType="TopMarginBand"]');
      const bottomMarginBand = bandsContainer.querySelector('Item4[ControlType="BottomMarginBand"]');
      const topMargin = parseFloat(topMarginBand?.getAttribute('HeightF') || '0');
      const bottomMargin = parseFloat(bottomMarginBand?.getAttribute('HeightF') || '0');
      
      // Setup page styles
      page.style.position = 'relative';
      page.style.width = `${pageWidth}px`;
      page.style.minHeight = `${pageHeight}px`;
      page.style.transformOrigin = 'top left';
      page.style.transform = `scale(${scale})`;
      page.style.marginBottom = '20px';
      page.style.backgroundColor = '#fff';
      page.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
      page.style.overflow = 'hidden';
      page.style.paddingTop = `${topMargin}px`;
      page.style.paddingBottom = `${bottomMargin}px`;

      // Center the page in its container
      previewContainer.style.display = 'flex';
      previewContainer.style.flexDirection = 'column';
      previewContainer.style.alignItems = 'center';
      previewContainer.style.width = '100%';
      previewContainer.style.overflow = 'auto';
      previewContainer.style.padding = '20px';

      // Initialize debug style toggle handler
      const debugToggle = document.getElementById('debug-style-toggle');
      if (debugToggle) {
          debugToggle.addEventListener('change', () => {
              page.classList.toggle('show-debug-styles', debugToggle.checked);
          });
          // Initialize debug style state
          page.classList.toggle('show-debug-styles', debugToggle.checked);
      }

      // Process all report bands
      const bands = ['TopMarginBand', 'PageHeaderBand', 'DetailBand', 'BottomMarginBand'];
      processReportBands(bands, bandsContainer, page);

      // Initialize zoom controls
      initZoomControls(page, scale);

  } catch (error) {
      console.error('Error processing report template:', error);
      showError(previewContainer, error.message);
  }
}

function initZoomControls(page, baseScale) {
  currentScale = baseScale || 1;
  
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomResetBtn = document.getElementById('zoomReset');

  if (!zoomOutBtn || !zoomInBtn || !zoomResetBtn) {
    console.warn('Zoom controls not found - they may not be loaded yet');
    return;
  }

  function updateZoom() {
    page.style.transform = `scale(${currentScale})`;
    zoomResetBtn.textContent = `${Math.round(currentScale * 100)}%`;
  }

  zoomOutBtn.addEventListener('click', () => {
    currentScale = Math.max(currentScale - ZOOM_STEP, MIN_ZOOM);
    updateZoom();
  });

  zoomInBtn.addEventListener('click', () => {
    currentScale = Math.min(currentScale + ZOOM_STEP, MAX_ZOOM);
    updateZoom();
  });

  zoomResetBtn.addEventListener('click', () => {
    currentScale = 1;
    updateZoom();
  });

  // Initialize the zoom display
  updateZoom();
}

// DevExpress Report Preview Functions
function parseXmlContent(content) {
  // Add validation for empty content
  if (!content) {
    console.error('Content is null or undefined');
    throw new Error('No XML content provided');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    console.error('Content is empty after trimming');
    throw new Error('Empty XML content provided');
  }

  // Ensure content starts with XML declaration
  const xmlContent = trimmedContent.startsWith('<?xml') ? 
    trimmedContent : 
    '<?xml version="1.0" encoding="utf-8"?>\n' + trimmedContent;

  // Validate basic XML structure
  if (!xmlContent.includes('<')) {
    console.error('No XML tags found in content');
    throw new Error('Invalid XML content - no tags found');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  const parseError = xmlDoc.querySelector('parsererror');
  
  if (parseError) {
    console.error('XML Parse Error:', {
      error: parseError.textContent,
      content: xmlContent.substring(0, 500)
    });
    throw new Error(`XML parsing error: ${parseError.textContent}`);
  }

  return xmlDoc;
}


function showError(container, message) {
  container.innerHTML = `
    <div class="alert alert-danger">
      <strong>Error processing report template:</strong><br>
      ${message}<br>
      <small class="text-muted">
        Please ensure valid DevExpress XML content with proper encoding.<br>
        Check the browser console for detailed error information.
      </small>
    </div>`;
}

function processReportBands(bands, bandsContainer, page) {
  let yOffset = 0;
  
  bands.forEach(bandType => {
    const bandElements = Array.from(bandsContainer.children).filter(node => 
      node.getAttribute('ControlType')?.includes(bandType)
    );

    bandElements.forEach(band => {
      const controls = band.querySelector('Controls');
      // Calculate band height based on its contents
      const contentHeight = controls ? calculateContentHeight(Array.from(controls.children)) : 0;
      const bandHeight = Math.max(
        parseFloat(band.getAttribute('HeightF') || '50'),
        contentHeight
      );
        const bandContainer = createBandContainer(bandHeight, yOffset, bandType);
      
      // Process controls for the current band
      if (controls) {
        Array.from(controls.children).forEach(control => {
          processControlElements(control, bandContainer, 0, 0);
        });
      }
      page.appendChild(bandContainer);

      // Handle subbands for DetailBand
      if (bandType === 'DetailBand') {
        const subBands = band.querySelector('SubBands');
        if (subBands) {
          Array.from(subBands.children).forEach(subBand => {
            const subControls = subBand.querySelector('Controls');
            const subContentHeight = subControls ? 
              calculateContentHeight(Array.from(subControls.children)) : 0;
            const subBandHeight = Math.max(
              parseFloat(subBand.getAttribute('HeightF') || '50'),
              subContentHeight
            );
            
            yOffset += bandHeight;
            const subBandContainer = createBandContainer(subBandHeight, yOffset, 'SubBand');
            if (subControls) {
              Array.from(subControls.children).forEach(control => {
                processControlElements(control, subBandContainer, 0, 0);
              });
            }
            page.appendChild(subBandContainer);
          });
        }
      }
      
      yOffset += bandHeight;
    });
  });

  // Set final page height
  const totalHeight = yOffset + 100; // Add padding
  page.style.minHeight = `${totalHeight}px`;
  page.style.height = `${totalHeight}px`;
}

function createBandContainer(height, yOffset, bandType) {
  const bandContainer = document.createElement('div');
  // Convert band type to lowercase and clean it for CSS class name
  const bandClass = bandType.toLowerCase().replace(/\s+/g, '-');
  bandContainer.className = `preview-band preview-band-${bandClass}`;
  
  // Store original band type for debugging label
  bandContainer.setAttribute('data-band-type', bandType.replace('Band', ''));
  
  // Set base styles
  bandContainer.style.position = 'relative';
  bandContainer.style.margin = '0';
  bandContainer.style.padding = '0';
  bandContainer.style.width = '100%';
  bandContainer.style.height = `${height}px`;
  bandContainer.style.boxSizing = 'border-box';
  bandContainer.style.transform = `translateY(${yOffset}px)`;
  
  return bandContainer;
}

function processControlElements(control, parentElement, xOffset = 0, yOffset = 0) {
  if (!control || !control.tagName.startsWith('Item')) return;

  const type = control.getAttribute('ControlType');
  const name = control.getAttribute('Name');
  const text = control.getAttribute('Text');
  const sizeF = control.getAttribute('SizeF')?.split(',') || ['300', '25'];
  const location = control.getAttribute('LocationFloat')?.split(',') || ['0', '0'];
  const padding = control.getAttribute('Padding')?.split(',') || ['2', '2', '0', '0', '96'];
  const previewControl = createPreviewControl(
    type,
    name, 
    text,
    sizeF,
    location,
    padding,
    control
  );

  if (previewControl) {
    previewControl.style.position = 'absolute';
    previewControl.style.boxSizing = 'border-box';
    
    // Get control positioning from XML
    const x = parseFloat(location[0]);
    const y = parseFloat(location[1]);
    const width = parseFloat(sizeF[0]);
    const height = parseFloat(sizeF[1]);
    
    // Apply exact positioning
    previewControl.style.left = `${x}px`;
    previewControl.style.top = `${y}px`;
    previewControl.style.width = `${width}px`;
    previewControl.style.height = `${height}px`;

    // Add debug outline to help visualize control boundaries
    previewControl.style.outline = '1px dotted rgba(0,0,0,0.1)';

    parentElement.appendChild(previewControl);

    // Process nested controls if any
    const controls = control.querySelector('Controls');
    if (controls) {
      Array.from(controls.children).forEach(nestedControl => {
        processControlElements(
          nestedControl,
          previewControl,
          0,  // Reset offset since using container's padding
          0   // Reset offset since using container's padding
        );
      });
    }
  }
}

function calculateContentHeight(controls) {
  let maxHeight = 0;
  controls.forEach(control => {
    const location = control.getAttribute('LocationFloat')?.split(',') || ['0', '0'];
    const sizeF = control.getAttribute('SizeF')?.split(',') || ['0', '0'];
    const bottom = parseFloat(location[1]) + parseFloat(sizeF[1]);
    maxHeight = Math.max(maxHeight, bottom);
  });
  return maxHeight;
}

function createPreviewControl(type, name, text, sizeF, location, padding, xmlControl) {  const control = document.createElement('div');
  // Add both generic and type-specific classes
  const typeClass = type.toLowerCase().replace(/\s+/g, '-');
  control.className = `preview-control preview-control-${typeClass}`;
  control.style.position = 'absolute';
  control.style.left = `${parseFloat(location[0])}px`;
  control.style.top = `${parseFloat(location[1])}px`;
  control.style.width = `${parseFloat(sizeF[0])}px`;
  control.style.height = `${parseFloat(sizeF[1])}px`;
  control.style.padding = `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;

  // Handle font attributes
  const font = xmlControl.getAttribute('Font');
  if (font) {
    const fontParts = font.split(',');
    if (fontParts.length >= 2) {
      const fontFamily = fontParts[0].trim();
      const fontSize = fontParts[1].trim();
      const fontStyle = fontParts[2] || '';
      
      control.style.fontFamily = `${fontFamily}, Arial, sans-serif`;
      control.style.fontSize = fontSize;
      
      if (fontStyle.includes('Bold')) {
        control.style.fontWeight = 'bold';
      }
      if (fontStyle.includes('Italic')) {
        control.style.fontStyle = 'italic';
      }
      if (fontStyle.includes('Underline')) {
        control.style.textDecoration = 'underline';
      }
    }
  }

  // Handle StylePriority elements 
  const stylePriority = xmlControl.querySelector('StylePriority');
  if (stylePriority) {
    if (stylePriority.getAttribute('UseFont') === 'true') {
      // Keep font styles from Font attribute
      const fontStyles = control.style.cssText;
      control.style.cssText = fontStyles;
    }
  }

  // Get text alignment from XML element
  const textAlignment = xmlControl.getAttribute('TextAlignment');
  if (textAlignment) {
    switch (textAlignment) {
      case 'MiddleCenter':
        control.style.display = 'flex';
        control.style.alignItems = 'center';
        control.style.justifyContent = 'center';
        control.style.textAlign = 'center';
        break;
      case 'MiddleLeft':
        control.style.display = 'flex';
        control.style.alignItems = 'center';
        control.style.textAlign = 'left';
        break;
      case 'MiddleRight': 
        control.style.display = 'flex';
        control.style.alignItems = 'center';
        control.style.justifyContent = 'flex-end';
        control.style.textAlign = 'right';
        break;
      case 'TopCenter':
        control.style.textAlign = 'center';
        break;
      case 'TopLeft':
        control.style.textAlign = 'left';
        break;
      case 'TopRight':
        control.style.textAlign = 'right';
        break;
      case 'BottomCenter':
        control.style.display = 'flex';
        control.style.alignItems = 'flex-end';
        control.style.justifyContent = 'center';
        control.style.textAlign = 'center';
        break;
      case 'BottomLeft':
        control.style.display = 'flex';
        control.style.alignItems = 'flex-end';
        control.style.textAlign = 'left';
        break;
      case 'BottomRight':
        control.style.display = 'flex';
        control.style.alignItems = 'flex-end';
        control.style.justifyContent = 'flex-end';
        control.style.textAlign = 'right';
        break;
    }
  }

  // Sanitize text content
  const sanitizedText = sanitizeXmlContent(text || name);

  // Handle different control types
  const handler = PREVIEW_HANDLERS[type];
  if (handler) {
    handler(control, sanitizedText, xmlControl);
  } else {
    // Default handler for unknown types
    control.classList.add('preview-unknown');
    control.style.border = '1px dotted #999';
    control.style.backgroundColor = 'rgba(255,0,0,0.1)';
    control.textContent = `${type}: ${sanitizedText}`;
  }

  return control;
}

function decodeReportTemplate(base64Template) {
  try {
    // Check for empty input
    if (!base64Template) {
      console.error('Empty base64 template provided');
      throw new Error('No report template data found');
    }

    // Convert base64 to binary
    let binaryStr;
    try {
      binaryStr = atob(base64Template);
      console.log('Binary decode debug:', {
        decodedLength: binaryStr.length,
        firstBytes: Array.from(binaryStr.slice(0, 4)).map(b => b.charCodeAt(0).toString(16))
      });
    } catch (base64Error) {
      console.error('Base64 decode failed:', base64Error);
      throw new Error('Invalid base64 encoding');
    }

    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Check if gzipped (magic numbers 0x1f 0x8b)
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      try {
        const decompressed = pako.inflate(bytes, { to: 'string' });
        console.log('Decompression result:', {
          success: Boolean(decompressed),
          length: decompressed?.length,
          sample: decompressed?.substring(0, 100)
        });
        
        if (!decompressed) {
          throw new Error('Decompression returned empty result');
        }

        // Validate and clean decompressed content
        const cleanedContent = decompressed.trim();
        if (!cleanedContent) {
          throw new Error('Decompressed content is empty after trimming');
        }

        // Ensure valid XML structure
        if (!cleanedContent.startsWith('<?xml')) {
          console.error('Invalid XML content:', {
            start: cleanedContent.substring(0, 50),
            length: cleanedContent.length
          });
          throw new Error('Invalid XML content - missing XML declaration');
        }

        if (!cleanedContent.includes('XtraReportsLayoutSerializer')) {
          console.error('Not a DevExpress report:', {
            content: cleanedContent.substring(0, 200)
          });
          throw new Error('Invalid DevExpress report structure');
        }

        return {
          type: 'xml',
          content: cleanedContent,
          format: 'DevExpress XML Report'
        };

      } catch (error) {
        console.error('Decompression/validation failed:', {
          error,
          bytesLength: bytes.length,
          magic: `0x${bytes[0].toString(16)} 0x${bytes[1].toString(16)}`,
          sample: Array.from(bytes.slice(0, 10)).map(b => b.toString(16))
        });
        throw error;
      }
    } else {
      throw new Error('Invalid template format - not a gzipped file');
    }
  } catch (error) {
    console.error('Template decode failed:', {
      inputLength: base64Template?.length,
      inputSample: base64Template?.substring(0, 50),
      error 
    });
    throw error;
  }
}

// Export functions for use in other scripts
export { createDevExpressPreview, decodeReportTemplate };