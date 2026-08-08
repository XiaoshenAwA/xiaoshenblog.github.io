// Markdown 数学公式补全
// 参考 VS Code 扩展 Markdown All in One 的实现思路：
//   - 数据源：KaTeX 官方支持表（docs/supported.md），按参数数量分为
//     \cmd(无参) / \cmd{$1}(单参) / \cmd{$1}{$2}(双参) 三类
//   - 触发条件：行末为奇数个反斜杠，且光标处于数学环境（$…$ 或 $$…$$）
//   - 提供 \begin{…} 环境补全、自定义排序（小写优先）
// 本项目保留的增强：$$ 自动闭合、filterText 以 \ 开头（Monaco 过滤所需）

// --- 数据：按 KaTeX 支持表分类 ---
// [名称, 参数个数]；参数个数含义：0=无参, 1=单参{, 2=双参

const DATA = [
  // 重音/装饰（1 参）
  ['tilde', 1], ['mathring', 1], ['widetilde', 1], ['overgroup', 1],
  ['utilde', 1], ['undergroup', 1], ['acute', 1], ['vec', 1], ['Overrightarrow', 1],
  ['bar', 1], ['overleftarrow', 1], ['overrightarrow', 1], ['breve', 1],
  ['underleftarrow', 1], ['underrightarrow', 1], ['check', 1], ['overleftharpoon', 1],
  ['dot', 1], ['overleftrightarrow', 1], ['overbrace', 1], ['ddot', 1],
  ['underleftrightarrow', 1], ['underbrace', 1], ['grave', 1], ['overline', 1],
  ['hat', 1], ['underline', 1], ['underbar', 1], ['widehat', 1], ['widecheck', 1],
  // 括号定界符（无参）
  ['lparen', 0], ['rparen', 0], ['lceil', 0], ['rceil', 0], ['uparrow', 0],
  ['lbrack', 0], ['rbrack', 0], ['lfloor', 0], ['rfloor', 0], ['downarrow', 0],
  ['lbrace', 0], ['rbrace', 0], ['lmoustache', 0], ['rmoustache', 0], ['updownarrow', 0],
  ['langle', 0], ['rangle', 0], ['lgroup', 0], ['rgroup', 0], ['Uparrow', 0],
  ['vert', 0], ['ulcorner', 0], ['urcorner', 0], ['Downarrow', 0],
  ['Vert', 0], ['llcorner', 0], ['lrcorner', 0], ['Updownarrow', 0],
  ['lvert', 0], ['rvert', 0], ['lVert', 0], ['rVert', 0], ['backslash', 0],
  ['lang', 0], ['rang', 0], ['lt', 0], ['gt', 0], ['llbracket', 0], ['rrbracket', 0],
  // 定界符尺寸（无参）
  ['left', 0], ['big', 0], ['bigl', 0], ['bigm', 0], ['bigr', 0], ['middle', 0],
  ['Big', 0], ['Bigl', 0], ['Bigm', 0], ['Bigr', 0], ['right', 0], ['bigg', 0],
  ['biggl', 0], ['biggm', 0], ['biggr', 0], ['Bigg', 0], ['Biggl', 0], ['Biggm', 0], ['Biggr', 0],
  // 希腊字母（无参）
  ['Alpha', 0], ['Beta', 0], ['Gamma', 0], ['Delta', 0], ['Epsilon', 0], ['Zeta', 0],
  ['Eta', 0], ['Theta', 0], ['Iota', 0], ['Kappa', 0], ['Lambda', 0], ['Mu', 0],
  ['Nu', 0], ['Xi', 0], ['Omicron', 0], ['Pi', 0], ['Rho', 0], ['Sigma', 0], ['Tau', 0],
  ['Upsilon', 0], ['Phi', 0], ['Chi', 0], ['Psi', 0], ['Omega', 0],
  ['varGamma', 0], ['varDelta', 0], ['varTheta', 0], ['varLambda', 0], ['varXi', 0],
  ['varPi', 0], ['varSigma', 0], ['varUpsilon', 0], ['varPhi', 0], ['varPsi', 0], ['varOmega', 0],
  ['alpha', 0], ['beta', 0], ['gamma', 0], ['delta', 0], ['epsilon', 0], ['zeta', 0],
  ['eta', 0], ['theta', 0], ['iota', 0], ['kappa', 0], ['lambda', 0], ['mu', 0],
  ['nu', 0], ['xi', 0], ['omicron', 0], ['pi', 0], ['rho', 0], ['sigma', 0], ['tau', 0],
  ['upsilon', 0], ['phi', 0], ['chi', 0], ['psi', 0], ['omega', 0],
  ['varepsilon', 0], ['varkappa', 0], ['vartheta', 0], ['thetasym', 0], ['varpi', 0],
  ['varrho', 0], ['varsigma', 0], ['varphi', 0], ['digamma', 0],
  // 其他字母（无参）
  ['imath', 0], ['nabla', 0], ['Im', 0], ['Reals', 0], ['jmath', 0], ['partial', 0],
  ['image', 0], ['wp', 0], ['aleph', 0], ['Game', 0], ['Bbbk', 0], ['weierp', 0],
  ['alef', 0], ['Finv', 0], ['N', 0], ['Z', 0], ['alefsym', 0], ['cnums', 0],
  ['natnums', 0], ['beth', 0], ['Complex', 0], ['R', 0], ['gimel', 0], ['ell', 0],
  ['daleth', 0], ['hbar', 0], ['real', 0], ['eth', 0], ['hslash', 0], ['reals', 0],
  // 注解（单参）
  ['cancel', 1], ['bcancel', 1], ['xcancel', 1], ['sout', 1], ['boxed', 1],
  ['phase', 1], ['tag', 1], ['sout', 1], ['tagstar', 1],
  // 垂直布局
  ['atop', 0], ['substack', 1], ['stackrel', 2], ['overset', 2], ['underset', 2], ['raisebox', 2],
  ['mathllap', 1], ['mathrlap', 1], ['mathclap', 1], ['llap', 1], ['rlap', 1], ['clap', 1], ['smash', 1],
  // 间距（无参）
  ['thinspace', 0], ['medspace', 0], ['thickspace', 0], ['enspace', 0], ['quad', 0],
  ['qquad', 0], ['negthinspace', 0], ['negmedspace', 0], ['nobreakspace', 0],
  ['negthickspace', 0], ['space', 0], ['mathstrut', 0], ['kern', 1], ['mkern', 1],
  ['mskip', 1], ['hskip', 1], ['hspace', 1], ['phantom', 1], ['hphantom', 1], ['vphantom', 1],
  // 逻辑与集合论
  ['forall', 0], ['complement', 0], ['therefore', 0], ['emptyset', 0], ['exists', 0],
  ['subset', 0], ['because', 0], ['empty', 0], ['exist', 0], ['supset', 0], ['mapsto', 0],
  ['varnothing', 0], ['nexists', 0], ['mid', 0], ['to', 0], ['implies', 0], ['in', 0],
  ['land', 0], ['gets', 0], ['impliedby', 0], ['isin', 0], ['lor', 0], ['leftrightarrow', 0],
  ['iff', 0], ['notin', 0], ['ni', 0], ['notni', 0], ['neg', 0], ['lnot', 0],
  // 宏命令（无参）
  ['def', 0], ['edef', 0], ['let', 0], ['futurelet', 0], ['global', 0], ['newcommand', 0],
  ['renewcommand', 0], ['providecommand', 0], ['long', 0], ['char', 0], ['mathchoice', 0],
  ['relax', 0], ['expandafter', 0], ['noexpand', 0],
  // 大运算符（无参）
  ['sum', 0], ['prod', 0], ['bigotimes', 0], ['bigvee', 0], ['int', 0], ['coprod', 0],
  ['bigoplus', 0], ['bigwedge', 0], ['iint', 0], ['intop', 0], ['bigodot', 0], ['bigcap', 0],
  ['iiint', 0], ['smallint', 0], ['biguplus', 0], ['bigcup', 0], ['oint', 0], ['oiint', 0],
  ['oiiint', 0], ['bigsqcup', 0],
  // 二元运算符（无参）
  ['cdot', 0], ['gtrdot', 0], ['pmod', 0], ['cdotp', 0], ['intercal', 0], ['pod', 0],
  ['centerdot', 0], ['rhd', 0], ['circ', 0], ['leftthreetimes', 0], ['rightthreetimes', 0],
  ['amalg', 0], ['circledast', 0], ['ldotp', 0], ['rtimes', 0], ['circledcirc', 0],
  ['setminus', 0], ['ast', 0], ['circleddash', 0], ['lessdot', 0], ['smallsetminus', 0],
  ['barwedge', 0], ['Cup', 0], ['lhd', 0], ['sqcap', 0], ['bigcirc', 0], ['cup', 0],
  ['ltimes', 0], ['sqcup', 0], ['bmod', 0], ['curlyvee', 0], ['times', 0], ['boxdot', 0],
  ['curlywedge', 0], ['mp', 0], ['unlhd', 0], ['boxminus', 0], ['div', 0], ['odot', 0],
  ['unrhd', 0], ['boxplus', 0], ['divideontimes', 0], ['ominus', 0], ['uplus', 0],
  ['boxtimes', 0], ['dotplus', 0], ['oplus', 0], ['vee', 0], ['bullet', 0],
  ['doublebarwedge', 0], ['otimes', 0], ['veebar', 0], ['Cap', 0], ['outdoes', 0],
  ['wedge', 0], ['cap', 0], ['doublecup', 0], ['pm', 0], ['plusmn', 0],
  ['wr', 0],
  // 分数（0 / 2 参）
  ['over', 0], ['above', 0], ['frac', 2], ['dfrac', 2], ['tfrac', 2], ['cfrac', 2],
  ['genfrac', 2],
  // 二项式系数
  ['choose', 0], ['binom', 2], ['dbinom', 2], ['tbinom', 2], ['brace', 2], ['brack', 2],
  // 数学函数（无参）
  ['arcsin', 0], ['cosec', 0], ['deg', 0], ['sec', 0], ['arccos', 0], ['cosh', 0],
  ['dim', 0], ['sin', 0], ['arctan', 0], ['cot', 0], ['exp', 0], ['sinh', 0],
  ['arctg', 0], ['cotg', 0], ['hom', 0], ['sh', 0], ['arcctg', 0], ['coth', 0],
  ['ker', 0], ['tan', 0], ['arg', 0], ['csc', 0], ['lg', 0], ['tanh', 0], ['ch', 0],
  ['ctg', 0], ['ln', 0], ['tg', 0], ['cos', 0], ['cth', 0], ['log', 0], ['th', 0],
  ['argmax', 0], ['injlim', 0], ['min', 0], ['varinjlim', 0], ['argmin', 0], ['lim', 0],
  ['plim', 0], ['varliminf', 0], ['det', 0], ['liminf', 0], ['Pr', 0], ['varlimsup', 0],
  ['gcd', 0], ['limsup', 0], ['projlim', 0], ['varprojlim', 0], ['inf', 0], ['max', 0],
  ['sup', 0], ['operatorname', 1], ['operatornamestar', 1], ['operatornamewithlimits', 1],
  // 根式（单参）
  ['sqrt', 1], ['surd', 0],
  // 关系符号（无参）
  ['doteqdot', 0], ['lessapprox', 0], ['smile', 0], ['eqcirc', 0], ['lesseqgtr', 0],
  ['sqsubset', 0], ['eqcolon', 0], ['minuscolon', 0], ['lesseqqgtr', 0], ['sqsubseteq', 0],
  ['Eqcolon', 0], ['minuscoloncolon', 0], ['lessgtr', 0], ['sqsupset', 0], ['approx', 0],
  ['eqqcolon', 0], ['equalscolon', 0], ['lesssim', 0], ['sqsupseteq', 0], ['approxcolon', 0],
  ['Eqqcolon', 0], ['equalscoloncolon', 0], ['ll', 0], ['Subset', 0], ['approxcoloncolon', 0],
  ['eqsim', 0], ['lll', 0], ['subset', 0], ['sub', 0], ['asymp', 0], ['eqslantgtr', 0],
  ['llless', 0], ['subseteq', 0], ['sube', 0], ['approxeq', 0], ['eqslantless', 0], ['lt', 0],
  ['subseteqq', 0], ['backepsilon', 0], ['equiv', 0], ['mid', 0], ['succ', 0], ['backsim', 0],
  ['fallingdotseq', 0], ['models', 0], ['succapprox', 0], ['backsimeq', 0], ['frown', 0],
  ['multimap', 0], ['succcurlyeq', 0], ['between', 0], ['ge', 0], ['origof', 0], ['succeq', 0],
  ['bowtie', 0], ['geq', 0], ['owns', 0], ['succsim', 0], ['bumpeq', 0], ['geqq', 0],
  ['parallel', 0], ['Supset', 0], ['Bumpeq', 0], ['geqslant', 0], ['perp', 0], ['supset', 0],
  ['circeq', 0], ['gg', 0], ['pitchfork', 0], ['supseteq', 0], ['supe', 0], ['colonapprox', 0],
  ['ggg', 0], ['prec', 0], ['supseteqq', 0], ['Colonapprox', 0], ['coloncolonapprox', 0],
  ['gggtr', 0], ['precapprox', 0], ['thickapprox', 0], ['coloneq', 0], ['colonminus', 0],
  ['gt', 0], ['preccurlyeq', 0], ['thicksim', 0], ['Coloneq', 0], ['coloncolonminus', 0],
  ['gtrapprox', 0], ['preceq', 0], ['trianglelefteq', 0], ['coloneqq', 0], ['colonequals', 0],
  ['gtreqless', 0], ['precsim', 0], ['triangleq', 0], ['Coloneqq', 0], ['coloncolonequals', 0],
  ['gtreqqless', 0], ['propto', 0], ['trianglerighteq', 0], ['colonsim', 0], ['gtrless', 0],
  ['risingdotseq', 0], ['varpropto', 0], ['Colonsim', 0], ['coloncolonsim', 0], ['gtrsim', 0],
  ['shortmid', 0], ['vartriangle', 0], ['cong', 0], ['imageof', 0], ['shortparallel', 0],
  ['vartriangleleft', 0], ['curlyeqprec', 0], ['in', 0], ['isin', 0], ['sim', 0],
  ['vartriangleright', 0], ['curlyeqsucc', 0], ['Join', 0], ['simcolon', 0], ['vcentcolon', 0],
  ['ratio', 0], ['dashv', 0], ['le', 0], ['simcoloncolon', 0], ['vdash', 0], ['dblcolon', 0],
  ['coloncolon', 0], ['leq', 0], ['simeq', 0], ['vDash', 0], ['doteq', 0], ['leqq', 0],
  ['smallfrown', 0], ['Vdash', 0], ['Doteq', 0], ['leqslant', 0], ['smallsmile', 0], ['Vvdash', 0],
  // 否定关系（无参）
  ['gnapprox', 0], ['ngeqslant', 0], ['nsubseteq', 0], ['precneqq', 0], ['gneq', 0],
  ['ngtr', 0], ['nsubseteqq', 0], ['precnsim', 0], ['gneqq', 0], ['nleq', 0], ['nsucc', 0],
  ['subsetneq', 0], ['gnsim', 0], ['nleqq', 0], ['nsucceq', 0], ['subsetneqq', 0],
  ['gvertneqq', 0], ['nleqslant', 0], ['nsupseteq', 0], ['succnapprox', 0], ['lnapprox', 0],
  ['nless', 0], ['nsupseteqq', 0], ['succneqq', 0], ['lneq', 0], ['nmid', 0],
  ['ntriangleleft', 0], ['succnsim', 0], ['lneqq', 0], ['notin', 0], ['ntrianglelefteq', 0],
  ['supsetneq', 0], ['lnsim', 0], ['notni', 0], ['ntriangleright', 0], ['supsetneqq', 0],
  ['lvertneqq', 0], ['nparallel', 0], ['ntrianglerighteq', 0], ['varsubsetneq', 0],
  ['ncong', 0], ['nprec', 0], ['nvdash', 0], ['varsubsetneqq', 0], ['ne', 0], ['npreceq', 0],
  ['nvDash', 0], ['varsupsetneq', 0], ['neq', 0], ['nshortmid', 0], ['nVDash', 0],
  ['varsupsetneqq', 0], ['ngeq', 0], ['nshortparallel', 0], ['nVdash', 0], ['ngeqq', 0],
  ['nsim', 0], ['precnapprox', 0],
  // 箭头（无参）
  ['circlearrowleft', 0], ['leftharpoonup', 0], ['rArr', 0], ['circlearrowright', 0],
  ['leftleftarrows', 0], ['rarr', 0], ['curvearrowleft', 0], ['leftrightarrow', 0],
  ['restriction', 0], ['curvearrowright', 0], ['Leftrightarrow', 0], ['rightarrow', 0],
  ['Darr', 0], ['leftrightarrows', 0], ['Rightarrow', 0], ['dArr', 0],
  ['leftrightharpoons', 0], ['rightarrowtail', 0], ['darr', 0], ['leftrightsquigarrow', 0],
  ['rightharpoondown', 0], ['dashleftarrow', 0], ['Lleftarrow', 0], ['rightharpoonup', 0],
  ['dashrightarrow', 0], ['longleftarrow', 0], ['rightleftarrows', 0], ['downarrow', 0],
  ['Longleftarrow', 0], ['rightleftharpoons', 0], ['Downarrow', 0], ['longleftrightarrow', 0],
  ['rightrightarrows', 0], ['downdownarrows', 0], ['Longleftrightarrow', 0],
  ['rightsquigarrow', 0], ['downharpoonleft', 0], ['longmapsto', 0], ['Rrightarrow', 0],
  ['downharpoonright', 0], ['longrightarrow', 0], ['Rsh', 0], ['gets', 0], ['Longrightarrow', 0],
  ['searrow', 0], ['Harr', 0], ['looparrowleft', 0], ['swarrow', 0], ['hArr', 0],
  ['looparrowright', 0], ['to', 0], ['harr', 0], ['Lrarr', 0], ['twoheadleftarrow', 0],
  ['hookleftarrow', 0], ['lrArr', 0], ['twoheadrightarrow', 0], ['hookrightarrow', 0],
  ['lrarr', 0], ['Uarr', 0], ['iff', 0], ['Lsh', 0], ['uArr', 0], ['impliedby', 0],
  ['mapsto', 0], ['uarr', 0], ['implies', 0], ['nearrow', 0], ['uparrow', 0], ['Larr', 0],
  ['nleftarrow', 0], ['Uparrow', 0], ['lArr', 0], ['nLeftarrow', 0], ['updownarrow', 0],
  ['larr', 0], ['nleftrightarrow', 0], ['Updownarrow', 0], ['leadsto', 0], ['nLeftrightarrow', 0],
  ['upharpoonleft', 0], ['leftarrow', 0], ['nrightarrow', 0], ['upharpoonright', 0],
  ['Leftarrow', 0], ['nRightarrow', 0], ['upuparrows', 0], ['leftarrowtail', 0],
  ['nwarrow', 0], ['Rarr', 0],
  // 可扩展箭头（单参）
  ['xleftarrow', 1], ['xrightarrow', 1], ['xLeftarrow', 1], ['xRightarrow', 1],
  ['xleftrightarrow', 1], ['xLeftrightarrow', 1], ['xhookleftarrow', 1], ['xhookrightarrow', 1],
  ['xtwoheadleftarrow', 1], ['xtwoheadrightarrow', 1], ['xleftharpoonup', 1],
  ['xrightharpoonup', 1], ['xleftharpoondown', 1], ['xrightharpoondown', 1],
  ['xleftrightharpoons', 1], ['xrightleftharpoons', 1], ['xtofrom', 1], ['xmapsto', 1],
  ['xlongequal', 1],
  // bra-ket 记号（单参）
  ['bra', 1], ['Bra', 1], ['ket', 1], ['Ket', 1], ['braket', 1], ['Braket', 1],
  // 类分配（单参）
  ['mathbin', 1], ['mathclose', 1], ['mathinner', 1], ['mathop', 1], ['mathopen', 1],
  ['mathord', 1], ['mathpunct', 1], ['mathrel', 1],
  // 颜色（双参）
  ['color', 2], ['textcolor', 2], ['colorbox', 2],
  // 字体
  ['rm', 0], ['bf', 0], ['it', 0], ['sf', 0], ['tt', 0], ['mathrm', 1], ['mathbf', 1],
  ['mathit', 1], ['mathnormal', 1], ['textbf', 1], ['textit', 1], ['textrm', 1], ['bold', 1],
  ['Bbb', 1], ['textnormal', 1], ['boldsymbol', 1], ['mathbb', 1], ['text', 1], ['bm', 1],
  ['frak', 1], ['mathsf', 1], ['mathtt', 1], ['mathfrak', 1], ['textsf', 1], ['texttt', 1],
  ['mathcal', 1], ['mathscr', 1], ['pmb', 1],
  // 字号（无参）
  ['Huge', 0], ['huge', 0], ['LARGE', 0], ['Large', 0], ['large', 0], ['normalsize', 0],
  ['small', 0], ['footnotesize', 0], ['scriptsize', 0], ['tiny', 0],
  // 样式（无参）
  ['displaystyle', 0], ['textstyle', 0], ['scriptstyle', 0], ['scriptscriptstyle', 0],
  ['limits', 0], ['nolimits', 0], ['verb', 0],
  // 符号与标点（无参）
  ['cdots', 0], ['LaTeX', 0], ['ddots', 0], ['TeX', 0], ['ldots', 0], ['nabla', 0],
  ['vdots', 0], ['infty', 0], ['dotsb', 0], ['infin', 0], ['dotsc', 0], ['checkmark', 0],
  ['dotsi', 0], ['dag', 0], ['dotsm', 0], ['dagger', 0], ['dotso', 0], ['sdot', 0],
  ['ddag', 0], ['mathellipsis', 0], ['ddagger', 0], ['Box', 0], ['Dagger', 0], ['lq', 0],
  ['square', 0], ['angle', 0], ['blacksquare', 0], ['measuredangle', 0], ['rq', 0],
  ['triangle', 0], ['sphericalangle', 0], ['triangledown', 0], ['top', 0], ['triangleleft', 0],
  ['bot', 0], ['triangleright', 0], ['colon', 0], ['bigtriangledown', 0], ['backprime', 0],
  ['bigtriangleup', 0], ['pounds', 0], ['prime', 0], ['blacktriangle', 0], ['mathsterling', 0],
  ['blacktriangledown', 0], ['blacktriangleleft', 0], ['yen', 0], ['blacktriangleright', 0],
  ['surd', 0], ['diamond', 0], ['degree', 0], ['Diamond', 0], ['lozenge', 0], ['mho', 0],
  ['blacklozenge', 0], ['diagdown', 0], ['star', 0], ['diagup', 0], ['bigstar', 0],
  ['flat', 0], ['clubsuit', 0], ['natural', 0], ['copyright', 0], ['clubs', 0], ['sharp', 0],
  ['circledR', 0], ['diamondsuit', 0], ['heartsuit', 0], ['diamonds', 0], ['hearts', 0],
  ['circledS', 0], ['spadesuit', 0], ['spades', 0], ['maltese', 0], ['minuso', 0],
  // 调试（无参）
  ['message', 0], ['errmessage', 0], ['show', 0],
  // 环境（特殊处理）
  ['begin', 9], ['end', 9]
]

// KaTeX 环境列表
const ENVS = [
  'matrix', 'array', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'Bmatrix',
  'cases', 'rcases', 'smallmatrix', 'subarray', 'equation', 'split', 'align',
  'gather', 'alignat', 'CD', 'darray', 'dcases', 'drcases', 'matrix*',
  'pmatrix*', 'bmatrix*', 'Bmatrix*', 'vmatrix*', 'Vmatrix*', 'equation*',
  'gather*', 'align*', 'alignat*', 'gathered', 'aligned', 'alignedat'
]

// 部分命令的中文/符号说明（detail）
const DETAILS = {
  frac: '分数',
  dfrac: '大分数',
  tfrac: '小分数',
  cfrac: '连分数',
  sqrt: '平方根',
  surd: '根号符号',
  sum: '求和',
  prod: '连乘',
  int: '积分',
  iint: '二重积分',
  iiint: '三重积分',
  oint: '环路积分',
  lim: '极限',
  alpha: 'α 希腊字母小写',
  beta: 'β 希腊字母小写',
  gamma: 'γ 希腊字母小写',
  delta: 'δ 希腊字母小写',
  epsilon: 'ϵ 希腊字母小写',
  varepsilon: 'ε 希腊字母小写',
  theta: 'θ 希腊字母小写',
  vartheta: 'ϑ 希腊字母小写',
  lambda: 'λ 希腊字母小写',
  mu: 'μ 希腊字母小写',
  pi: 'π 希腊字母小写',
  varpi: 'ϖ 希腊字母(π 变体)',
  sigma: 'σ 希腊字母小写',
  phi: 'ϕ 希腊字母小写',
  varphi: 'φ 希腊字母小写',
  omega: 'ω 希腊字母小写',
  Gamma: 'Γ 希腊字母大写',
  Delta: 'Δ 希腊字母大写',
  Lambda: 'Λ 希腊字母大写',
  Sigma: 'Σ 希腊字母大写',
  Omega: 'Ω 希腊字母大写',
  times: '× 乘法',
  cdot: '· 点乘',
  div: '÷ 除法',
  pm: '± 正负',
  mp: '∓ 负正',
  approx: '≈ 近似',
  neq: '≠ 不等于',
  leq: '≤ 小于等于',
  geq: '≥ 大于等于',
  in: '∈ 属于',
  notin: '∉ 不属于',
  subset: '⊂ 子集',
  subseteq: '⊆ 子集',
  supset: '⊃ 超集',
  supseteq: '⊇ 超集',
  cup: '∪ 并集',
  cap: '∩ 交集',
  setminus: '∖ 差集',
  emptyset: '∅ 空集',
  infty: '∞ 无穷大',
  partial: '∂ 偏微分',
  nabla: '∇ 梯度',
  forall: '∀ 任意',
  exists: '∃ 存在',
  neg: '¬ 非',
  land: '∧ 且',
  lor: '∨ 或',
  to: '→ 到',
  gets: '← 来自',
  rightarrow: '→ 右箭头',
  leftarrow: '← 左箭头',
  leftrightarrow: '↔ 双向箭头',
  Rightarrow: '⇒ 蕴含',
  Leftarrow: '⇐ 蕴含(反)',
  Leftrightarrow: '⇔ 等价',
  uparrow: '↑ 上箭头',
  downarrow: '↓ 下箭头',
  updownarrow: '↕ 上下箭头',
  mapsto: '↦ 映射',
  longmapsto: '⟼ 长映射',
  longrightarrow: '⟶ 长右箭头',
  longleftarrow: '⟵ 长左箭头',
  longleftrightarrow: '⟷ 长双向箭头',
  implies: '⟹ 蕴含',
  iff: '⟺ 当且仅当',
  because: '∵ 因为',
  therefore: '∴ 所以',
  hat: '尖帽符号',
  bar: '上横线(平均)',
  overline: '上横线',
  underline: '下划线',
  vec: '向量箭头',
  dot: '单点(导数)',
  ddot: '双点(二阶导)',
  tilde: '波浪线',
  overbrace: '上花括号',
  underbrace: '下花括号',
  overrightarrow: '上向量箭头',
  overleftarrow: '上左箭头',
  text: '直立文本',
  mathrm: '直立罗马体',
  mathbf: '粗体',
  mathit: '斜体',
  mathsf: '无衬线',
  mathtt: '等宽',
  mathbb: '黑板体',
  mathcal: '花体',
  mathscr: '手写体',
  mathfrak: '哥特体',
  boldsymbol: '粗斜体',
  operatorname: '自定义函数名',
  cancel: '删除线',
  bcancel: '反向删除线',
  xcancel: '交叉删除线',
  boxed: '方框',
  begin: '环境',
  end: '结束环境'
}

// Monaco/VSCode CompletionItemKind 枚举：0 Method, 1 Function, 2 Constructor...
// 13 Value, 14 Constant, 17 Keyword, 28 Snippet
const FUNCTION_KIND = 1 // Function（带参命令，f 图标）
const SNIPPET_KIND = 28 // Snippet（\begin/$$ → 三个方块图标）
const CONSTANT_KIND = 14 // Constant（0 参命令，如 \alpha）

const CACHE = { items: null }

// 构建补全 items（All in One 方式：同 sortText 小写优先，label 带 \）
function getLatexItems() {
  if (CACHE.items) return CACHE.items
  const out = []
  const seen = new Set()
  for (let i = 0; i < DATA.length; i++) {
    const [name, argc] = DATA[i]
    if (name === 'begin' || name === 'end') continue
    if (seen.has(name)) continue // DATA 中跨类别重复（如 lt/barwedge），只保留首个
    seen.add(name)
    const label = '\\' + name
    let insert
    // All in One：0 参 → Constant，带参 → Function
    let kind = CONSTANT_KIND
    if (argc === 0) {
      insert = label
    } else if (argc === 2) {
      insert = label + '{${1}}' + '{${2}}'
      kind = FUNCTION_KIND
    } else {
      insert = label + '{${1}}'
      kind = FUNCTION_KIND
    }
    // sortText：小写优先（对齐 All 的规则）
    let sortText = label.replace(/[a-zA-Z]/g, c => /[a-z]/.test(c) ? '0' + c : '1' + c.toLowerCase())
    out.push({ label, insert, sortText, kind, detail: DETAILS[name] || '', argc })
  }
  CACHE.items = out
  return out
}

// 判断当前是否处于数学环境（仿 mathEnvCheck）
// 返回 'inline' | 'display' | ''
function getMathEnv(model, position) {
  const docText = model.getValue()
  const crtOffset = model.getOffsetAt(position)
  const crtLine = model.getLineContent(position.lineNumber)
  const lineTextBefore = crtLine.substring(0, position.column - 1)
  const lineTextAfter = crtLine.substring(position.column - 1)

  if (/(?:^|[^$])\$(?:[^$].*)??\\\w*$/.test(lineTextBefore) && lineTextAfter.includes('$')) {
    return 'inline'
  }
  const textBefore = docText.substring(0, crtOffset)
  const textAfter = docText.substring(crtOffset)
  const matches = textBefore.match(/\$\$/g)
  if (matches !== null && matches.length % 2 !== 0 && textAfter.includes('$$')) {
    return 'display'
  }
  return ''
}

// 判断光标是否在代码围栏内
function inCodeFence(model, position) {
  const value = model.getValue()
  const offset = model.getOffsetAt(position)
  const lines = value.split('\n')
  let fence = null
  let consumed = 0
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l]
    const nextConsumed = consumed + line.length + 1
    const isTargetLine = nextConsumed > offset
    if (isTargetLine) return fence !== null
    if (fence) {
      if (line.trimStart().startsWith(fence)) fence = null
    } else {
      const m = line.trimStart().match(/^(`{3,}|~{3,})/)
      if (m) fence = m[1]
    }
    consumed = nextConsumed
  }
  return fence !== null
}

function buildLatexSuggestions(model, position) {
  const line = model.getLineContent(position.lineNumber)
  const word = model.getWordUntilPosition(position)

  // range 起点：若已输入 \al 之类，从 \ 开始替换
  let startColumn
  if (word && word.word) {
    const beforeWord = line.slice(0, word.startColumn - 1)
    startColumn = beforeWord.endsWith('\\') ? word.startColumn - 1 : word.startColumn
  } else {
    startColumn = Math.max(1, position.column - 1)
  }

  const range = {
    startLineNumber: position.lineNumber,
    startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  }

  const items = getLatexItems()
  const list = []

  // \begin{…} 环境补全（All 方式：snippet 带环境选择）
  const beginItem = {
    label: '\\begin{env}',
    detail: 'KaTeX 环境（matrix / cases / align 等）',
    insert: '\\begin{' + '${1|' + ENVS.join(',') + '|}}' + '\n\t$2\n\\end{$1}',
    sortText: '0',
    kind: SNIPPET_KIND
  }
  list.push(buildRawSuggestion(beginItem, range))

  for (const it of items) {
    const s = {
      label: it.label,
      detail: it.detail,
      insertText: it.insert,
      insertTextRules: it.argc > 0 ? 4 : 0,
      // Monaco 用覆盖区间的字符（含 \）做过滤，filterText 必须以 \ 开头
      filterText: it.label,
      sortText: it.sortText,
      kind: it.kind,
      range
    }
    list.push(s)
  }
  return list

  function buildRawSuggestion(it, rng) {
    return {
      label: it.label,
      detail: it.detail,
      insertText: it.insert,
      insertTextRules: it.kind === SNIPPET_KIND ? 4 : 0,
      filterText: it.label,
      sortText: it.sortText,
      kind: it.kind,
      range: rng
    }
  }
}

function buildDollarSuggestions(position) {
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  }
  return [
    {
      label: '$$ 块级公式',
      detail: '闭合为 $$…$$ 并进入数学模式',
      kind: SNIPPET_KIND,
      insertText: '\n${0}\n\\$\\$',
      insertTextRules: 4,
      range,
      sortText: '0000',
      command: { id: 'editor.action.triggerSuggest', title: '' }
    },
    {
      label: '$ 行内公式',
      detail: '闭合为 $…$',
      kind: SNIPPET_KIND,
      insertText: ' ${0} \\$',
      insertTextRules: 4,
      range,
      sortText: '0001'
    }
  ]
}

export function registerMarkdownMathCompletion(monaco) {
  monaco.languages.registerCompletionItemProvider('markdown', {
    triggerCharacters: ['$', '\\'],
    provideCompletionItems(model, position, context) {
      if (inCodeFence(model, position)) return { suggestions: [] }
      const line = model.getLineContent(position.lineNumber)
      const pre = line.slice(0, position.column - 1)

      // 1) 输入 $$ → 自动闭合为块级公式，立即弹出补全
      if (context.triggerCharacter === '$' && pre.endsWith('$$')) {
        return { suggestions: buildDollarSuggestions(position) }
      }

      // 2) 按下 \（奇数个反斜杠）→ KaTeX 命令补全（仅数学环境 $$/$ 内触发）
      if (context.triggerCharacter === '\\') {
        const matches = pre.match(/\\+$/)
        if (matches && matches[0].length % 2 !== 0) {
          if (getMathEnv(model, position) === '') return { suggestions: [] }
          return { suggestions: buildLatexSuggestions(model, position) }
        }
      }

      // 3) 已输入 \ 后继续输入字母（如 \alp）→ 保持补全过滤（仅数学环境）
      const word = model.getWordUntilPosition(position)
      if (word && word.word) {
        const beforeWord = line.slice(0, word.startColumn - 1)
        if (beforeWord.endsWith('\\')) {
          if (getMathEnv(model, position) === '') return { suggestions: [] }
          return { suggestions: buildLatexSuggestions(model, position) }
        }
      }

      return { suggestions: [] }
    }
  })
}