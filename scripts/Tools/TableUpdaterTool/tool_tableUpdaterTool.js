const editorBindings = [
    { textareaId: 'targetSql1', highlightId: 'targetSql1Highlight' },
    { textareaId: 'targetSql2', highlightId: 'targetSql2Highlight' },
    { textareaId: 'syncOutput', highlightId: 'syncOutputHighlight' }
];

let sharedInputScrollSync = null;
let pendingInputDiffFrame = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generateBtn')?.addEventListener('click', generateSyncSql);
    document.getElementById('copyBtn')?.addEventListener('click', copyOutput);
    setupSyntaxEditors();
    setupSharedInputScrollbar();
    refreshInputDiffHighlights();
    hideAlert();
});

function setupSyntaxEditors() {
    editorBindings.forEach(({ textareaId, highlightId }) => {
        const textarea = document.getElementById(textareaId);
        const highlight = document.getElementById(highlightId);
        if (!textarea || !highlight) return;

        const update = () => {
            if (textareaId === 'targetSql1' || textareaId === 'targetSql2') {
                scheduleInputDiffRefresh();
                return;
            }

            renderHighlight(textarea, highlight);
        };
        let scrollRafId = null;
        const syncScroll = () => {
            if (scrollRafId !== null) return;

            scrollRafId = window.requestAnimationFrame(() => {
                syncHighlightScroll(textarea.id);
                if (sharedInputScrollSync) {
                    sharedInputScrollSync.handleTextareaScroll(textarea.id, textarea.scrollTop);
                }
                scrollRafId = null;
            });
        };

        textarea.addEventListener('input', update);
        textarea.addEventListener('scroll', syncScroll);

        if (textareaId !== 'targetSql1' && textareaId !== 'targetSql2') {
            update();
        }
        syncScroll();
    });
}

function scheduleInputDiffRefresh() {
    if (pendingInputDiffFrame !== null) return;

    pendingInputDiffFrame = window.requestAnimationFrame(() => {
        refreshInputDiffHighlights();
        pendingInputDiffFrame = null;
    });
}

function refreshInputDiffHighlights() {
    const textarea1 = document.getElementById('targetSql1');
    const textarea2 = document.getElementById('targetSql2');
    const highlight1 = document.getElementById('targetSql1Highlight');
    const highlight2 = document.getElementById('targetSql2Highlight');

    if (!textarea1 || !textarea2 || !highlight1 || !highlight2) return;

    const { leftChanged, rightChanged } = computeLineDiffSets(textarea1.value || '', textarea2.value || '');

    renderHighlight(textarea1, highlight1, { diffLines: leftChanged, diffClass: 'diff-line-left' });
    renderHighlight(textarea2, highlight2, { diffLines: rightChanged, diffClass: 'diff-line-right' });

    syncHighlightScroll('targetSql1');
    syncHighlightScroll('targetSql2');

    if (sharedInputScrollSync) {
        sharedInputScrollSync.refreshMetrics();
    }
}

function setupSharedInputScrollbar() {
    const textarea1 = document.getElementById('targetSql1');
    const textarea2 = document.getElementById('targetSql2');
    const sharedScrollbar = document.getElementById('sharedInputScrollbar');
    const spacer = document.getElementById('sharedInputScrollbarSpacer');

    if (!textarea1 || !textarea2 || !sharedScrollbar || !spacer) {
        return;
    }

    let isSyncing = false;

    const applyScrollTopToInputs = (scrollTop) => {
        textarea1.scrollTop = scrollTop;
        textarea2.scrollTop = scrollTop;
        syncHighlightScroll('targetSql1');
        syncHighlightScroll('targetSql2');
    };

    const refreshMetrics = () => {
        const maxScrollable = Math.max(
            textarea1.scrollHeight - textarea1.clientHeight,
            textarea2.scrollHeight - textarea2.clientHeight,
            0
        );
        const viewport = Math.max(textarea1.clientHeight, textarea2.clientHeight, 1);
        spacer.style.height = `${Math.max(maxScrollable + viewport, 1)}px`;

        if (sharedScrollbar.scrollTop > maxScrollable) {
            sharedScrollbar.scrollTop = maxScrollable;
        }
    };

    sharedScrollbar.addEventListener('scroll', () => {
        if (isSyncing) return;
        isSyncing = true;
        applyScrollTopToInputs(sharedScrollbar.scrollTop);
        isSyncing = false;
    });

    const handleTextareaScroll = (textareaId, scrollTop) => {
        if ((textareaId !== 'targetSql1' && textareaId !== 'targetSql2') || isSyncing) {
            return;
        }

        isSyncing = true;
        const sibling = textareaId === 'targetSql1' ? textarea2 : textarea1;
        sibling.scrollTop = scrollTop;
        syncHighlightScroll(sibling.id);
        sharedScrollbar.scrollTop = scrollTop;
        isSyncing = false;
    };

    textarea1.addEventListener('input', refreshMetrics);
    textarea2.addEventListener('input', refreshMetrics);
    window.addEventListener('resize', refreshMetrics);

    sharedInputScrollSync = {
        handleTextareaScroll,
        refreshMetrics
    };

    refreshMetrics();
    sharedScrollbar.scrollTop = Math.max(textarea1.scrollTop, textarea2.scrollTop, 0);
}

function renderHighlight(textarea, highlight, options = {}) {
    const value = textarea.value || '';
    const normalized = value.endsWith('\n') ? value : `${value}\n`;
    const diffLines = options.diffLines || null;
    const diffClass = options.diffClass || '';

    const sourceLines = normalized.split('\n');
    sourceLines.pop();

    const renderedLines = sourceLines.map((line, index) => {
        let renderedLine;

        if (typeof Prism !== 'undefined' && Prism.languages?.sql) {
            renderedLine = Prism.highlight(line || ' ', Prism.languages.sql, 'sql');
        } else {
            renderedLine = escapeHtml(line || ' ');
        }

        const classes = ['sql-line'];
        if (diffLines && diffLines.has(index)) {
            classes.push(diffClass || 'diff-line');
        }

        return `<span class="${classes.join(' ')}">${renderedLine}</span>`;
    });

    // Lines are already block elements; joining with newlines can add phantom visual rows in <pre>.
    highlight.innerHTML = renderedLines.join('');
}

function refreshEditorHighlight(textareaId) {
    if (textareaId === 'targetSql1' || textareaId === 'targetSql2') {
        refreshInputDiffHighlights();
        return;
    }

    const binding = editorBindings.find(b => b.textareaId === textareaId);
    if (!binding) return;

    const textarea = document.getElementById(binding.textareaId);
    const highlight = document.getElementById(binding.highlightId);
    if (!textarea || !highlight) return;

    renderHighlight(textarea, highlight);
    syncHighlightScroll(textareaId);

    if (sharedInputScrollSync && (textareaId === 'targetSql1' || textareaId === 'targetSql2')) {
        sharedInputScrollSync.refreshMetrics();
    }
}

function computeLineDiffSets(leftText, rightText) {
    const leftLines = splitLines(leftText);
    const rightLines = splitLines(rightText);

    const leftChanged = new Set();
    const rightChanged = new Set();

    if (leftLines.length === 0 && rightLines.length === 0) {
        return { leftChanged, rightChanged };
    }

    const sizeLimit = 160000;
    if (leftLines.length * rightLines.length > sizeLimit) {
        const maxLength = Math.max(leftLines.length, rightLines.length);
        for (let i = 0; i < maxLength; i++) {
            const left = leftLines[i];
            const right = rightLines[i];
            if (left !== right) {
                if (i < leftLines.length) leftChanged.add(i);
                if (i < rightLines.length) rightChanged.add(i);
            }
        }
        return { leftChanged, rightChanged };
    }

    const lcs = buildLcsTable(leftLines, rightLines);
    const matches = [];
    let i = 0;
    let j = 0;

    while (i < leftLines.length && j < rightLines.length) {
        if (leftLines[i] === rightLines[j]) {
            matches.push([i, j]);
            i++;
            j++;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }

    let leftPtr = 0;
    let rightPtr = 0;

    matches.forEach(([matchLeft, matchRight]) => {
        while (leftPtr < matchLeft) {
            leftChanged.add(leftPtr);
            leftPtr++;
        }

        while (rightPtr < matchRight) {
            rightChanged.add(rightPtr);
            rightPtr++;
        }

        leftPtr = matchLeft + 1;
        rightPtr = matchRight + 1;
    });

    while (leftPtr < leftLines.length) {
        leftChanged.add(leftPtr);
        leftPtr++;
    }

    while (rightPtr < rightLines.length) {
        rightChanged.add(rightPtr);
        rightPtr++;
    }

    return { leftChanged, rightChanged };
}

function buildLcsTable(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    const table = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            if (leftLines[i] === rightLines[j]) {
                table[i][j] = table[i + 1][j + 1] + 1;
            } else {
                table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
            }
        }
    }

    return table;
}

function splitLines(text) {
    return (text || '').replace(/\r\n/g, '\n').split('\n');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function syncHighlightScroll(textareaId) {
    const binding = editorBindings.find(b => b.textareaId === textareaId);
    if (!binding) return;

    const textarea = document.getElementById(binding.textareaId);
    const highlight = document.getElementById(binding.highlightId);
    if (!textarea || !highlight) return;

    const pre = highlight.parentElement;
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alertContent = alertContainer?.querySelector('.alert-content');
    if (!alertContainer || !alertContent) return;

    alertContainer.className = `alert alert-${type} mb-4`;
    alertContent.textContent = message;
    alertContainer.style.display = 'block';
}

function hideAlert() {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        alertContainer.style.display = 'none';
    }
}

function stripComments(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '');
}

function splitTopLevelByComma(input) {
    const parts = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);

        if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

function findMatchingParen(text, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        const ch = text[i];
        if (ch === '(') depth++;
        if (ch === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function unwrapIdentifier(identifier) {
    const id = (identifier || '').trim();

    if (!id) return id;
    if (id.startsWith('[') && id.endsWith(']')) return id.slice(1, -1);
    if (id.startsWith('"') && id.endsWith('"')) return id.slice(1, -1);
    if (id.startsWith('`') && id.endsWith('`')) return id.slice(1, -1);
    return id;
}

function canonicalIdentifier(identifier) {
    return unwrapIdentifier(identifier)
        .replace(/\s+/g, '')
        .toLowerCase();
}

function canonicalType(type) {
    return (type || '')
        .replace(/[\[\]]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
}

function normalizeType(type) {
    return (type || '')
        .replace(/\s+/g, ' ')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .trim();
}

function extractTypeAndNullability(definitionRemainder) {
    const remainder = (definitionRemainder || '').trim();
    const stopMatch = remainder.match(/\s+(NOT\s+NULL|NULL|CONSTRAINT|PRIMARY|UNIQUE|CHECK|DEFAULT|REFERENCES|COLLATE)\b/i);
    const typePart = normalizeType(stopMatch ? remainder.slice(0, stopMatch.index) : remainder);

    let nullable = null;
    if (/\bNOT\s+NULL\b/i.test(remainder)) {
        nullable = false;
    } else if (/\bNULL\b/i.test(remainder)) {
        nullable = true;
    }

    return { type: typePart, nullable };
}

function parseColumnDefinitions(definitionsText) {
    const columns = new Map();
    const lines = splitTopLevelByComma(definitionsText);
    let columnOrdinal = 0;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|INDEX)\b/i.test(trimmed)) {
            return;
        }

        const colMatch = trimmed.match(/^\s*(\[[^\]]+\]|"[^"]+"|`[^`]+`|[A-Za-z_][\w$#@]*)\s+([\s\S]+)$/);
        if (!colMatch) return;

        const originalName = unwrapIdentifier(colMatch[1]);
        const key = canonicalIdentifier(originalName);
        const parsed = extractTypeAndNullability(colMatch[2]);

        if (!parsed.type) return;

        columns.set(key, {
            name: originalName,
            type: parsed.type,
            nullable: parsed.nullable,
            ordinal: columnOrdinal
        });

        columnOrdinal++;
    });

    return columns;
}

function parseCreateTableSchema(sqlText) {
    const cleaned = stripComments(sqlText);
    const createMatch = /create\s+(?:or\s+alter\s+)?table\s+/i.exec(cleaned);
    if (!createMatch) return null;

    const start = createMatch.index + createMatch[0].length;
    const rest = cleaned.slice(start);
    const nameMatch = rest.match(/^\s*([^\r\n(]+)/);
    if (!nameMatch) {
        throw new Error('Could not parse table name from CREATE TABLE statement.');
    }

    const rawTableName = nameMatch[1].trim();
    const openParenIndex = cleaned.indexOf('(', start + nameMatch[0].length - 1);
    if (openParenIndex === -1) {
        throw new Error(`Could not find opening parenthesis for table ${rawTableName}.`);
    }

    const closeParenIndex = findMatchingParen(cleaned, openParenIndex);
    if (closeParenIndex === -1) {
        throw new Error(`Could not find matching closing parenthesis for table ${rawTableName}.`);
    }

    const body = cleaned.slice(openParenIndex + 1, closeParenIndex);
    return {
        tableName: rawTableName,
        columns: parseColumnDefinitions(body),
        source: 'create'
    };
}

function parseAlterTableAdds(sqlText) {
    const cleaned = stripComments(sqlText);
    const alterRegex = /alter\s+table\s+([^\r\n]+?)\s+add\s+/ig;

    let match;
    let tableName = null;
    const columns = new Map();

    while ((match = alterRegex.exec(cleaned)) !== null) {
        tableName = tableName || match[1].trim();

        const start = alterRegex.lastIndex;
        const nextStatement = cleaned.indexOf(';', start);
        const end = nextStatement === -1 ? cleaned.length : nextStatement;
        const definitionChunk = cleaned.slice(start, end).trim();
        const parsed = parseColumnDefinitions(definitionChunk);

        parsed.forEach((value, key) => {
            columns.set(key, value);
        });
    }

    if (!tableName || columns.size === 0) {
        return null;
    }

    return {
        tableName,
        columns,
        source: 'alter-add-only'
    };
}

function parseSchema(sqlText) {
    const createSchema = parseCreateTableSchema(sqlText);
    if (createSchema) return createSchema;

    const alterSchema = parseAlterTableAdds(sqlText);
    if (alterSchema) return alterSchema;

    throw new Error('No supported CREATE TABLE or ALTER TABLE ... ADD statement was found.');
}

function toBracketedName(name) {
    const escaped = String(name).replace(/]/g, ']]');
    return `[${escaped}]`;
}

function formatColumnDefinition(column) {
    const nullPart = column.nullable === false ? 'NOT NULL' : 'NULL';
    return `${toBracketedName(column.name)} ${column.type} ${nullPart}`;
}

function toSqlStringLiteral(value) {
    return String(value).replace(/'/g, "''");
}

function splitMultipartIdentifier(identifier) {
    const text = String(identifier || '').trim();
    if (!text) return [];

    const parts = [];
    let current = '';
    let bracketDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === '[') bracketDepth++;
        if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (ch === '.' && bracketDepth === 0) {
            if (current.trim()) parts.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

function resolveTableSchemaAndName(tableName) {
    const parts = splitMultipartIdentifier(tableName);

    if (parts.length >= 2) {
        return {
            schema: unwrapIdentifier(parts[parts.length - 2]),
            table: unwrapIdentifier(parts[parts.length - 1]),
            schemaAssumed: false
        };
    }

    return {
        schema: 'dbo',
        table: unwrapIdentifier(parts[0] || tableName),
        schemaAssumed: true
    };
}

function buildSpRenameColumnTarget(tableName, columnName) {
    const resolved = resolveTableSchemaAndName(tableName);
    return {
        target: `${toBracketedName(resolved.schema)}.${toBracketedName(resolved.table)}.${toBracketedName(columnName)}`,
        schemaAssumed: resolved.schemaAssumed,
        schema: resolved.schema,
        table: resolved.table
    };
}

function isNullableCompatible(leftNullable, rightNullable) {
    if (leftNullable === null || rightNullable === null) {
        return true;
    }

    return leftNullable === rightNullable;
}

function detectPotentialRenamePairs(removedColumns, addedColumns) {
    const removedEntries = Array.from(removedColumns.entries());
    const addedEntries = Array.from(addedColumns.entries());

    if (removedEntries.length === 0 || addedEntries.length === 0) {
        return [];
    }

    const leftCandidates = new Map();
    const rightMatchCounts = new Map();

    removedEntries.forEach(([leftKey, leftColumn]) => {
        const candidates = [];

        addedEntries.forEach(([rightKey, rightColumn]) => {
            const typeMatches = canonicalType(leftColumn.type) === canonicalType(rightColumn.type);
            const nullableMatches = isNullableCompatible(leftColumn.nullable, rightColumn.nullable);
            const orderMatches =
                Number.isInteger(leftColumn.ordinal) &&
                Number.isInteger(rightColumn.ordinal) &&
                leftColumn.ordinal === rightColumn.ordinal;

            if (typeMatches && nullableMatches && orderMatches) {
                candidates.push(rightKey);
                rightMatchCounts.set(rightKey, (rightMatchCounts.get(rightKey) || 0) + 1);
            }
        });

        leftCandidates.set(leftKey, candidates);
    });

    const pairs = [];
    removedEntries.forEach(([leftKey, leftColumn]) => {
        const candidates = leftCandidates.get(leftKey) || [];
        if (candidates.length !== 1) return;

        const rightKey = candidates[0];
        if ((rightMatchCounts.get(rightKey) || 0) !== 1) return;

        const rightColumn = addedColumns.get(rightKey);
        if (!rightColumn) return;

        pairs.push({
            fromKey: leftKey,
            toKey: rightKey,
            fromColumn: leftColumn,
            toColumn: rightColumn
        });
    });

    return pairs;
}

function confirmColumnRename(tableName, fromColumn, toColumn) {
    const fromOrder = Number.isInteger(fromColumn?.ordinal) ? fromColumn.ordinal + 1 : '?';
    const toOrder = Number.isInteger(toColumn?.ordinal) ? toColumn.ordinal + 1 : '?';

    const message = [
        'Potential column rename detected.',
        `Table: ${tableName}`,
        `From: ${fromColumn?.name || '(unknown)'} (column order ${fromOrder})`,
        `To: ${toColumn?.name || '(unknown)'} (column order ${toOrder})`,
        '',
        'Treat this as a rename (sp_rename) instead of drop/add?'
    ].join('\n');

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return window.confirm(message);
    }

    return false;
}

function generateSyncSql() {
    try {
        hideAlert();

        const sourceSql = document.getElementById('targetSql1').value;
        const targetSql = document.getElementById('targetSql2').value;
        const output = document.getElementById('syncOutput');

        if (!sourceSql.trim() || !targetSql.trim()) {
            showAlert('Please provide SQL for both Source Table and Target Table.', 'warning');
            output.value = '';
            refreshEditorHighlight('syncOutput');
            return;
        }

        const sourceSchema = parseSchema(sourceSql);
        const targetSchema = parseSchema(targetSql);

        const tableName = (targetSchema.tableName || sourceSchema.tableName || '').trim();
        if (!tableName) {
            throw new Error('Unable to determine target table name.');
        }

        const statements = [];
        const warnings = [];

        if (
            sourceSchema.tableName &&
            targetSchema.tableName &&
            canonicalIdentifier(sourceSchema.tableName) !== canonicalIdentifier(targetSchema.tableName)
        ) {
            warnings.push(
                `-- Warning: table names differ (${sourceSchema.tableName} vs ${targetSchema.tableName}). Using ${targetSchema.tableName} for generated statements.`
            );
        }

        const removedColumns = new Map();
        const addedColumns = new Map();

        // Columns present in target but not source must be dropped from target.
        targetSchema.columns.forEach((targetColumn, key) => {
            if (!sourceSchema.columns.has(key)) {
                removedColumns.set(key, targetColumn);
            }
        });

        // Columns present in source but not target must be added to target.
        sourceSchema.columns.forEach((sourceColumn, key) => {
            if (!targetSchema.columns.has(key)) {
                addedColumns.set(key, sourceColumn);
            }
        });

        const renamePairs = detectPotentialRenamePairs(removedColumns, addedColumns);
        renamePairs.forEach((pair) => {
            if (!confirmColumnRename(targetSchema.tableName, pair.fromColumn, pair.toColumn)) {
                return;
            }

            const renameTargetInfo = buildSpRenameColumnTarget(targetSchema.tableName, pair.fromColumn.name);

            if (renameTargetInfo.schemaAssumed) {
                warnings.push(
                    `-- Warning: table name ${targetSchema.tableName} has no explicit schema. Assuming [dbo] for column rename (${pair.fromColumn.name} -> ${pair.toColumn.name}).`
                );
            }

            warnings.push(
                `-- Rename confirmed by user: ${pair.fromColumn.name} -> ${pair.toColumn.name} (order ${pair.fromColumn.ordinal + 1})`
            );

            statements.push(
                `EXEC sp_rename '${toSqlStringLiteral(renameTargetInfo.target)}', '${toSqlStringLiteral(pair.toColumn.name)}', 'COLUMN';\nGO`
            );

            removedColumns.delete(pair.fromKey);
            addedColumns.delete(pair.toKey);
        });

        // Drops: in target 1 but not in target 2 (after rename matching)
        removedColumns.forEach((column1) => {
            statements.push(`ALTER TABLE ${targetSchema.tableName}\n    DROP COLUMN ${toBracketedName(column1.name)};\nGO`);
        });

        // Adds: in target 2 but not in target 1 (after rename matching)
        addedColumns.forEach((column2) => {
            statements.push(`ALTER TABLE ${targetSchema.tableName}\n    ADD ${formatColumnDefinition(column2)};\nGO`);
        });

        // Type/nullability changes for same-name columns: alter target to match source.
        sourceSchema.columns.forEach((sourceColumn, key) => {
            const targetColumn = targetSchema.columns.get(key);
            if (!targetColumn) return;

            const typeChanged = canonicalType(targetColumn.type) !== canonicalType(sourceColumn.type);
            const nullChanged =
                sourceColumn.nullable !== null &&
                targetColumn.nullable !== null &&
                targetColumn.nullable !== sourceColumn.nullable;

            if (typeChanged || nullChanged) {
                const updatedNullability = sourceColumn.nullable !== null ? sourceColumn.nullable : targetColumn.nullable;
                const altered = {
                    name: targetColumn.name,
                    type: sourceColumn.type,
                    nullable: updatedNullability
                };
                statements.push(`ALTER TABLE ${targetSchema.tableName}\n    ALTER COLUMN ${formatColumnDefinition(altered)};\nGO`);
            }
        });

        if (statements.length === 0) {
            output.value = '-- Target Table is already in sync with Source Table.\n';
            refreshEditorHighlight('syncOutput');
            return;
        }

        const outputParts = [];
        if (warnings.length > 0) {
            outputParts.push(warnings.join('\n'));
        }
        outputParts.push(`-- Sync ${targetSchema.tableName} to match ${sourceSchema.tableName}`);
        outputParts.push(statements.join('\n\n'));

        output.value = outputParts.join('\n\n');
        refreshEditorHighlight('syncOutput');
    } catch (error) {
        showAlert(`Failed to generate sync SQL: ${error.message}`);
        document.getElementById('syncOutput').value = '';
        refreshEditorHighlight('syncOutput');
    }
}

async function copyOutput() {
    const output = document.getElementById('syncOutput').value;
    if (!output) {
        showAlert('No output to copy yet.', 'warning');
        return;
    }

    try {
        await navigator.clipboard.writeText(output);
        showAlert('Output copied to clipboard.', 'success');
    } catch (err) {
        showAlert('Failed to copy output to clipboard.');
    }
}
