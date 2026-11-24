import { LAYOUT } from './layoutConfig.js';
import { FIELD_CONTROLS } from './definitions/fieldControls.js';
import { LAYOUT_CONTROLS } from './definitions/layoutControls.js';
import { getComponentMapping } from './componentMappings.js';

// Shared report styling. Component profiles and source mappings are separate modules.
export const DevExpressDefinitions = { commonAttributes: {
        spacing: 
        {
            labelSpacing: 2,
            get componentSpacing() {
                return LAYOUT.VERTICAL_SPACING;
            },
            sectionSpacing: 15
        },

        borders: 
        {
            none: 'None',
            bottom: 'Bottom',
            all: 'All',
            leftRightBottom: 'Left, Right, Bottom'
        },

        alignment: 
        {
            middleLeft: 'MiddleLeft',
            middleCenter: 'MiddleCenter',
            middleRight: 'MiddleRight',
            topLeft: 'TopLeft',
            topCenter: 'TopCenter'
        }
    } };

export const DevExpressHelpers = {

    // ? Retrieve the component definition for a given type
    getComponentDef(type, component = {}, warnings = null)
    {
        const mapping = getComponentMapping(type);
        const profile = mapping?.profile && Object.hasOwn(FIELD_CONTROLS, mapping.profile) ? FIELD_CONTROLS[mapping.profile] : null;
        const def = profile ? { ...profile, ...mapping } : mapping?.layout ? { ...FIELD_CONTROLS.textfield, ...mapping } : null;

        // ! If no definition found, log a warning and return the textfield definition as a fallback
        if (!def)
        {
            if (warnings) warnings.push({
                type: 'unhandled_component',
                message: "Component type '" + type + "' uses textfield rendering.",
                component: { type, key: component.key || '[unknown]', label: component.label || '[unknown]' }
            });

            return { ...FIELD_CONTROLS.textfield, ...getComponentMapping('textfield') };
        }

        return def;
    },

    // ? Retrieve the container definition for a given type
    getContainerDef(type)
    {
        return LAYOUT_CONTROLS[type];
    },

    // ? Retrieve a label style by name
    getLabelStyle(style = 'default')
    {
        // ? Always return a fresh style object using the current LAYOUT values
        switch (style) {
            case 'header':
                return {
                    Font: LAYOUT.FONT_REPORTHEADER,
                    TextAlignment: 'MiddleCenter',
                    Padding: '2,2,0,0,100',
                    Borders: 'None'
                };
            case 'sectionHeader':
                return {
                    Font: LAYOUT.FONT_SECTIONHEADER,
                    TextAlignment: 'MiddleLeft',
                    Padding: '2,0,0,0,100',
                    Borders: 'None'
                };
            case 'default':
            default:
                return {
                    Font: LAYOUT.FONT_FIELDLABEL,
                    TextAlignment: 'MiddleLeft',
                    Padding: '2,0,0,0,100',
                    Borders: 'None'
                };
        }
    },

    // ? Calculate the width of a component based on its definition
    calculateComponentWidth(width, componentDef) 
    {
        if (!componentDef || typeof width !== 'number') 
        {
            return width;
        }

        const multiplier = componentDef.widthMultiplier;

        if (typeof multiplier !== 'number')
        {
            return width;
        }

        const clampedMultiplier = Math.max(0, Math.min(1, multiplier));

        return Math.floor(width * clampedMultiplier);
    },

    // ? Combine two sets of attributes
    combineAttributes(baseAttrs, additionalAttrs) 
    {
        return { ...baseAttrs, ...additionalAttrs };
    },

    // ? Calculate the height of a component based on its definition
    calculateComponentHeight(component) 
    {
        const def = this.getComponentDef(component.type);
        const labelHeight = (def.requiresLabel && !component.hideLabel) ? window.LAYOUT.INPUT_HEIGHT : 0;
        const spacing = DevExpressDefinitions.commonAttributes.spacing.componentSpacing;

        return def.defaultHeight + labelHeight + spacing;
    }
};
