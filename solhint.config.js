const rules = [
  'no-unused-vars',
  'const-name-snakecase',
  'contract-name-camelcase',
  'event-name-camelcase',
  'func-name-mixedcase',
  'func-param-name-mixedcase',
  'modifier-name-mixedcase',
  'var-name-mixedcase',
  'imports-on-top',
  'no-global-import'
];

module.exports = {
  plugins: ['openzeppelin'],
  rules: Object.fromEntries(rules.map(r => [r, 'error']))
};