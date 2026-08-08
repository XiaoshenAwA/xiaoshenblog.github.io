import { TypstProject } from '@vedivad/typst-web-service'
import * as Comlink from 'comlink'
import { zhTypstMsg } from './typst-msg.js'

let project = null
let projectReady = false
let initPromise = null
let monaco = null
let editor = null
let unsubCompile = null
let basePath = (window.__CONFIG__ && window.__CONFIG__.BASE_PATH) || ''
const entryPath = '/main.typ'

const FONT_PATHS = [
  'fonts/NotoSerifCJKsc-Regular.otf',
  'fonts/Roboto-Regular.ttf',
  'fonts/InriaSerif-Regular.ttf',
  'fonts/InriaSerif-Bold.ttf',
  'fonts/InriaSerif-Italic.ttf',
  'fonts/InriaSerif-BoldItalic.ttf',
  'fonts/DejaVuSansMono.ttf',
  'fonts/DejaVuSansMono-Bold.ttf',
  'fonts/LibertinusSerif-Regular.otf',
  'fonts/LibertinusSerif-Bold.otf',
  'fonts/LibertinusSerif-Italic.otf',
  'fonts/NewCM10-Regular.otf',
  'fonts/NewCMMath-Regular.otf'
]

export function isTypstLspReady() {
  return projectReady
}

async function loadTypstenWasm() {
  const base = (window.__CONFIG__ && window.__CONFIG__.BASE_PATH) || ''
  let res = await fetch(base + '/assets/typsten_bg.wasm.gz')
  let gzipped = true
  if (!res.ok) {
    res = await fetch(base + '/assets/typsten_bg.wasm')
    gzipped = false
  }
  if (!res.ok) throw new Error('Failed to load typsten wasm: HTTP ' + res.status)
  let bytes = new Uint8Array(await res.arrayBuffer())
  if (gzipped && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return bytes
}

export function initTypstLsp() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const worker = new Worker(new URL('./typsten-lsp-worker.js', import.meta.url), { type: 'module' })
      const engine = Comlink.wrap(worker)
      const wasmBytes = await loadTypstenWasm()
      await engine.init(wasmBytes)
      project = new TypstProject(engine, worker, {
        entry: entryPath,
        autoCompile: { debounceMs: 600, maxWaitMs: 3000 }
      })
      await engine.setEntry(project.entry)
      for (const f of FONT_PATHS) {
        try {
          const resp = await fetch(basePath + '/' + f)
          if (resp.ok) {
            const buf = await resp.arrayBuffer()
            await project.addFont(new Uint8Array(buf))
          }
        } catch {}
      }
      projectReady = true
      console.log('[TypstLSP] engine ready')
      if (editor) {
        syncEditorContent()
        registerDiagnosticsHandler()
      }
    } catch (e) {
      console.warn('[TypstLSP] init failed:', e)
      initPromise = null
    }
  })()
  return initPromise
}

function syncEditorContent() {
  if (!project || !editor) return
  project.setText(entryPath, editor.getValue()).catch(() => {})
}

export function registerTypstLspFeatures(m, ed) {
  monaco = m
  editor = ed
  registerCompletionProvider()
  registerHoverProvider()
  registerFormattingProvider()
  editor.onDidChangeModelContent(() => syncEditorContent())
  initTypstLsp()
}

// --- offset / position 换算 ---
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function byteToCharOffset(text, byteOffset) {
  if (byteOffset <= 0) return 0
  const bytes = encoder.encode(text)
  if (byteOffset >= bytes.length) return text.length
  return decoder.decode(bytes.subarray(0, byteOffset)).length
}

function positionToOffset(model, position) {
  const lines = model.getValue().split('\n')
  let offset = 0
  for (let i = 0; i < position.lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  offset += position.column - 1
  return offset
}

function offsetToPosition(model, offset) {
  const before = model.getValue().substring(0, offset)
  const lines = before.split('\n')
  return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 }
}

const COMPLETION_KIND_MAP = {
  func: 0,
  type: 1,
  constant: 3,
  param: 5,
  syntax: 1,
  path: 17,
  package: 17,
  label: 1,
  font: 1,
  symbol: 12
}

function registerCompletionProvider() {
  monaco.languages.registerCompletionItemProvider('typst', {
    triggerCharacters: ['.', '(', '#', ':', '@', '"', '/'],
    async provideCompletionItems(model, position, context) {
      if (!projectReady || !project) return { suggestions: [] }
      try {
        const offset = positionToOffset(model, position)
        const source = model.getValue()
        const result = await project.completion(entryPath, source, offset, context.triggerKind === 1)
        if (!result || !result.completions) return { suggestions: [] }
        const fromCharOffset = byteToCharOffset(source, result.from)
        const suggestions = result.completions.map(item => ({
          label: item.label,
          kind: COMPLETION_KIND_MAP[item.kind] || 1,
          insertText: item.apply || item.label,
          detail: item.detail,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column - (offset - fromCharOffset),
            endLineNumber: position.lineNumber,
            endColumn: position.column
          }
        }))
        return { suggestions }
      } catch (e) {
        console.warn('[TypstLSP] completion error:', e)
        return { suggestions: [] }
      }
    }
  })
}

function registerHoverProvider() {
  monaco.languages.registerHoverProvider('typst', {
    async provideHover(model, position) {
      if (!projectReady || !project) return null
      try {
        const offset = positionToOffset(model, position)
        const source = model.getValue()
        const hover = await project.hover(entryPath, source, offset)
        if (!hover) return null
        const value = hover.kind === 'code'
          ? { value: hover.value, language: 'typst' }
          : hover.value
        return {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          contents: [{ value }]
        }
      } catch (e) {
        console.warn('[TypstLSP] hover error:', e)
        return null
      }
    }
  })
}

function registerFormattingProvider() {
  monaco.languages.registerDocumentFormattingEditProvider('typst', {
    async provideDocumentFormattingEdits(model) {
      if (!projectReady || !project) return []
      try {
        const source = model.getValue()
        const formatted = await project.format(entryPath, source)
        if (!formatted || formatted === source) return []
        return [{ range: model.getFullModelRange(), text: formatted }]
      } catch (e) {
        console.warn('[TypstLSP] format error:', e)
        return []
      }
    }
  })
}

function registerDiagnosticsHandler() {
  if (!project || unsubCompile) return
  unsubCompile = project.onCompile(result => {
    if (!result || !result.diagnostics) return
    const model = editor && editor.getModel()
    if (!model) return
    const markers = result.diagnostics.map(diag => {
      let range = null
      if (diag.location) {
        const loc = diag.location
        const startPos = offsetToPosition(model, loc.start || 0)
        const endPos = offsetToPosition(model, (loc.end != null ? loc.end : (loc.start || 0)))
        range = {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column
        }
      }
      if (!range) {
        range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }
      }
      const raw = (diag.message || '') + (diag.hints && diag.hints.length ? '\n' + diag.hints.join('\n') : '')
      return {
        severity: diag.severity === 'error' ? 8 : diag.severity === 'warning' ? 4 : 2,
        message: zhTypstMsg(raw),
        ...range
      }
    })
    monaco.editor.setModelMarkers(model, 'typst', markers)
  })
}
