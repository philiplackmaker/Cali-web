// Design-system guardrails: no raw colour, length, font, radius, shadow, timing or
// z-index values outside the tokens. Use var(--ds-*) instead.
const tokenOnly = [/^var\(--/, 'inherit', 'initial', 'unset'];

export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['src/styles/tokens.css', '_site/**', 'node_modules/**', 'legacy/**'],
  rules: {
    // BEM state selectors trip this constantly; cascade layers give us the ordering we need.
    'no-descending-specificity': null,
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
    'unit-disallowed-list': [
      [
        'px',
        'rem',
        'em',
        'ch',
        'ex',
        'pt',
        'pc',
        'cm',
        'mm',
        'in',
        'vw',
        'vh',
        'dvh',
        'svh',
        'lvh',
        'ms',
        's',
      ],
      // Media and container queries can't read custom properties: rem breakpoints only.
      { ignoreMediaFeatureNames: { rem: ['width', 'min-width', 'max-width'] } },
    ],
    'declaration-property-value-allowed-list': {
      'font-family': tokenOnly,
      'font-size': tokenOnly,
      'font-weight': tokenOnly,
      'line-height': tokenOnly,
      'letter-spacing': tokenOnly,
      'border-radius': [...tokenOnly, '0'],
      // Shadows may be composed from tokens, e.g. inset 0 0 0 var(--ds-line-hairline) var(--ds-color-…)
      'box-shadow': [...tokenOnly, 'none', /^(inset )?((0|var\(--ds-[\w-]+\)) ?)+$/],
      'z-index': [...tokenOnly, 'auto'],
      font: ['inherit'],
    },
    // BEM with a ds- (or docs-) prefix: ds-block__element--modifier
    'selector-class-pattern': [
      '^(ds|docs)-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Use BEM with a ds- prefix: ds-block__element--modifier' },
    ],
  },
  overrides: [
    {
      // @font-face can't use var(), so this is the one file that names fonts.
      files: ['src/styles/fonts.css'],
      rules: { 'declaration-property-value-allowed-list': null, 'font-family-name-quotes': null },
    },
  ],
};
