import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: './',
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]'
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'public/assets'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.js'),
        admin: path.resolve(__dirname, 'src/admin.js'),
        editor: path.resolve(__dirname, 'src/editor.js')
      },
      external: [
        'monaco-editor',
        /monaco-editor\/.*/
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunk.[hash].js',
        assetFileNames: '[name][extname]',
        manualChunks(id) {
          if (id.includes('shiki') || id.includes('twoslash')) return 'shiki'
          if (id.includes('katex')) return 'katex'
          if (id.includes('markdown-it')) return 'mdit'
          if (id.includes('pdfjs-dist')) return 'pdf'
          if ((id.includes('typst.ts') || id.includes('typst-ts')) && !id.includes('typescript')) return 'typst'
        }
      }
    }
  }
})
