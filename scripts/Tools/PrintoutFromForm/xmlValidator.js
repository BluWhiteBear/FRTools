export class XMLValidator 
{
    // ? Validates Ref numbers are sequential starting from 0  
    static validateRefNumbers(node, currentRef = 0, parentContext = '')
    {
        let issues = [];
        
        // ? Check if this node has a Ref attribute
        if (node.attributes?.Ref) 
        {
            const refNum = parseInt(node.attributes.Ref);
            if (isNaN(refNum))
            {
                const issue = `${parentContext}Invalid Ref number format: ${node.attributes.Ref}`;
                issues.push(issue);
                //console.warn('[validateRefNumbers] Issue detected:', issue);
            } 
            else if (refNum !== currentRef) 
            {
                const issue = `${parentContext}Non-sequential Ref number detected: ${refNum} in ${node.type} "${node.attributes.Name || 'unnamed'}" (expected ${currentRef})`;
                issues.push(issue);
                //console.warn('[validateRefNumbers] Issue detected:', issue);
            }

            currentRef = refNum + 1;
        }

        // ? Process all children recursively, maintaining the currentRef count
        if (node.children && node.children.length > 0)
        {
            const newContext = parentContext + (node.type ? node.type + ' > ' : '');

            node.children.forEach(child => {
                const childIssues = this.validateRefNumbers(child, currentRef, newContext);
                if (childIssues.issues.length > 0)
                {
                    issues = issues.concat(childIssues.issues);
                }

                currentRef = childIssues.nextRef;
            });
        }

        return { issues, nextRef: currentRef };
    }

    // ? Validates sequential Item numbers in containers
    static validateSequentialItemNumbers(node, parentContext = '') 
    {
        let issues = [];
        let sequenceBreakFound = false;
        let lastReportedNum = 0;

        // Process children within their own context
        if (node.children && node.children.length > 0) {
            const newContext = parentContext + (node.type ? node.type + ' > ' : '');
            
            // First, collect all Item nodes at this level
            const itemNodes = node.children
                .filter(child => child.type?.startsWith('Item'))
                .map(child => ({
                    num: parseInt(child.type.replace('Item', '')),
                    type: child.attributes?.ControlType || 'unknown',
                    name: child.attributes?.Name || 'unnamed',
                    original: child
                }))
                .filter(info => !isNaN(info.num))
                .sort((a, b) => a.num - b.num);

            if (itemNodes.length > 0) {
                let expectedNum = itemNodes[0].num;
                
                itemNodes.forEach(item => {
                    if (item.num !== expectedNum) {
                        if (!sequenceBreakFound) {
                            // First sequence break at this level
                            issues.push(`${newContext}First sequence break: Item${item.num} (${item.type} "${item.name}") - Expected Item${expectedNum}`);
                            sequenceBreakFound = true;
                            lastReportedNum = item.num;
                        } else if (Math.abs(item.num - lastReportedNum) > 1) {
                            // Report large gaps in sequence
                            issues.push(`${newContext}Large sequence gap: Item${item.num} (${item.type} "${item.name}") - Previous reported was Item${lastReportedNum}`);
                            lastReportedNum = item.num;
                        }
                    }
                    expectedNum = item.num + 1;

                    // Recursively validate this item's children
                    const childIssues = this.validateSequentialItemNumbers(item.original, newContext);
                    issues = issues.concat(childIssues);
                });
            }

            // Process non-Item children recursively
            node.children
                .filter(child => !child.type?.startsWith('Item'))
                .forEach(child => {
                    const childIssues = this.validateSequentialItemNumbers(child, newContext);
                    issues = issues.concat(childIssues);
                });
        }

        return issues;
    }

    // ? Validates items within specific container types for sequential numbering
    static validateContainerItems(node, parentContext = '') 
    {
        let issues = [];
        const containers = ['Controls', 'Rows', 'Cells', 'ExpressionBindings'];
        
        // ? Check if this is a container that should have sequential items
        if (containers.includes(node.type))
        {
            let itemNums = [];
            let itemDetails = []; // ? Store both number and original node info

            node.children.forEach(child => {
                if (child.type?.startsWith('Item')) 
                {
                    const itemNum = parseInt(child.type.replace('Item', ''));
                    if (!isNaN(itemNum))
                    {
                        itemNums.push(itemNum);
                        itemDetails.push({
                            num: itemNum,
                            name: child.attributes?.Name || 'unnamed',
                            type: child.attributes?.ControlType || 'unknown'
                        });
                    }
                }
            });

            // ! EARLY EXIT
            // ? No items to validate
            if (itemNums.length === 0) return issues;

            // ? Sort both arrays together to maintain the relationship
            const zipped = itemDetails.map((detail, i) => ({ detail, originalIndex: i }));
            zipped.sort((a, b) => a.detail.num - b.detail.num);
            itemDetails = zipped.map(z => z.detail);
            itemNums = itemDetails.map(d => d.num);

            let expectedNum = 1;
            let sequenceBreakFound = false;
            let lastReportedNum = 0;

            for (let i = 0; i < itemNums.length; i++) 
            {
                const currentNum = itemNums[i];
                const details = itemDetails[i];
                
                // ? Calculate the deviation from expected sequence
                const deviation = currentNum - expectedNum;

                // ? Report issues based on specific conditions
                if (deviation !== 0)
                {
                    if (!sequenceBreakFound)
                    {
                        // ? First sequence break - always report it
                        issues.push(`${parentContext}${node.type}: First sequence break at Item${currentNum} (${details.type} "${details.name}") - Expected Item${expectedNum}`);
                        sequenceBreakFound = true;
                        lastReportedNum = currentNum;
                    } 
                    else if (Math.abs(currentNum - lastReportedNum) > 1)
                    {
                        // ? Report additional issues only if there's a gap larger than 1. This indicates that ANOTHER sequence break has occurred.
                        issues.push(`${parentContext}${node.type}: Large sequence gap at Item${currentNum} (${details.type} "${details.name}") - Previous reported was Item${lastReportedNum}`);
                        lastReportedNum = currentNum;
                    }
                }

                expectedNum = currentNum + 1;
            }
        }

        // ? Recursively validate children
        if (node.children && node.children.length > 0)
        {
            const newContext = parentContext + (node.type ? node.type + ' > ' : '');
            node.children.forEach(child => {
                const childIssues = this.validateContainerItems(child, newContext);
                issues = issues.concat(childIssues);
            });
        }

        return issues;
    }

    // ? Validates all aspects: sequential items, container items, and Ref numbers
    static validateAll(rootNode) 
    {
        const sequentialIssues = this.validateSequentialItemNumbers(rootNode);
        const containerIssues = this.validateContainerItems(rootNode);
        const refValidation = this.validateRefNumbers(rootNode);
        
        return {
            sequentialIssues,
            containerIssues,
            refIssues: refValidation.issues,
            hasIssues: sequentialIssues.length > 0 || containerIssues.length > 0 || refValidation.issues.length > 0
        };
    }

    // ? Repairs Ref numbers to be sequential starting from 0
    static repairRefNumbers(xmlString) {
        if (typeof xmlString !== 'string') {
            throw new TypeError('Expected xmlString to be a string, but received ' + typeof xmlString);
        }

        let currentRef = 0;

        // Replace all Ref="" attributes with sequential numbers, including nested references
        const updatedXml = xmlString.replace(/Ref="(\d*)"/g, (match, p1, offset, string) => {
            // Ensure ReportSource Ref attributes are also updated
            if (string.slice(offset - 12, offset).includes('ReportSource')) {
                return `Ref="${currentRef++}"`;
            }
            return `Ref="${currentRef++}"`;
        });

        return updatedXml; // Return the updated XML string
    }

    // ? Repairs item numbers within containers to be sequential starting from 1
    static repairItemNumbers(node) 
    {
        const containers = ['Controls', 'Rows', 'Cells', 'ExpressionBindings'];
        let changes = [];

        // ? If this is a container that should have sequential items
        if (containers.includes(node.type))
        {
            let itemNodes = node.children
                .filter(child => child.type?.startsWith('Item'))
                .map(child => ({
                    node: child,
                    num: parseInt(child.type.replace('Item', '')),
                    name: child.attributes?.Name || 'unnamed',
                    type: child.attributes?.ControlType || 'unknown'
                }))
                .filter(info => !isNaN(info.num))
                .sort((a, b) => a.num - b.num);

            // ? Resequence the items
            let currentNum = 1;
            itemNodes.forEach(item => {
                const oldType = item.node.type;
                const newType = `Item${currentNum}`;
                if (oldType !== newType) {
                    changes.push({
                        context: node.type,
                        oldValue: oldType,
                        newValue: newType,
                        itemName: item.name,
                        itemType: item.type
                    });
                    item.node.type = newType;
                }
                currentNum++;
            });
        }

        // Recursively repair children
        if (node.children && node.children.length > 0)
        {
            node.children.forEach(child => {
                const childChanges = this.repairItemNumbers(child);
                changes = changes.concat(childChanges);
            });
        }

        return changes;
    }

    // ? Validates and attempts to repair the XML structure
    static validateAndRepair(rootNode) 
    {
        // ? First validate to see if repairs are needed
        const validation = this.validateAll(rootNode);

        console.log('Initial Validation:', validation);
        
        // ? If issues are found, attempt repairs
        if (validation.hasIssues)
        {
            // Handle plain objects by converting them to XML strings
            let xmlString;
            if (rootNode instanceof Node) {
                xmlString = new XMLSerializer().serializeToString(rootNode);
            } else if (typeof rootNode === 'object') {
                xmlString = JSON.stringify(rootNode); // Convert object to string representation
            } else {
                throw new TypeError('Expected rootNode to be a Node or object, but received ' + typeof rootNode);
            }

            const refChanges = this.repairRefNumbers(xmlString);
            const itemChanges = this.repairItemNumbers(rootNode);
            
            // ? Validate again after repairs
            const postRepairValidation = this.validateAll(rootNode);

            // ? Compare original and remaining issues to determine which ones were fixed
            const fixedIssues = {
                sequential: validation.sequentialIssues.filter(issue => 
                    !postRepairValidation.sequentialIssues.includes(issue)
                ),
                container: validation.containerIssues.filter(issue => 
                    !postRepairValidation.containerIssues.includes(issue)
                ),
                ref: validation.refIssues.filter(issue => 
                    !postRepairValidation.refIssues.includes(issue)
                )
            };

            console.warn('[validateAndRepair] Fixed Ref Issues:', fixedIssues.ref);
            
            return {
                originalIssues: validation,
                changes: { refChanges, itemChanges },
                remainingIssues: postRepairValidation,
                fixedIssues: fixedIssues,
                success: !postRepairValidation.hasIssues
            };
        }

        // ? If no issues were found, return the original validation results
        return {
            originalIssues: validation,
            changes: [],
            remainingIssues: validation,
            fixedIssues: { sequential: [], container: [], ref: [] },
            success: true
        };
    }
}