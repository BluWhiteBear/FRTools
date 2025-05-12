// Creates a form component based on the Form.io JSON definition
function createComponent(component, formData) {
  const element = document.createElement('div');
  element.className = 'form-group mb-3';

  // Handle container-type components first
  switch (component.type) {
    case 'panel':
      element.className = 'panel mb-3';
      const panelBody = document.createElement('div');
      panelBody.className = 'card-body';
      
      if (component.title) {
        const header = document.createElement('h3');
        header.className = 'card-title h5';
        header.textContent = component.title;
        element.appendChild(header);
      }
      
      if (component.components) {
        component.components.forEach(comp => {
          panelBody.appendChild(createComponent(comp, formData));
        });
      }
      element.appendChild(panelBody);
      return element;

    case 'columns':
      element.className = 'row g-3';
      if (component.columns) {
        component.columns.forEach(column => {
          const col = document.createElement('div');
          col.className = `col-md-${12 / component.columns.length}`;
          if (column.components) {
            column.components.forEach(comp => {
              col.appendChild(createComponent(comp, formData));
            });
          }
          element.appendChild(col);
        });
      }
      return element;

    case 'fieldset':
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'border p-3 rounded mb-3';
      if (component.legend) {
        const legend = document.createElement('legend');
        legend.className = 'float-none w-auto px-2';
        legend.textContent = component.legend;
        fieldset.appendChild(legend);
      }
      if (component.components) {
        component.components.forEach(comp => {
          fieldset.appendChild(createComponent(comp, formData));
        });
      }
      return fieldset;

    case 'content':
      element.innerHTML = component.html || '';
      return element;
  }

  // Handle input components
  let input;
  let radioGroup;
  let label;

  // Existing input handling code...
  switch (component.type) {
    case 'textfield':
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      break;
  
    case 'textarea':
      input = document.createElement('textarea');
      input.className = 'form-control';
      input.rows = component.rows || 3;
      break;
      
    case 'select':
      input = document.createElement('select');
      input.className = 'form-control formio-component-select';
      if (component.data && component.data.values) {
        component.data.values.forEach(option => {
          const optionEl = document.createElement('option');
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          input.appendChild(optionEl);
        });
      }
      break;
      
    case 'checkbox':
      // Create a wrapper div that will hold both checkbox and label
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check';
      
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'form-check-input';
      
      // Create and style the label
      const checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'form-check-label text-dark';
      checkboxLabel.textContent = component.label;
      wrapper.className = 'form-check position-relative';

      console.log('Checkbox label:', checkboxLabel.textContent);
      
      // Add components to wrapper
      wrapper.appendChild(input);
      wrapper.appendChild(checkboxLabel);
      
      // Add the wrapper to the main element
      element.appendChild(wrapper);
      
      // ADD HERE - Put tooltip data on main element like other components
      element.setAttribute('data-component-info', JSON.stringify(component, null, 2));
      element.className = 'form-group mb-3 formio-component-checkbox';
      
      return element;
      
    case 'radio':
      radioGroup = document.createElement('div');
      if (component.values) {
        component.values.forEach(option => {
          const wrapper = document.createElement('div');
          wrapper.className = 'form-check';
          
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.className = 'form-check-input';
          radio.name = component.key;
          radio.value = option.value;
          
          const label = document.createElement('label');
          label.className = 'form-check-label';
          label.textContent = option.label;
          
          wrapper.appendChild(radio);
          wrapper.appendChild(label);
          radioGroup.appendChild(wrapper);
        });
      }
      input = radioGroup;
      break;
  
    case 'content':
      element.innerHTML = component.html || '';
      return element;
  
    case 'html':
      element.innerHTML = component.content || '';
      return element;
  
    case 'datetime':
      input = document.createElement('input');
      input.type = 'datetime-local';
      input.className = 'form-control';
      
      // Handle format options if provided
      if (component.format) {
        // Convert format to HTML5 datetime-local format
        input.step = component.enableTime ? '1' : '60'; // Include seconds if time enabled
      }
      
      // Set min/max dates if configured
      if (component.minDate) {
        input.min = component.minDate;
      }
      if (component.maxDate) {
        input.max = component.maxDate;
      }
      break;

    case 'time':
        input = document.createElement('input');
        input.type = 'time';
        input.className = 'form-control';
        
        if (component.format) {
          // Set step to include seconds if format specifies it
          input.step = component.format.includes('ss') ? '1' : '60';
        }
        
        // Handle min/max time if specified
        if (component.minTime) {
          input.min = component.minTime;
        }
        if (component.maxTime) {
          input.max = component.maxTime;
        }
        break;

    case 'number':
          input = document.createElement('input');
          input.type = 'number';
          input.className = 'form-control';
          
          // Handle number-specific attributes
          if (component.validate) {
            if (component.validate.min !== undefined) {
              input.min = component.validate.min;
            }
            if (component.validate.max !== undefined) {
              input.max = component.validate.max;
            }
            if (component.validate.step !== undefined) {
              input.step = component.validate.step;
            }
          }
          
          // Handle decimal places if specified
          if (component.decimalLimit) {
            input.step = `0.${'0'.repeat(component.decimalLimit - 1)}1`;
          }
          break;

    case 'signature':
            // Create wrapper div to maintain layout
            const signatureWrapper = document.createElement('div');
            signatureWrapper.className = 'signature-wrapper mt-2';
            
            // Create canvas element for the signature pad
            const canvas = document.createElement('canvas');
            canvas.className = 'signature-pad';
            canvas.style.border = '1px solid #dee2e6';
            canvas.style.borderRadius = '4px';
            canvas.style.backgroundColor = '#fff';
            canvas.width = component.width || 300;
            canvas.height = component.height || 150;
            
            // Add canvas to wrapper
            signatureWrapper.appendChild(canvas);
            
            // Create clear button
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'btn btn-sm btn-secondary mt-2';
            clearBtn.textContent = 'Clear Signature';
            signatureWrapper.appendChild(clearBtn);
          
            // Initialize signature pad after the canvas is in DOM
            requestAnimationFrame(() => {
              try {
                const signaturePad = new SignaturePad(canvas, {
                  backgroundColor: 'rgb(255, 255, 255)',
                  penColor: 'rgb(0, 0, 0)',
                  minWidth: 0.5,
                  maxWidth: 2.5
                });
          
                clearBtn.onclick = () => signaturePad.clear();
                
                signaturePad.onEnd = () => {
                  formData[component.key] = signaturePad.toDataURL();
                };
              } catch (err) {
                console.error('Failed to initialize signature pad:', err);
              }
            });
          
            input = signatureWrapper;
            break;

    case 'datagrid':
              // Create container for the datagrid
              const gridContainer = document.createElement('div');
              gridContainer.className = 'datagrid-container table-responsive';
              
              // Create table element
              const table = document.createElement('table');
              table.className = 'table table-bordered table-striped';
              
              // Create header
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              
              // Add headers from components
              if (component.components) {
                component.components.forEach(col => {
                  const th = document.createElement('th');
                  th.textContent = col.label || '';
                  headerRow.appendChild(th);
                });
              }
              thead.appendChild(headerRow);
              table.appendChild(thead);
              
              // Create body
              const tbody = document.createElement('tbody');
              
              // Add at least one row
              const row = document.createElement('tr');
              if (component.components) {
                component.components.forEach(col => {
                  const td = document.createElement('td');
                  td.appendChild(createComponent(col, formData));
                  row.appendChild(td);
                });
              }
              tbody.appendChild(row);
              table.appendChild(tbody);
              
              // Add button to add new rows
              const addButton = document.createElement('button');
              addButton.type = 'button';
              addButton.className = 'btn btn-sm btn-secondary mt-2';
              addButton.textContent = 'Add Row';
              addButton.onclick = () => {
                const newRow = row.cloneNode(true);
                tbody.appendChild(newRow);
              };
              
              gridContainer.appendChild(table);
              gridContainer.appendChild(addButton);
              
              return gridContainer;

    case 'button':
      input = document.createElement('button');
      input.type = component.action || 'button';
      input.className = `btn btn-${component.theme || 'primary'}`;
      input.textContent = component.label || 'Button';
      element.appendChild(input);
      break;

    case 'htmlelement':
      input = document.createElement(component.tag || 'div');
      if (component.className) {
        input.className = component.className;
      }
      if (component.attrs) {
        component.attrs.forEach(attr => {
          if (attr.attr && attr.value) {
            input.setAttribute(attr.attr, attr.value);
          }
        });
      }
      if (component.content) {
        input.innerHTML = component.content;
      }
      break;

    default:
      console.warn(`Unhandled component type: ${component.type}`);
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.placeholder = `Unhandled type: ${component.type}`;
      break;
  }

  if (component.type !== 'button' && component.type !== 'htmlelement') {
    label = document.createElement('label');
    label.textContent = component.label || '';
    label.htmlFor = component.key;
  
    if (component.type === 'checkbox') {
      element.appendChild(input);
      element.appendChild(label);
    } else {
      element.appendChild(label);
      element.appendChild(input);
    }
  }

  if (input !== radioGroup) {
    input.id = component.key || '';
    input.name = component.key || '';
    input.value = formData[component.key] || '';
    
    if (component.placeholder) {
      input.placeholder = component.placeholder;
    }
    
    if (component.required) {
      input.required = true;
    }
  }

  // Inside createComponent function, before returning element
  element.dataset.componentInfo = JSON.stringify({
    _elementType: component.type,
    ...Object.fromEntries(
      Object.entries(component)
        .filter(([key, value]) => {
          // Always include JavaScript code attributes
          if ((key === 'custom' || key === 'customConditional') && typeof value === 'string') {
            return true;
          }
          if (value === null || value === undefined || value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (typeof value === 'object' && !Array.isArray(value) && 
              Object.keys(value).length === 0) return false;
          return true;
        })
        .map(([key, value]) => {
          // Format JavaScript code with proper indentation and comments
          if ((key === 'custom' || key === 'customConditional') && typeof value === 'string') {
            return [key, `\n${value.trim()}\n`];
          }
          return [key, value];
        })
    )
  }, (key, value) => {
    if (typeof value === 'function') return '[Function]';
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const filtered = Object.fromEntries(
        Object.entries(value).filter(([_, v]) => 
          v !== null && v !== undefined && v !== '' && v !== false
        )
      );
      return Object.keys(filtered).length === 0 ? undefined : filtered;
    }
    return value;
  }, 2).replace(/\\n/g, '\n').replace(/\\r/g, '\r');

  // Add mousemove event listener to update tooltip position
  element.addEventListener('mousemove', (e) => {
    element.style.setProperty('--tooltip-x', `${e.clientX + 10}px`);
    element.style.setProperty('--tooltip-y', `${e.clientY + 10}px`);
  });

  return element;
}

// Renders the Form.io form based on the JSON definition
function reevaluateConditionals(form, formData) {
  const components = form.querySelectorAll('[data-conditional]');
  components.forEach((component) => {
      const condition = component.getAttribute('data-conditional');
      const isVisible = new Function('data', `return ${condition};`)(formData);
      component.style.display = isVisible ? '' : 'none';
  });
}

// Evaluates the client-side script provided in the Form.io JSON
function evalFormScript(formioTemplate) {
  try {
      const script = new Function('form', formioTemplate.ClientSideScript);
      script(document.querySelector('.formio-form'));
  } catch (error) {
      console.error('Error evaluating client-side script:', error);
  }
}

// Renders the Form.io form based on the JSON definition
function renderFormio(formioTemplate) {
  const container = document.getElementById('formio-rendered');
  container.innerHTML = '';

  // Parse the template if it's a string
  const formDefinition = typeof formioTemplate === 'string' ? 
    JSON.parse(formioTemplate) : formioTemplate;

  // Track hidden components
  let hiddenCount = 0;

  // Modify form definition to unhide fields
  const unhideFields = (components) => {
    return components.map(comp => {
      // Log hidden components
      if (comp.hidden || comp.conditional || comp.customConditional) {
        hiddenCount++;
        console.log('Found hidden component:', {
          key: comp.key,
          type: comp.type,
          hidden: comp.hidden,
          hasConditional: !!comp.conditional,
          hasCustomConditional: !!comp.customConditional
        });
      }

      // Create new component with visibility props removed
      const newComp = {
        ...comp,
        hidden: false,          // Force show
        conditional: null,      // Remove conditional
        customConditional: '',  // Remove custom conditional
        logic: [],             // Remove logic rules
        calculatedValue: '',    // Remove calculated values
        validateOn: 'change'    // Default validation
      };

      // Process nested components
      if (newComp.components) {
        newComp.components = unhideFields(newComp.components);
      }
      if (newComp.columns) {
        newComp.columns = newComp.columns.map(col => ({
          ...col,
          components: col.components ? unhideFields(col.components) : []
        }));
      }
      return newComp;
    });
  };

  // Create deep copy and modify
  const debugDefinition = JSON.parse(JSON.stringify(formDefinition));
  if (debugDefinition.components) {
    debugDefinition.components = unhideFields(debugDefinition.components);
    console.log(`Found ${hiddenCount} hidden components total`);
  }

  const options = {
    sanitize: true,
    noAlerts: false,
    readOnly: false,
    hooks: {
      addComponent: (component) => {
        const originalComponent = formDefinition.components?.find(c => 
          c.key === component.component.key);
        if (originalComponent?.hidden || originalComponent?.conditional || 
            originalComponent?.customConditional) {
          component.element.classList.add('debug-hidden-field');
        }
      }
    },
    // Force show all fields
    evalContext: {
      show: true,
      component: {
        hidden: false
      }
    }
  };

  // Add debug styling 
  const style = document.createElement('style');
  style.textContent = `
    .debug-hidden-field {
      border: 1px dashed #ff6b6b !important;
      background-color: rgba(255, 107, 107, 0.05) !important;
      position: relative;
    }
    .debug-hidden-field::before {
      content: "Hidden Field";
      position: absolute;
      top: -20px;
      right: 0;
      font-size: 12px;
      color: #ff6b6b;
      background: white;
      padding: 2px 5px;
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);
  // Check if Form.io is loaded
  if (typeof Formio === 'undefined') {
    console.error('Form.io library not loaded');
    container.innerHTML = `
      <div class="alert alert-danger">
        Error: Form.io library is not loaded. Please check your internet connection and try again.
      </div>`;
    return;
  }

  // Create the form using modified definition
  Formio.createForm(container, debugDefinition, options)
    .then(form => {
      form.on('change', () => {
        console.log('Form data:', form.data);
      });
    })
    .catch(err => {
      console.error('Error creating form:', err);
      container.innerHTML = `
        <div class="alert alert-danger">
          Error loading form: ${err.message}
        </div>`;
    });
}

window.renderFormio = renderFormio;