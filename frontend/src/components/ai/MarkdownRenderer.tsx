import React, { useState } from 'react'
import { Copy, Check, FileText } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  onPageClick?: (pageNumber: number) => void
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onPageClick }) => {
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedBlockId(id)
    setTimeout(() => setCopiedBlockId(null), 2000)
  }

  // Parse markdown lines into structured blocks
  const renderFormattedContent = () => {
    if (!content) return null

    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ''
    let inTable = false
    let tableRows: string[][] = []
    let tableHeaderDone = false

    const flushTable = (key: string) => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0]
        const bodyRows = tableRows.slice(1)

        elements.push(
          <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-bold">
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2.5 font-semibold text-slate-700">
                      {parseInlineFormatting(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-slate-700">
                        {parseInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        tableRows = []
        inTable = false
        tableHeaderDone = false
      }
    }

    const flushCodeBlock = (key: string) => {
      const rawCode = codeBlockContent.join('\n')
      const blockId = `code_${key}`
      elements.push(
        <div key={key} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200 shadow-sm text-xs">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="font-mono uppercase font-semibold">{codeBlockLang || 'code'}</span>
            <button
              type="button"
              onClick={() => handleCopy(rawCode, blockId)}
              className="flex items-center gap-1 hover:text-white transition-colors text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
            >
              {copiedBlockId === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 overflow-x-auto font-mono text-xs text-slate-200 whitespace-pre leading-relaxed">
            {rawCode}
          </pre>
        </div>
      )
      codeBlockContent = []
      inCodeBlock = false
      codeBlockLang = ''
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code block fence toggle
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(`code_block_${i}`)
        } else {
          inCodeBlock = true
          codeBlockLang = line.trim().replace('```', '').trim()
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Table line detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const rawCells = line.split('|').slice(1, -1)
        const isDivider = rawCells.every((c) => c.trim().replace(/-/g, '').replace(/:/g, '') === '')
        if (isDivider) {
          tableHeaderDone = true
          continue
        }
        if (!inTable) {
          inTable = true
        }
        tableRows.push(rawCells)
        continue
      } else if (inTable) {
        flushTable(`table_${i}`)
      }

      // Headings
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4_${i}`} className="text-xs font-bold text-slate-900 mt-3 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
            {parseInlineFormatting(line.replace('#### ', ''))}
          </h4>
        )
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3_${i}`} className="text-sm font-bold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
            {parseInlineFormatting(line.replace('### ', ''))}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2_${i}`} className="text-base font-bold text-slate-900 mt-4 mb-2 border-b border-slate-200/80 pb-1">
            {parseInlineFormatting(line.replace('## ', ''))}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1_${i}`} className="text-lg font-extrabold text-slate-900 mt-4 mb-2.5">
            {parseInlineFormatting(line.replace('# ', ''))}
          </h1>
        )
      }
      // Horizontal rules
      else if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={`hr_${i}`} className="my-3 border-slate-200" />)
      }
      // Blockquotes / Alerts
      else if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`bq_${i}`}
            className="my-2 border-l-3 border-blue-500 bg-blue-50/60 text-blue-950 px-3.5 py-2 rounded-r-xl text-xs italic leading-relaxed"
          >
            {parseInlineFormatting(line.replace('> ', ''))}
          </blockquote>
        )
      }
      // Bullet list items
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().substring(2)
        elements.push(
          <div key={`li_${i}`} className="flex items-start gap-2 my-1 pl-1 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{parseInlineFormatting(itemText)}</div>
          </div>
        )
      }
      // Numbered list items
      else if (/^\d+\.\s+/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s+(.*)$/)
        if (match) {
          elements.push(
            <div key={`nli_${i}`} className="flex items-start gap-2 my-1 pl-1 text-slate-700">
              <span className="font-mono font-bold text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                {match[1]}.
              </span>
              <div className="flex-1 leading-relaxed">{parseInlineFormatting(match[2])}</div>
            </div>
          )
        }
      }
      // Empty line
      else if (!line.trim()) {
        elements.push(<div key={`blank_${i}`} className="h-1.5" />)
      }
      // Regular paragraph
      else {
        elements.push(
          <p key={`p_${i}`} className="my-1.5 text-slate-700 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        )
      }
    }

    if (inCodeBlock) {
      flushCodeBlock('code_block_end')
    }
    if (inTable) {
      flushTable('table_end')
    }

    return elements
  }

  // Parse inline styles: bold, italics, code, and page citations
  const parseInlineFormatting = (text: string): React.ReactNode => {
    if (!text) return ''

    // Split by page references like [Page 12] or Page 12 or (Page 12)
    const parts: React.ReactNode[] = []
    
    // Pattern to match markdown bold, italic, code, page citations
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\(Ref:\s*Page\s*\d+\)|Page\s*\d+|\[Page\s*\d+\])/g
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index
      const matchStr = match[0]

      if (matchStart > lastIdx) {
        parts.push(text.substring(lastIdx, matchStart))
      }

      if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        parts.push(
          <strong key={`bold_${matchStart}`} className="font-bold text-slate-900">
            {matchStr.slice(2, -2)}
          </strong>
        )
      } else if (matchStr.startsWith('*') && matchStr.endsWith('*')) {
        parts.push(
          <em key={`em_${matchStart}`} className="italic text-slate-800">
            {matchStr.slice(1, -1)}
          </em>
        )
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        parts.push(
          <code
            key={`code_${matchStart}`}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 text-purple-700 border border-slate-200 font-mono text-[11px]"
          >
            {matchStr.slice(1, -1)}
          </code>
        )
      } else if (/\bPage\s*(\d+)/i.test(matchStr)) {
        const pageMatch = matchStr.match(/\bPage\s*(\d+)/i)
        const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : 1
        parts.push(
          <button
            key={`page_chip_${matchStart}`}
            type="button"
            onClick={() => onPageClick && onPageClick(pageNum)}
            title={`Click to inspect Page ${pageNum}`}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold cursor-pointer transition-all hover:scale-105"
          >
            <FileText className="w-3 h-3 text-purple-600" />
            <span>Page {pageNum}</span>
          </button>
        )
      } else {
        parts.push(matchStr)
      }

      lastIdx = matchStart + matchStr.length
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx))
    }

    return parts.length > 0 ? parts : text
  }

  return <div className="space-y-1 text-xs text-slate-800">{renderFormattedContent()}</div>
}

export default MarkdownRenderer
