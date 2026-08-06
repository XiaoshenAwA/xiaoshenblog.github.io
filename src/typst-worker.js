let basePath = ''
let $typst = null
let initPromise = null

const FONT_RE = /^https:\/\/cdn\.jsdelivr\.net\/gh\/typst\/typst(?:-dev)?-assets@[^/]+\/files\/fonts\//
const PKG_RE = /^https:\/\/packages\.typst\.org\/preview\//

function rewrite(url) {
  if (FONT_RE.test(url)) return basePath + '/fonts/' + url.replace(FONT_RE, '')
  if (PKG_RE.test(url)) return basePath + '/typst-packages/' + url.replace(PKG_RE, '')
  return url
}

function patchFetch() {
  if (self.__typstFetchPatched) return
  const origFetch = self.fetch
  self.fetch = function(input, init) {
    let url = typeof input === 'string' ? input : (input && (input.url || '')) || ''
    if (typeof url === 'string' && (FONT_RE.test(url) || PKG_RE.test(url))) {
      return origFetch.call(this, rewrite(url), init)
    }
    return origFetch.apply(this, arguments)
  }
  self.__typstFetchPatched = true
}

function patchXHR() {
  if (self.__typstXhrPatched) return
  const origOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (FONT_RE.test(url) || PKG_RE.test(url))) {
      url = rewrite(url)
    }
    return origOpen.call(this, method, url, ...args)
  }
  self.__typstXhrPatched = true
}

async function loadCompilerWasm() {
  let res = await fetch(basePath + '/wasm/typst_ts_web_compiler_bg.wasm.gz')
  let gzipped = true
  if (!res.ok) {
    res = await fetch(basePath + '/wasm/typst_ts_web_compiler_bg.wasm')
    gzipped = false
  }
  if (!res.ok) throw new Error('Failed to load compiler wasm: HTTP ' + res.status)
  let bytes = new Uint8Array(await res.arrayBuffer())
  if (gzipped && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return bytes
}

async function getTypst() {
  if ($typst) return $typst
  if (!initPromise) {
    initPromise = (async () => {
      patchFetch()
      patchXHR()
      const mod = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet')
      const { $typst: t, TypstSnippet } = mod
      t.use(
        TypstSnippet.fetchPackageRegistry(),
        TypstSnippet.preloadFontAssets({ assets: ['text', 'cjk', 'emoji'] })
      )
      t.setCompilerInitOptions({ getModule: loadCompilerWasm })
      t.setRendererInitOptions({ getModule: () => basePath + '/wasm/typst_ts_renderer_bg.wasm' })
      $typst = t
    })()
  }
  await initPromise
  return $typst
}

// 本地字体资源里只收录了 CJK 的 Serif 家族(NotoSerifCJKsc-*)。
// 如果用户文档把缺失的 "Noto Sans CJK SC" 等字体放在字体链前面，
// 该字体请求 404 后回退链也会不稳定,导致中文(如"苯")渲染异常。
// 这里在编译前把这类缺失家族名映射到已预加载的 Noto Serif CJK SC,
// 保证任何情况下中文都能命中可用字体。
const CJK_FALLBACK_FAMILY = "Noto Serif CJK SC";
const MISSING_CJK_RE = /["']Noto Sans CJK(?: SC| TC| JP| KR)?["']/

function normalizeMissingFonts(src) {
  if (!src || !MISSING_CJK_RE.test(src)) return src
  return src.replace(/["']Noto Sans CJK(?: SC| TC| JP| KR)?["']/g, JSON.stringify(CJK_FALLBACK_FAMILY))
}

self.onmessage = async (e) => {
  const msg = e.data
  const id = msg && msg.id
  try {
    if (!msg || msg.type === 'init') {
      basePath = (msg && msg.basePath) || ''
      self.postMessage({ id, ok: true })
      return
    }
    if (msg.type === 'compile') {
      basePath = msg.basePath || ''
      const t = await getTypst()
      const compiler = await t.getCompiler()
      compiler.addSource('/main.typ', normalizeMissingFonts(msg.src))
      const res = await compiler.compile({
        mainFilePath: '/main.typ',
        format: 1,
        diagnostics: 'none'
      })
      if (res && res.result && res.result.length) {
        const bytes = res.result
        if (bytes.length > 50 * 1024 * 1024) {
          self.postMessage({ id, ok: false, error: 'PDF_TOO_LARGE' })
          return
        }
        const copy = bytes.slice()
        self.postMessage({ id, ok: true, data: copy.buffer }, [copy.buffer])
        return
      }
      self.postMessage({ id, ok: false, error: 'COMPILE_FAILED', detail: JSON.stringify((res && res.diagnostics) || 'no output') })
      return
    }
    self.postMessage({ id, ok: false, error: 'UNKNOWN_MSG' })
  } catch (err) {
    self.postMessage({ id, ok: false, error: 'EXCEPTION', detail: String((err && err.message) || err) })
  }
}
