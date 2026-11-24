# Component mapping guide

The main Printout From Form converter has one mapping registry. There is no
second string-template renderer to keep in sync.

| File | Edit here when changing… |
|---|---|
| `componentMappings.js` | A Form.io type's renderer, profile, datasource type, label policy, alias, or field expression |
| `definitions/fieldControls.js` | DevExpress control type, appearance, dimensions, or child control presentation |
| `definitions/layoutControls.js` | Panel, column, table, and tab control attributes |
| `devexpress-definitions.js` | Profile resolution, shared label styles, and sizing helpers |
| `componentProcessor.js` | Structural algorithms that build and position controls |

These are JavaScript modules rather than JSON because profiles need live getters
for settings, and bindings need expression functions. No build step is required.
All dimensions use report units (hundredths of an inch).

## Spacing and padding

`layoutConfig.js` owns spacing defaults. `VERTICAL_SPACING` is a gap **between**
visible sibling components, with no trailing gap after the final child. Report
flow sections similarly receive one separating gap. Label/value spacing uses
`LABEL_VALUE_GAP` and `LABEL_HORIZONTAL_GAP`, independently of section spacing.

Plain panels, fieldsets, and tab panes default to `CONTAINER_PADDING: 0` so
nesting a grouping wrapper does not enlarge the layout. Bordered wells use
`WELL_PADDING: 8`; each deliberately nested well has its own visible inset.
Columns and tables use horizontal cell insets of 8 and 5 respectively, with no
implicit vertical inset. `BAND_PADDING` defaults to zero.

`definitions/layoutControls.js` exposes these values through live `insets`
getters. Builders apply them to child coordinates and available width exactly
once. Layout containers serialize `Padding="0,0,0,0,100"` to avoid a second
DevExpress inset. Ordinary field and grid-cell text padding remains in their
presentation profiles. Container height is the actual child extent plus its
bottom inset, without adding a second estimate or trailing sibling gap. Empty
untitled panels are omitted. Titles and field labels still occupy their own
configured height and intentionally increase the report height.

## Add a regular input component

Add an entry to `COMPONENT_MAPPINGS`. Reuse a target profile when possible:

```js
customAmount: {
    profile: 'number',
    renderer: 'field',
    dataType: 'Decimal',
    dataField: true,
    requiresLabel: true,
    expression: key => `Round([${key}], 2)`
}
```

This entry drives both rendering and datasource discovery. No processor switch
or datasource type table needs updating. The `input: true` and `key` properties
are still required on the Form.io component to collect a datasource field.

If appearance differs, add a new profile to `FIELD_CONTROLS` and reference it:

```js
amountWithBorder: {
    controlType: 'XRLabel',
    get defaultHeight() { return LAYOUT.INPUT_HEIGHT; },
    widthMultiplier: 0.5,
    attributes: {
        Borders: 'All',
        Padding: '2,2,0,0,100',
        TextAlignment: 'MiddleRight'
    }
}
```

Keep Form.io keys, aliases, datasource types, and field expressions out of the
target presentation profile. Profiles can be shared by several mappings. Use
getters for settings-dependent values so regeneration reads current settings.

## Mapping properties

| Property | Meaning |
|---|---|
| `profile` | Key in `FIELD_CONTROLS` |
| `renderer` | `field`, `container`, `columns`, `table`, `tabs`, `grid`, `subreport`, or `skip` |
| `layout` | Key in `LAYOUT_CONTROLS`, for structural layouts |
| `dataField` | Whether this type contributes a scalar datasource field |
| `dataType` | DevExpress datasource type; defaults to `String` |
| `requiresLabel` | Generate a separate label control |
| `useTextAsLabel` | Put the component label on the value control |
| `useContentAsText` / `useHtmlAsText` | Render static markup instead of a data binding |
| `expression` | Function accepting a field key and returning a DevExpress expression |
| `alias` | Reuse another complete mapping (for example, Edit Grid uses Data Grid) |

Unknown input types retain textfield fallback with a conversion warning. An alias
is a complete reuse; use a separate explicit entry to customize behavior.

## Structural components

New layouts and repeating structures may need a builder in `ComponentProcessor`.
Register their renderer and layout profile here; keep coordinate calculations,
collection construction, and report-band algorithms in the builder. A registry
entry alone cannot implement a new structural algorithm.

Grid cells are text-based projections of fields; their text bindings intentionally
differ from standalone checkbox/image controls. Subreport sources, SQL backend
mapping, conditional logic, and nested data limitations remain as described in
the repository README. This refactor does not expand that support.

Run `node --experimental-default-type=module --test tests/printout.test.mjs`.
Tests check registry references, existing conversion behavior, and adding a new
field mapping without processor edits. The separately embedded Mini Printout
Module still owns an independent core and does not consume this registry.
