const { createHighlighter } = require('shiki');

(async () => {
  const hi = await createHighlighter({ themes: ['light-plus', 'dark-plus'], langs: ['markdown', 'cpp'] });
  hi.setTheme('dark-plus');

  // Simulate the exact page flow: preview renders with explicit dual themes,
  // then check whether codeToHtml mutated the active theme.
  hi.codeToHtml('#include <iostream>', { lang: 'cpp', themes: { light: 'light-plus', dark: 'dark-plus' }, defaultColor: false });

  // Get the current active theme state — tokenize a line and see which colorMap indices refer to
  const grammar = hi.getLanguage('cpp');
  const r = grammar.tokenizeLine2('#include <iostream>', null, 1000);
  const meta = r.tokens[1];
  const fg = (meta & 16744448) >>> 15;
  console.log('fg index after codeToHtml:', fg);
  const { colorMap } = hi.setTheme('dark-plus');
  console.log('dark colorMap[' + fg + ']:', colorMap[fg]);
  const { colorMap: cmLight } = hi.setTheme('light-plus');
  console.log('light colorMap[' + fg + ']:', cmLight[fg]);

  // now also verify: what index does cpp grammar use in light-plus active state?
  const r2 = hi.getLanguage('cpp').tokenizeLine2('#include <iostream>', null, 1000);
  const fg2 = (r2.tokens[1] & 16744448) >>> 15;
  console.log('light-active fg index:', fg2, '->', cmLight[fg2]);
})();
