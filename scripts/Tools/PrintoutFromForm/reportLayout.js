// Move a group into a band without restacking side labels, values, or columns.
export function placeControlGroup(controls, top = 0) {
    const positioned = controls.filter(control => control.attributes?.LocationFloat);
    if (!positioned.length) return top;
    const firstY = Math.min(...positioned.map(control => Number(control.attributes.LocationFloat.split(',')[1])));
    let bottom = top;
    for (const control of positioned) {
        const [x, y] = control.attributes.LocationFloat.split(',').map(Number);
        const height = Number(control.attributes.SizeF?.split(',')[1]) || 0;
        const newY = y - firstY + top;
        control.attributes.LocationFloat = `${x},${newY}`;
        bottom = Math.max(bottom, newY + height);
    }
    return bottom;
}
// Container coordinates own layout insets. Serialized container Padding is zero;
// field/text Padding remains in the field profiles. All values use report units.
export function layoutInsets(definition, width) {
    const padding = definition.insets || {};
    const left = Math.max(0, padding.left || 0), right = Math.max(0, padding.right || 0);
    const scale = left + right ? Math.min(1, Math.max(0, width - 1) / (left + right)) : 1;
    return { left: left * scale, right: right * scale,
        top: Math.max(0, padding.top || 0), bottom: Math.max(0, padding.bottom || 0) };
}

