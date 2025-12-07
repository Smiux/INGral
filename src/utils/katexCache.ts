import katex from 'katex';

/**
 * KaTeXCache class for caching rendered KaTeX formulas
 * This improves performance by avoiding repeated rendering of the same formulas
 */
export class KaTeXCache {
  private cache: Map<string, { html: string; options: katex.KatexOptions; timestamp: number }>;
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRenderTime: 0
  };
  // 常用公式预缓存列表
  private commonFormulas = [
    'E = mc^2',
    'a^2 + b^2 = c^2',
    '\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}',
    '\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}',
    '\text{Spec}(R)',
    '\text{Spec}(\mathcal{O}_K)',
    '\mathcal{O}_K',
    '\mathbb{Z}',
    '\mathbb{Q}',
    '\mathbb{R}',
    '\mathbb{C}',
    '\mathbb{Q}(p)',
    'H^n_{\text{mot}}(X,\mathbb{Q}(p))',
    'H^n_{\text{dR}}(X/\mathbb{C})',
    'H^{n-1}_{\text{sing}}(X(\mathbb{C}),\mathbb{Q}(p))^\vee',
    '\text{reg}_B: H^n_{\text{mot}}(X,\mathbb{Q}(p)) \to H^n_{\text{dR}}(X/\mathbb{C}) \oplus H^{n-1}_{\text{sing}}(X(\mathbb{C}),\mathbb{Q}(p))^\vee',
    '\text{Spec}(\mathcal{O}_{K,S})',
    '\text{Gal}(\overline{K}/K)',
    '\text{Ext}^i_R(M,N)',
    '\Tor_i^R(M,N)',
    '\text{Hom}_R(M,N)',
    '\text{Ker}(f)',
    '\text{Coker}(f)',
    '\text{Im}(f)',
    '\text{dim}_k V',
    '\text{rank}(A)',
    '\text{det}(A)',
    '\text{tr}(A)',
    '\text{ord}_p(a)',
    '\text{val}_p(a)',
    '\text{deg}(f)',
    '\text{codim}(Y,X)',
    '\text{card}(S)',
    '\text{vol}(M)',
    '\text{Pic}(X)',
    '\text{Div}(X)',
    '\text{Jac}(C)',
    '\text{CH}^i(X)',
    'K_0(X)',
    '\text{Tors}(M)',
    '\text{étale}',
    '\text{Norm}_{L/K}(a)',
    '\text{Tr}_{L/K}(a)',
    '\text{Disc}(K)',
    '\text{Cl}(K)',
    '\text{Br}(K)',
    '\Rightarrow',
    '\Leftrightarrow',
    '\equiv',
    '\mod',
    '\hookrightarrow',
    '\twoheadrightarrow',
    '\cong',
    '\approx',
    '\sim',
    '\sim_{\text{iso}}',
    '\sim_{\text{homotopy}}',
    '\sim_{\text{equiv}}',
    '\oplus',
    '\otimes',
    '\times',
    '\prod',
    '\coprod',
    '\bigoplus',
    '\bigotimes',
    '\bigcap',
    '\bigcup',
    '\lim_{n \to \infty}',
    '\lim_{\leftarrow n}',
    '\lim_{\rightarrow n}',
    '\inf',
    '\sup',
    '\max',
    '\min',
    '\partial',
    '\nabla',
    '\Delta',
    '\nabla \cdot \mathbf{F}',
    '\nabla \times \mathbf{F}',
    '\nabla^2',
    '\Delta f',
    '\partial f / \partial x',
    '\frac{\partial f}{\partial x}',
    '\frac{d}{dx} f(x)',
    '\int f(x) dx',
    '\int_a^b f(x) dx',
    '\iint_D f(x,y) dx dy',
    '\iiint_E f(x,y,z) dx dy dz',
    '\oint_C \mathbf{F} \cdot d\mathbf{r}',
    '\oiint_S \mathbf{F} \cdot d\mathbf{S}',
    '\sum_{i=1}^n a_i',
    '\prod_{i=1}^n a_i',
    '\sum_{n=1}^{\infty} a_n',
    '\prod_{n=1}^{\infty} (1 + a_n)',
    '\binom{n}{k}',
    '\choose',
    '\atop',
    '\frac{n!}{k!(n-k)!}',
    '\Gamma(z)',
    '\zeta(s)',
    '\\xi(s)',
    '\eta(s)',
    '\lambda(s)',
    '\mu(n)',
    '\phi(n)',
    '\sigma(n)',
    '\tau(n)',
    '\pi(x)',
    '\text{li}(x)',
    '\text{erf}(x)',
    '\text{erfc}(x)',
    '\text{B}(x,y)',
    '\text{Li}_s(x)',
    '\text{W}(x)',
    '\text{Ai}(x)',
    '\text{Bi}(x)',
    '\text{Si}(x)',
    '\text{Ci}(x)',
    '\text{Fi}(x)',
    '\text{Hi}(x)',
    '\text{Gi}(x)',
    '\text{Ti}(x)',
    '\text{Vi}(x)',
    '\text{Yi}(x)',
    '\text{Zi}(x)',
    '\text{Ui}(x)',
    '\text{Ki}(x)',
    '\text{Mi}(x)',
    '\text{Ni}(x)',
    '\text{Pi}(x)',
    '\text{Qi}(x)',
    '\text{Ri}(x)',
    '\text{Si}(x,y)',
    '\text{Ci}(x,y)',
    '\text{Fi}(x,y)',
    '\text{Hi}(x,y)',
    '\text{Gi}(x,y)',
    '\text{Ti}(x,y)',
    '\text{Vi}(x,y)',
    '\text{Yi}(x,y)',
    '\text{Zi}(x,y)',
    '\text{Ui}(x,y)',
    '\text{Ki}(x,y)',
    '\text{Mi}(x,y)',
    '\text{Ni}(x,y)',
    '\text{Pi}(x,y)',
    '\text{Qi}(x,y)',
    '\text{Ri}(x,y)'
  ];

  /**
   * Create a new KaTeXCache instance
   * @param maxSize Maximum number of formulas to cache (default: 1000)
   */
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    // 预热缓存
    this.warmCache();
  }

  /**
   * 预热缓存，预渲染常用公式
   */
  private warmCache(): void {
    this.commonFormulas.forEach(formula => {
      try {
        this.render(formula);
        this.render(formula, { displayMode: true });
      } catch (error) {
        console.warn(`Failed to pre-cache formula '${formula}':`, error);
      }
    });
  }

  /**
   * Render a KaTeX formula, using cache if available
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Rendered HTML string
   */
  render(formula: string, options: katex.KatexOptions = {}): string {
    // 清理公式字符串
    const cleanedFormula = formula.trim();
    if (!cleanedFormula) {
      return '';
    }

    // Create a cache key based on formula and options
    const cacheKey = this.createCacheKey(cleanedFormula, options);

    // Check if formula is already in cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Move to end of map to keep recently used formulas
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, { ...cached, timestamp: Date.now() });
        this.stats.hits++;
        return cached.html;
      }
    }

    this.stats.misses++;
    const startTime = performance.now();

    // 默认配置，启用更多LaTeX功能
    const defaultOptions: katex.KatexOptions = {
      displayMode: false,
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false, // 放宽严格性，允许更多非标准LaTeX语法
      trust: true, // 启用信任模式，允许渲染更多LaTeX命令
      macros: {
        // 添加常用宏定义
        '\\text': '\\mathrm{#1}',
        '\\mathcal': '\\mathscr{#1}',
        '\\mathfrak': '\\mathfrak{#1}',
        '\\mathbb': '\\mathbb{#1}',
        '\\mathbf': '\\mathbf{#1}',
        '\\boldsymbol': '\\boldsymbol{#1}',
        // 基本数学符号
        '\\Spec': '\\text{Spec}',
        '\\Gal': '\\text{Gal}',
        '\\GL': '\\text{GL}',
        '\\SL': '\\text{SL}',
        '\\SO': '\\text{SO}',
        '\\Sp': '\\text{Sp}',
        '\\Hom': '\\text{Hom}',
        '\\End': '\\text{End}',
        '\\Aut': '\\text{Aut}',
        '\\Id': '\\text{Id}',
        '\\Ker': '\\text{Ker}',
        '\\Coker': '\\text{Coker}',
        '\\Img': '\\text{Im}',
        '\\Coimg': '\\text{Coimg}',
        '\\Ext': '\\text{Ext}',
        '\\Tor': '\\text{Tor}',
        '\\Nat': '\\text{Nat}',
        // 简化同调群和上同调群的写法
        '\\HH': '\\text{HH}',
        '\\HC': '\\text{HC}',
        '\\HN': '\\text{HN}',
        '\\HP': '\\text{HP}',
        '\\text{mot}': '\\text{mot}',
        '\\text{dR}': '\\text{dR}',
        '\\text{sing}': '\\text{sing}',
        '\\text{ét}': '\\text{ét}',
        '\\text{reg}': '\\text{reg}',
        '\\text{alg}': '\\text{alg}',
        '\\text{top}': '\\text{top}',
        '\\text{flat}': '\\text{flat}',
        '\\text{proj}': '\\text{proj}',
        '\\text{inj}': '\\text{inj}',
        '\\text{surj}': '\\text{surj}',
        '\\text{exact}': '\\text{exact}',
        // 代数几何相关宏定义
        '\\Pic': '\\text{Pic}',
        '\\Div': '\\text{Div}',
        '\\Jac': '\\text{Jac}',
        '\\CH': '\\text{CH}',
        '\\K': 'K',
        '\\K0': 'K_0',
        '\\K1': 'K_1',
        '\\K2': 'K_2',
        '\\Tors': '\\text{Tors}',
        '\\étale': '\\text{étale}',
        '\\smooth': '\\text{smooth}',
        '\\proper': '\\text{proper}',
        '\\separated': '\\text{separated}',
        '\\finite': '\\text{finite}',
        '\\flat': '\\text{flat}',
        '\\projective': '\\text{projective}',
        '\\affine': '\\text{affine}',
        '\\irreducible': '\\text{irreducible}',
        '\\reduced': '\\text{reduced}',
        '\\normal': '\\text{normal}',
        '\\regular': '\\text{regular}',
        '\\rational': '\\text{rational}',
        '\\elliptic': '\\text{elliptic}',
        '\\hyperelliptic': '\\text{hyperelliptic}',
        '\\curves': '\\text{Curves}',
        '\\surfaces': '\\text{Surfaces}',
        // 代数数论相关宏定义
        '\\Norm': '\\text{Norm}',
        '\\Tr': '\\text{Tr}',
        '\\Disc': '\\text{Disc}',
        '\\Cl': '\\text{Cl}',
        '\\Br': '\\text{Br}',
        '\\Galois': '\\text{Galois}',
        '\\Frob': '\\text{Frob}',
        '\\Artin': '\\text{Artin}',
        '\\Beilinson': '\\text{Beilinson}',
        '\\Birch': '\\text{Birch}',
        '\\Dyer': '\\text{Dyer}',
        '\\Fontaine': '\\text{Fontaine}',
        '\\Kato': '\\text{Kato}',
        '\\Mazur': '\\text{Mazur}',
        '\\Soulé': '\\text{Soulé}',
        '\\Swinnerton': '\\text{Swinnerton}',
        '\\Tate': '\\text{Tate}',
        '\\Weil': '\\text{Weil}',
        // 范畴论相关宏定义
        '\\Cat': '\\text{Cat}',
        '\\Set': '\\text{Set}',
        '\\Grp': '\\text{Grp}',
        '\\Ab': '\\text{Ab}',
        '\\Ring': '\\text{Ring}',
        '\\CRing': '\\text{CRing}',
        '\\Mod': '\\text{Mod}',
        '\\Vect': '\\text{Vect}',
        '\\Sch': '\\text{Sch}',
        '\\Var': '\\text{Var}',
        '\\Top': '\\text{Top}',
        '\\HoTop': '\\text{HoTop}',
        '\\D': '\\mathcal{D}',
        '\\Db': '\\mathcal{D}^b',
        '\\Dplus': '\\mathcal{D}^+',
        '\\Dminus': '\\mathcal{D}^-',
        '\\Dperf': '\\mathcal{D}^{perf}',
        // 分析相关宏定义
        '\\Re': '\\text{Re}',
        '\\Im': '\\text{Im}',
        '\\arg': '\\arg',
        '\\Log': '\\text{Log}',
        '\\exp': '\\exp',
        '\\sin': '\\sin',
        '\\cos': '\\cos',
        '\\tan': '\\tan',
        '\\cot': '\\cot',
        '\\sec': '\\sec',
        '\\csc': '\\csc',
        '\\sinh': '\\sinh',
        '\\cosh': '\\cosh',
        '\\tanh': '\\tanh',
        '\\coth': '\\coth',
        '\\sech': '\\sech',
        '\\csch': '\\csch',
        '\\arcsin': '\\arcsin',
        '\\arccos': '\\arccos',
        '\\arctan': '\\arctan',
        '\\arccot': '\\arccot',
        '\\arcsec': '\\arcsec',
        '\\arccsc': '\\arccsc',
        '\\arcsinh': '\\arcsinh',
        '\\arccosh': '\\arccosh',
        '\\arctanh': '\\arctanh',
        '\\arccoth': '\\arccoth',
        '\\arcsech': '\\arcsech',
        '\\arccsch': '\\arccsch',
        // 特殊函数
        '\\Gamma': '\\Gamma',
        '\\zeta': '\\zeta',
        '\\xi': '\\xi',
        '\\eta': '\\eta',
        '\\lambda': '\\lambda',
        '\\mu': '\\mu',
        '\\phi': '\\phi',
        '\\sigma': '\\sigma',
        '\\tau': '\\tau',
        '\\pi': '\\pi',
        '\\e': '\\text{e}',
        '\\i': '\\text{i}',
        '\\j': '\\text{j}',
        '\\k': '\\text{k}',
        '\\li': '\\text{li}',
        '\\erf': '\\text{erf}',
        '\\erfc': '\\text{erfc}',
        '\\B': '\\text{B}',
        '\\Li': '\\text{Li}',
        '\\W': '\\text{W}',
        '\\Ai': '\\text{Ai}',
        '\\Bi': '\\text{Bi}',
        '\\Si': '\\text{Si}',
        '\\Ci': '\\text{Ci}',
        '\\Fi': '\\text{Fi}',
        '\\Hi': '\\text{Hi}',
        '\\Gi': '\\text{Gi}',
        '\\Ti': '\\text{Ti}',
        // 运算符
        '\\implies': '\\Rightarrow',
        '\\iff': '\\Leftrightarrow',
        '\\therefore': '\\therefore',
        '\\because': '\\because',
        '\\forall': '\\forall',
        '\\exists': '\\exists',
        '\\nexists': '\\nexists',
        '\\in': '\\in',
        '\\notin': '\\notin',
        '\\subset': '\\subset',
        '\\subseteq': '\\subseteq',
        '\\supset': '\\supset',
        '\\supseteq': '\\supseteq',
        '\\cap': '\\cap',
        '\\cup': '\\cup',
        '\\bigcup': '\\bigcup',
        '\\bigcap': '\\bigcap',
        '\\coprod': '\\coprod',
        '\\prod': '\\prod',
        '\\sum': '\\sum',
        '\\bigoplus': '\\bigoplus',
        '\\bigotimes': '\\bigotimes',
        '\\bigwedge': '\\bigwedge',
        '\\bigvee': '\\bigvee',
        '\\lim': '\\lim',
        '\\liminf': '\\liminf',
        '\\limsup': '\\limsup',
        '\\varliminf': '\\varliminf',
        '\\varlimsup': '\\varlimsup',
        '\\inf': '\\inf',
        '\\sup': '\\sup',
        '\\max': '\\max',
        '\\min': '\\min',
        '\\argmax': '\\arg\\max',
        '\\argmin': '\\arg\\min',
        // 箭头符号
        '\\map': '\\rightarrow',
        '\\mapsto': '\\mapsto',
        '\\hookrightarrow': '\\hookrightarrow',
        '\\twoheadrightarrow': '\\twoheadrightarrow',
        '\\surjective': '\\twoheadrightarrow',
        '\\injective': '\\hookrightarrow',
        '\\isomorphic': '\\cong',
        '\\homeomorphic': '\\cong',
        '\\homotopic': '\\sim',
        '\\equiv': '\\equiv',
        '\\sim': '\\sim',
        '\\approx': '\\approx',
        '\\asymp': '\\asymp',
        '\\propto': '\\propto',
        '\\sim_{\\text{iso}}': '\\sim_{\\text{iso}}',
        '\\sim_{\\text{homotopy}}': '\\sim_{\\text{homotopy}}',
        '\\sim_{\\text{equiv}}': '\\sim_{\\text{equiv}}',
        // 微分和积分符号
        '\\partial': '\\partial',
        '\\nabla': '\\nabla',
        '\\Delta': '\\Delta',
        '\\Box': '\\Box',
        '\\triangle': '\\triangle',
        '\\triangledown': '\\triangledown',
        '\\d': '\\mathrm{d}',
        '\\dx': '\\mathrm{d}x',
        '\\dy': '\\mathrm{d}y',
        '\\dz': '\\mathrm{d}z',
        '\\dt': '\\mathrm{d}t',
        '\\nabla\\cdot': '\\nabla\\cdot',
        '\\nabla\\times': '\\nabla\\times',
        '\\nabla^2': '\\nabla^2',
        // 几何和拓扑
        '\\deg': '\\deg',
        '\\codim': '\\text{codim}',
        '\\dim': '\\dim',
        '\\rank': '\\text{rank}',
        '\\vol': '\\text{vol}',
        '\\area': '\\text{area}',
        '\\length': '\\text{length}',
        '\\card': '\\text{card}',
        '\\dist': '\\text{dist}',
        '\\diam': '\\text{diam}',
        '\\radius': '\\text{radius}',
        '\\diameter': '\\text{diameter}',
        '\\center': '\\text{center}',
        '\\boundary': '\\partial',
        '\\closure': '\\overline{#1}',
        '\\interior': '\\mathring{#1}',
        '\\exterior': '\\text{ext}',
        // 逻辑符号
        '\\land': '\\land',
        '\\lor': '\\lor',
        '\\neg': '\\neg',
        '\\not': '\\not',
        '\\top': '\\top',
        '\\bot': '\\bot',
        '\\vdash': '\\vdash',
        '\\models': '\\models',
        // 其他常用符号
        '\\mod': '\\mod',
        '\\pmod': '\\pmod{#1}',
        '\\ord': '\\text{ord}',
        '\\val': '\\text{val}',
        '\\Res': '\\text{Res}',
        '\\Residue': '\\text{Residue}',
        '\\Trace': '\\text{Trace}',
        '\\Det': '\\text{Det}',
        '\\det': '\\det',
        '\\tr': '\\text{tr}',
        '\\Rank': '\\text{Rank}',
        '\\Nullity': '\\text{Nullity}',
        '\\Kernel': '\\text{Kernel}',
        '\\Image': '\\text{Image}',
        '\\Cokernel': '\\text{Cokernel}',
        '\\Coimage': '\\text{Coimage}',
        '\\Cone': '\\text{Cone}',
        '\\Cylinder': '\\text{Cylinder}',
        '\\Suspension': '\\text{Suspension}',
        '\\LoopSpace': '\\Omega',
        '\\Spectrum': '\\text{Spec}',
        '\\GLn': '\\text{GL}_{n}(#1)',
        '\\SLn': '\\text{SL}_{n}(#1)',
        '\\SOn': '\\text{SO}_{n}(#1)',
        '\\Spn': '\\text{Sp}_{n}(#1)',
        // 简化同调群和上同调群的写法
        '\\H': 'H',
        '\\Hn': 'H^{#1}',
        '\\Hnm': 'H^{#1}_{#2}',
        '\\Hnmp': 'H^{#1}_{#2}(#3,#4)',
        '\\Hnmm': 'H^{#1}_{#2,#3}(#4,#5)',
        '\\Extn': '\\text{Ext}^{#1}',
        '\\Torn': '\\text{Tor}_{#1}',
        // 代数几何特定符号
        '\\mathcal{O}': '\\mathcal{O}',
        '\\mathcal{O}_X': '\\mathcal{O}_X',
        '\\mathcal{O}_{X,x}': '\\mathcal{O}_{X,x}',
        '\\mathfrak{m}': '\\mathfrak{m}',
        '\\mathfrak{m}_x': '\\mathfrak{m}_x',
        '\\mathfrak{p}': '\\mathfrak{p}',
        '\\mathfrak{q}': '\\mathfrak{q}',
        '\\mathfrak{a}': '\\mathfrak{a}',
        '\\mathfrak{b}': '\\mathfrak{b}',
        '\\mathfrak{c}': '\\mathfrak{c}',
        '\\mathfrak{d}': '\\mathfrak{d}',
        '\\mathfrak{e}': '\\mathfrak{e}',
        '\\mathfrak{f}': '\\mathfrak{f}',
        '\\mathfrak{g}': '\\mathfrak{g}',
        '\\mathfrak{h}': '\\mathfrak{h}',
        '\\mathfrak{i}': '\\mathfrak{i}',
        '\\mathfrak{j}': '\\mathfrak{j}',
        '\\mathfrak{k}': '\\mathfrak{k}',
        '\\mathfrak{l}': '\\mathfrak{l}',
        '\\mathfrak{n}': '\\mathfrak{n}',
        '\\mathfrak{o}': '\\mathfrak{o}',
        '\\mathfrak{r}': '\\mathfrak{r}',
        '\\mathfrak{s}': '\\mathfrak{s}',
        '\\mathfrak{t}': '\\mathfrak{t}',
        '\\mathfrak{u}': '\\mathfrak{u}',
        '\\mathfrak{v}': '\\mathfrak{v}',
        '\\mathfrak{w}': '\\mathfrak{w}',
        '\\mathfrak{x}': '\\mathfrak{x}',
        '\\mathfrak{y}': '\\mathfrak{y}',
        '\\mathfrak{z}': '\\mathfrak{z}',
        // 基本集合
        '\\Z': '\\mathbb{Z}',
        '\\N': '\\mathbb{N}',
        '\\Q': '\\mathbb{Q}',
        '\\R': '\\mathbb{R}',
        '\\C': '\\mathbb{C}',
        '\\bbH': '\\mathbb{H}',
        '\\F': '\\mathbb{F}',
        '\\Fq': '\\mathbb{F}_{#1}',
        '\\Zp': '\\mathbb{Z}_{#1}',
        '\\Qp': '\\mathbb{Q}_{#1}',
        '\\Op': '\\mathcal{O}_{#1}',
        '\\Ok': '\\mathcal{O}_K',
        '\\O_{K,S}': '\\mathcal{O}_{K,S}',
        '\\Gal_K': '\\text{Gal}(\\overline{K}/K)',
        '\\Gal_{L/K}': '\\text{Gal}(L/K)',
        // 简化复杂公式的写法
        '\\SpecOk': '\\text{Spec}(\\mathcal{O}_K)',
        '\\SpecOps': '\\text{Spec}(\\mathcal{O}_{K,S})',
        '\\Hn_mot': 'H^{#1}_{\\text{mot}}',
        '\\Hn_dR': 'H^{#1}_{\\text{dR}}',
        '\\Hn_sing': 'H^{#1}_{\\text{sing}}',
        '\\Hn_et': 'H^{#1}_{\\text{ét}}',
        '\\reg_B': '\\text{reg}_B',
        '\\text{reg}_B': '\\text{reg}_B'
      },
      ...options
    };

    // Render formula if not in cache
    try {
      const html = katex.renderToString(cleanedFormula, defaultOptions);
      this.stats.totalRenderTime += performance.now() - startTime;
      
      // Add to cache with LRU policy
      this.addToCache(cacheKey, html, defaultOptions);
      
      return html;
    } catch (error) {
      console.error('Error rendering KaTeX formula:', error);
      // Return a fallback if rendering fails
      return `<span class="text-red-500 dark:text-red-400">Error rendering formula: ${cleanedFormula}</span>`;
    }
  }

  /**
   * Create a cache key from formula and options
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Cache key string
   */
  private createCacheKey(formula: string, options: katex.KatexOptions): string {
    // Include only relevant options in cache key
    const relevantOptions = {
      displayMode: options.displayMode,
      throwOnError: options.throwOnError,
      errorColor: options.errorColor,
      strict: options.strict,
      trust: options.trust,
      // 只包含有差异的宏定义
      macros: options.macros && Object.keys(options.macros).length > 0 ? options.macros : undefined
    };
    
    // 生成固定长度的哈希键，优化内存使用
    const baseKey = `${formula}__${JSON.stringify(relevantOptions)}`;
    // 使用简单的哈希算法生成固定长度的键
    let hash = 0;
    for (let i = 0; i < baseKey.length; i++) {
      const char = baseKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${hash.toString(16)}__${baseKey.length}`;
  }

  /**
   * Add a rendered formula to the cache with LRU policy
   * @param key Cache key
   * @param html Rendered HTML
   * @param options KaTeX options
   */
  private addToCache(key: string, html: string, options: katex.KatexOptions): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, { html, options, timestamp: Date.now() });
  }

  /**
   * Evict the oldest entries from cache
   * @param count Number of entries to evict (default: 1)
   */
  private evictOldest(count = 1): void {
    // 按时间戳排序，移除最旧的条目
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const entry = entries[i];
      if (entry && entry[0]) {
        this.cache.delete(entry[0]);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    // 重置统计数据
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRenderTime: 0
    };
    // 重新预热缓存
    this.warmCache();
  }

  /**
   * Get the current cache size
   * @returns Number of formulas in cache
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Remove a specific formula from the cache
   * @param formula LaTeX formula string
   * @param options KaTeX options
   */
  remove(formula: string, options: katex.KatexOptions = {}): void {
    const cleanedFormula = formula.trim();
    const cacheKey = this.createCacheKey(cleanedFormula, options);
    this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRenderTime: 0
    };
  }

  /**
   * 预缓存指定的公式列表
   * @param formulas 要预缓存的公式列表
   */
  preCache(formulas: string[]): void {
    formulas.forEach(formula => {
      try {
        this.render(formula);
      } catch (error) {
        console.warn(`Failed to pre-cache formula '${formula}':`, error);
      }
    });
  }
}

// Create a singleton instance of KaTeXCache
export const katexCache = new KaTeXCache();

// 添加性能监控
if (process.env.NODE_ENV === 'development') {
  // 定期记录缓存统计
  setInterval(() => {
    const stats = katexCache.getStats();
    const hitRate = stats.hits + stats.misses > 0 
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) 
      : 0;
    console.log(`[KaTeX Cache] Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${hitRate}%, Evictions: ${stats.evictions}`);
  }, 30000); // 每30秒记录一次
}
