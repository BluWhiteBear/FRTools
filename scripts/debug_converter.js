// Debug script to test DevExpress conversion directly

// Import the modules
import {
  DevExpressConverter,
  Utils,
  generateMinimalXmlTemplate
} from './tool_printoutFromForm.js';

// Sample test form
const testForm = {
  "Name": "TestForm",
  "FormName": "Test Form",
  "DepartmentName": "Testing",
  "FormDefinitionGuid": "6b09ed03-d451-413d-9233-1ed50511c07d",
  "DeparmentGuid": "2eef945d-a03d-4275-9e4f-5ac9dcd3df23",
  "FormioTemplate": {
    "Grid": {},
    "components": [
      {
        "label": "Test Field 1",
        "key": "testField1",
        "type": "textfield",
        "input": true
      },
      {
        "label": "Test Textarea",
        "key": "testTextarea",
        "type": "textarea",
        "input": true,
        "rows": 3
      },
      {
        "label": "Test Number",
        "key": "testNumber",
        "type": "number",
        "input": true,
        "decimalLimit": 2
      }
    ]
  }
};

// Test function
function testConverter() {
  console.log("Starting conversion test...");

  // Initialize state
  DevExpressConverter.state = {
    devExpressJson: null,
    itemCounter: 1,
    refCounter: 1
  };

  try {
    // Generate XML template directly
    const xmlTemplateFunc = generateMinimalXmlTemplate();
    const directXmlTemplate = xmlTemplateFunc(testForm);
    console.log("Direct XML template length:", directXmlTemplate.length);
    console.log("XML preview:", directXmlTemplate.substring(0, 200) + "...");

    // Generate full DevExpress report
    const devExpressJson = DevExpressConverter.transformToDevExpress(testForm);
    console.log("DevExpress JSON result:", devExpressJson ? "Success" : "Failed");
    
    if (devExpressJson && devExpressJson[0] && devExpressJson[0].ReportTemplate) {
      const base64Template = devExpressJson[0].ReportTemplate;
      console.log("Template base64 length:", base64Template.length);
      
      try {
        // Decode the template
        const decodedTemplate = Utils.decodeReportTemplate(base64Template);
        console.log("Template decoded:", decodedTemplate ? "Success" : "Failed");
        
        if (decodedTemplate && decodedTemplate.content) {
          // Look for our test fields
          console.log("Looking for fields in decoded template...");
          const testField1Present = decodedTemplate.content.includes("testField1");
          const testTextareaPresent = decodedTemplate.content.includes("testTextarea");
          const testNumberPresent = decodedTemplate.content.includes("testNumber");
          
          console.log("Fields found:", {
            testField1: testField1Present,
            testTextarea: testTextareaPresent,
            testNumber: testNumberPresent
          });
        }
      } catch (error) {
        console.error("Error decoding template:", error);
      }
    }
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Run the test
testConverter();
