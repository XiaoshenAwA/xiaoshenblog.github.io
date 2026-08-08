// src/typsten-worker.ts
import * as Comlink from "comlink";

// ../typsten/pkg/typsten.js
var Project = class {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    ProjectFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_project_free(ptr, 0);
  }
  /**
   * Register a font file (TTF/OTF, or a TTC collection) for compilation,
   * extending the embedded default fonts with families the engine does not
   * bundle (e.g. CJK or a custom font). Returns the canonical family name of
   * each added face (the name Typst groups and matches by).
   * @param {Uint8Array} bytes
   * @returns {string[]}
   */
  add_font(bytes) {
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_add_font(this.__wbg_ptr, ptr0, len0);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
  }
  /**
   * Drop every font added via `add_font`, resetting to the embedded defaults.
   * The engine has no per-font removal, so to remove a font, call this and
   * re-`add_font` the ones to keep.
   */
  clear_fonts() {
    wasm.project_clear_fonts(this.__wbg_ptr);
  }
  /**
   * Resolve a click at `(x, y)` points on page `index` of the last compiled
   * document: a source location to jump the editor to, an internal link target
   * to scroll the preview to, or a URL. `None` if nothing compiled, the page is
   * out of range, or the click hit nothing actionable.
   * @param {number} index
   * @param {number} x
   * @param {number} y
   * @returns {ClickJump | undefined}
   */
  click_jump(index, x, y) {
    const ret = wasm.project_click_jump(this.__wbg_ptr, index, x, y);
    return ret;
  }
  /**
   * Compile the project, returning the rendered SVG and typed diagnostics.
   *
   * A query, so `&self`: the `Source` cache it touches is interior-mutable.
   * @returns {CompileResult}
   */
  compile() {
    const ret = wasm.project_compile(this.__wbg_ptr);
    return ret;
  }
  /**
   * Completions at a byte-offset `cursor` in `path`. `explicit` is `true`
   * when the user explicitly requested completion (e.g. Ctrl-Space).
   * @param {string} path
   * @param {number} cursor
   * @param {boolean} explicit
   * @returns {CompletionResponse | undefined}
   */
  complete(path, cursor, explicit) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_complete(this.__wbg_ptr, ptr0, len0, cursor, explicit);
    return ret;
  }
  /**
   * Export the last compiled document as PDF bytes, or `None` if nothing has
   * compiled yet. Returns a `Uint8Array` across the boundary.
   * @returns {Uint8Array | undefined}
   */
  export_pdf() {
    const ret = wasm.project_export_pdf(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * Format the file at `path`, returning the formatted source or `None` if
   * it is absent or has syntax errors.
   * @param {string} path
   * @returns {string | undefined}
   */
  format(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_format(this.__wbg_ptr, ptr0, len0);
    let v2;
    if (ret[0] !== 0) {
      v2 = getStringFromWasm0(ret[0], ret[1]).slice();
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
  }
  /**
   * Syntax-highlight `text`, returning the spans overlapping the byte window
   * `[from, to)` (the editor's visible viewport; pass `0..len` for all of it).
   * Stateless: it parses `text` directly, so it neither reads nor mutates the
   * VFS and works for the live buffer and hover snippets alike.
   * @param {string} text
   * @param {number} from
   * @param {number} to
   * @returns {HlSpan[]}
   */
  highlight(text, from, to) {
    const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_highlight(this.__wbg_ptr, ptr0, len0, from, to);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
  }
  /**
   * Syntax-highlight `text` to nested `<span class="typ-*">` HTML, for static
   * contexts like hover tooltips. Stateless, like `highlight`.
   * @param {string} text
   * @returns {string}
   */
  highlight_html(text) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      const ret = wasm.project_highlight_html(this.__wbg_ptr, ptr0, len0);
      deferred2_0 = ret[0];
      deferred2_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Hover tooltip at a byte-offset `cursor` in `path`.
   * @param {string} path
   * @param {number} cursor
   * @returns {Hover | undefined}
   */
  hover(path, cursor) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_hover(this.__wbg_ptr, ptr0, len0, cursor);
    return ret;
  }
  /**
   * Resolve a `cursor` (byte offset) in `path` to where it renders in the last
   * compiled document (0-based page + point in points), or `None`. The reverse
   * of `click_jump`, for scrolling the preview to follow the editor cursor.
   * @param {string} path
   * @param {number} cursor
   * @returns {CursorJump | undefined}
   */
  jump_from_cursor(path, cursor) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.project_jump_from_cursor(this.__wbg_ptr, ptr0, len0, cursor);
    return ret;
  }
  constructor() {
    const ret = wasm.project_new();
    this.__wbg_ptr = ret;
    ProjectFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Remove a file from the VFS.
   * @param {string} path
   */
  remove_file(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.project_remove_file(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * Render a single page of the last compiled document to SVG, or `None` if
   * nothing has compiled yet or the index is out of range.
   * @param {number} index
   * @returns {string | undefined}
   */
  render_page(index) {
    const ret = wasm.project_render_page(this.__wbg_ptr, index);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]).slice();
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * Render pages `[start, end)` of the last compiled document to SVG (`end`
   * clamped to the page count), the on-demand path for a virtualized viewer.
   * @param {number} start
   * @param {number} end
   * @returns {string[]}
   */
  render_pages(start, end) {
    const ret = wasm.project_render_pages(this.__wbg_ptr, start, end);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * Set the entry (main) file that compilation starts from.
   * @param {string} path
   */
  set_entry(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.project_set_entry(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * Insert or replace a file in the VFS. Source files are just their UTF-8
   * bytes; package and asset bytes are stored the same way.
   * @param {string} path
   * @param {Uint8Array} bytes
   */
  set_file(path, bytes) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.project_set_file(this.__wbg_ptr, ptr0, len0, ptr1, len1);
  }
  /**
   * Set the date `datetime.today()` returns. WASM has no clock, so JS
   * pushes this in (typically the user's local date) before each compile.
   * @param {number} year
   * @param {number} month
   * @param {number} day
   * @param {number} hour
   * @param {number} minute
   * @param {number} second
   */
  set_today(year, month, day, hour, minute, second) {
    wasm.project_set_today(this.__wbg_ptr, year, month, day, hour, minute, second);
  }
  /**
   * The Typst engine version this crate is built against, e.g. "0.14.2".
   * @returns {string}
   */
  version() {
    let deferred1_0;
    let deferred1_1;
    try {
      const ret = wasm.project_version(this.__wbg_ptr);
      deferred1_0 = ret[0];
      deferred1_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);
    } finally {
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
};
if (Symbol.dispose) Project.prototype[Symbol.dispose] = Project.prototype.free;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg_Error_ef53bc310eb298a0: function(arg0, arg1) {
      const ret = Error(getStringFromWasm0(arg0, arg1));
      return ret;
    },
    __wbg_String_8564e559799eccda: function(arg0, arg1) {
      const ret = String(arg1);
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_1506f2235d1bdba0: function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_new_227d7c05414eb861: function() {
      const ret = new Error();
      return ret;
    },
    __wbg_new_ce1ab61c1c2b300d: function() {
      const ret = new Object();
      return ret;
    },
    __wbg_new_d90091b82fdf5b91: function() {
      const ret = new Array();
      return ret;
    },
    __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
      arg0[arg1] = arg2;
    },
    __wbg_set_dca99999bba88a9a: function(arg0, arg1, arg2) {
      arg0[arg1 >>> 0] = arg2;
    },
    __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
      const ret = arg1.stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbindgen_cast_0000000000000001: function(arg0) {
      const ret = arg0;
      return ret;
    },
    __wbindgen_cast_0000000000000002: function(arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000003: function(arg0) {
      const ret = BigInt.asUintN(64, arg0);
      return ret;
    },
    __wbindgen_init_externref_table: function() {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, void 0);
      table.set(offset + 0, void 0);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    }
  };
  return {
    __proto__: null,
    "./typsten_bg.js": import0
  };
}
var ProjectFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_project_free(ptr, 1));
function getArrayJsValueFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  const mem = getDataViewMemory0();
  const result = [];
  for (let i = ptr; i < ptr + 4 * len; i += 4) {
    result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
  }
  wasm.__externref_drop_slice(ptr, len);
  return result;
}
function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
var cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || cachedDataViewMemory0.buffer.detached === void 0 && cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}
var cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
var cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
var MAX_SAFARI_DECODE_BYTES = 2146435072;
var numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
var cachedTextEncoder = new TextEncoder();
if (!("encodeInto" in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function(arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
}
var WASM_VECTOR_LEN = 0;
var wasmModule;
var wasmInstance;
var wasm;
function __wbg_finalize_init(instance, module) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);
        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
  function expectedResponseType(type) {
    switch (type) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
async function __wbg_init(module_or_path) {
  if (wasm !== void 0) return wasm;
  if (module_or_path !== void 0) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (module_or_path === void 0) {
    throw new Error("typsten worker: wasm bytes required");
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}

// src/typsten-worker.ts
var TypstenWorker = class {
  #project;
  /** Initialize the wasm from `wasmUrl` and create the project handle. */
  async init(wasmUrl) {
    await __wbg_init({ module_or_path: wasmUrl });
    this.#project = new Project();
  }
  #p() {
    if (!this.#project) throw new Error("typsten worker: init() not called");
    return this.#project;
  }
  setFile(path, bytes) {
    this.#p().set_file(path, bytes);
  }
  setEntry(path) {
    this.#p().set_entry(path);
  }
  addFont(bytes) {
    return this.#p().add_font(bytes);
  }
  clearFonts() {
    this.#p().clear_fonts();
  }
  remove(path) {
    this.#p().remove_file(path);
  }
  compile() {
    const now = /* @__PURE__ */ new Date();
    this.#p().set_today(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
    return this.#p().compile();
  }
  renderPage(index) {
    return this.#p().render_page(index);
  }
  renderPages(start, end) {
    return this.#p().render_pages(start, end);
  }
  exportPdf() {
    return this.#p().export_pdf();
  }
  clickJump(index, x, y) {
    return this.#p().click_jump(index, x, y);
  }
  jumpFromCursor(path, cursor) {
    return this.#p().jump_from_cursor(path, cursor);
  }
  complete(path, cursor, explicit) {
    return this.#p().complete(path, cursor, explicit);
  }
  hover(path, cursor) {
    return this.#p().hover(path, cursor);
  }
  format(path) {
    return this.#p().format(path);
  }
  highlight(text, from, to) {
    return this.#p().highlight(text, from, to);
  }
  highlightHtml(text) {
    return this.#p().highlight_html(text);
  }
};
Comlink.expose(new TypstenWorker());
//# sourceMappingURL=typsten-worker.js.map