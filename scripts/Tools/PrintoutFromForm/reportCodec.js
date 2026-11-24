// The application's import format stores a gzip-compressed XML layout in
// ReportTemplate. Keep byte encoding separate from layout and UI handling.
export function encodeReportTemplate(xml, compression = globalThis.pako) {
    if (!compression) throw new Error('The report compression library could not be loaded.');
    const bytes = compression.gzip(new TextEncoder().encode(xml), { level: 9 });
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

export function decodeReportTemplate(template, compression = globalThis.pako) {
    if (!template) throw new Error('No report template provided.');
    if (!compression) throw new Error('The report compression library could not be loaded.');
    const bytes = Uint8Array.from(atob(template), character => character.charCodeAt(0));
    const content = compression.inflate(bytes, { to: 'string' });
    if (!content?.startsWith('<?xml')) throw new Error('Invalid report XML content.');
    return { type: 'xml', content, format: 'DevExpress XML Report' };
}
