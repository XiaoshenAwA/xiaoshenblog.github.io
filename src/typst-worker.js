let basePath = ''
let $typst = null
let initPromise = null

const FONT_RE = /^https:\/\/cdn\.jsdelivr\.net\/gh\/typst\/typst-assets@[^/]+\/files\/fonts\//
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

async function getTypst() {
  if ($typst) return $typst
  if (!initPromise) {
    initPromise = (async () => {
      patchFetch()
      const { $typst: t } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet')
      t.setCompilerInitOptions({ getModule: () => basePath + '/wasm/typst_ts_web_compiler_bg.wasm' })
      t.setRendererInitOptions({ getModule: () => basePath + '/wasm/typst_ts_renderer_bg.wasm' })
      $typst = t
    })()
  }
  await initPromise
  return $typst
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
      compiler.addSource('/main.typ', msg.src)
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
