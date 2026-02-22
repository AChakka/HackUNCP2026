import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './CoronerPage.css'

const API = 'http://localhost:8002'

function CoronerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session_id, report, file_name } = location.state || {}

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef(null)
  const reportRef = useRef(null)

  useEffect(() => {
    if (!session_id) navigate('/')
  }, [session_id, navigate])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '[ERROR] Connection to CORONER lost.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDownload = async () => {
    if (!reportRef.current) return;

    const FOOTER_TEXT = 'HackUNCP 2026 \u2014 Confidential Report';
    const generatedAt = new Date().toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    try {
      setLoading(true);

      // ── 1. Build off-screen styled wrapper ──────────────────────────────────
      const wrapper = document.createElement('div');
      wrapper.style.cssText = [
        'position:absolute', 'left:-9999px', 'top:0',
        'width:900px', 'background:#ffffff', 'color:#111',
        'font-family:Georgia,serif',
        'font-size:14px', 'line-height:1.7',
        'padding:48px 56px', 'box-sizing:border-box',
        'max-height:none', 'overflow:visible',
      ].join(';');

      // ── 2. Inject scoped CSS ─────────────────────────────────────────────────
      const style = document.createElement('style');
      style.textContent = `
        .pdf-doc * { box-sizing: border-box; }

        .pdf-header { margin-bottom: 28px; }
        .pdf-title {
          font-size: 24px; font-weight: 700; color: #000;
          margin: 0 0 6px 0; letter-spacing: -0.5px;
          font-family: Georgia, serif;
        }
        .pdf-meta {
          font-size: 11px; color: #555; margin: 0 0 20px 0;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: 'Courier New', Courier, monospace;
        }
        .pdf-divider {
          border: none; border-top: 2px solid #000; margin: 0 0 32px 0;
        }

        .pdf-doc p {
          margin: 0 0 14px 0; color: #111;
          break-inside: avoid; page-break-inside: avoid;
        }

        .pdf-doc h1 {
          font-size: 22px; font-weight: 700; color: #000;
          margin: 36px 0 12px; padding-bottom: 8px;
          border-bottom: 2px solid #000;
          break-after: avoid; page-break-after: avoid;
        }
        .pdf-doc h2 {
          font-size: 18px; font-weight: 700; color: #000;
          margin: 28px 0 10px;
          break-after: avoid; page-break-after: avoid;
        }
        .pdf-doc h3 {
          font-size: 15px; font-weight: 600; color: #222;
          margin: 22px 0 8px;
          break-after: avoid; page-break-after: avoid;
        }

        .pdf-doc ul, .pdf-doc ol { margin: 0 0 14px 24px; padding: 0; }
        .pdf-doc li { margin-bottom: 4px; color: #111; }

        .pdf-doc blockquote {
          margin: 16px 0; padding: 12px 16px;
          border-left: 4px solid #555;
          background: #f5f5f5; color: #444; font-style: italic;
          break-inside: avoid; page-break-inside: avoid;
        }
        .pdf-doc blockquote p { margin: 0; }

        .pdf-doc code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px; background: #f0f0f0; color: #111;
          padding: 2px 5px;
          white-space: pre-wrap; word-break: break-all;
        }
        .pdf-doc pre {
          background: #f0f0f0; border: 1px solid #ccc;
          padding: 14px 16px; margin: 0 0 16px;
          overflow: visible;
          break-inside: avoid; page-break-inside: avoid;
        }
        .pdf-doc pre code {
          background: transparent; color: #111;
          padding: 0;
          white-space: pre-wrap; word-break: break-all; font-size: 12px;
        }

        .pdf-doc table {
          width: 100%; border-collapse: collapse; margin: 0 0 20px;
          font-size: 13px;
          break-inside: avoid; page-break-inside: avoid;
        }
        .pdf-doc th {
          background: #111; color: #fff; padding: 9px 12px;
          text-align: left; font-weight: 600; font-size: 12px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .pdf-doc td {
          padding: 8px 12px; border-bottom: 1px solid #ccc;
          vertical-align: top; color: #111;
        }
        .pdf-doc tbody tr:nth-child(even) td { background: #f9f9f9; }
        .pdf-doc tbody tr:last-child td { border-bottom: none; }

        .pdf-doc img {
          max-width: 100%; height: auto;
          break-inside: avoid; page-break-inside: avoid;
        }
      `;
      wrapper.appendChild(style);

      // ── 3. Formal document header ────────────────────────────────────────────
      const header = document.createElement('div');
      header.className = 'pdf-header';
      header.innerHTML = `
        <p class="pdf-title">DFIR Master Executive Report</p>
        <p class="pdf-meta">File: ${file_name || 'Unknown'} &nbsp;|&nbsp; Generated: ${generatedAt}</p>
        <hr class="pdf-divider" />
      `;
      wrapper.appendChild(header);

      // ── 4. Clone and inject markdown content ─────────────────────────────────
      const content = reportRef.current.cloneNode(true);
      content.className = 'pdf-doc';
      // Strip dark-mode inline styles so our scoped CSS wins
      content.removeAttribute('style');
      wrapper.appendChild(content);

      document.body.appendChild(wrapper);

      // Small pause so fonts/layout settle
      await new Promise(r => setTimeout(r, 150));

      // ── 5. Capture the wrapper ───────────────────────────────────────────────
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 900,
      });

      document.body.removeChild(wrapper);

      // ── 6. Build A4 PDF with margins and per-page footers ────────────────────
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const marginX = 14;
      const marginTop = 14;
      const footerH = 8;
      const marginBot = 5;

      const contentWidth = pdfWidth - marginX * 2;
      const contentHeight = pdfHeight - marginTop - footerH - marginBot;

      const ratio = contentWidth / canvas.width;
      const scaledHeight = canvas.height * ratio;

      let heightLeft = scaledHeight;
      let yPos = marginTop;
      let pageNum = 1;

      const addFooter = (doc, pg) => {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        const fy = pdfHeight - marginBot;
        doc.text(FOOTER_TEXT, marginX, fy);
        const pgLabel = `Page ${pg}`;
        doc.text(pgLabel, pdfWidth - marginX - doc.getTextWidth(pgLabel), fy);
        doc.setDrawColor(180, 180, 180);
        doc.line(marginX, fy - 2.5, pdfWidth - marginX, fy - 2.5);
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
      };

      // First page
      pdf.addImage(imgData, 'PNG', marginX, yPos, contentWidth, scaledHeight);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pdfHeight - footerH - marginBot, pdfWidth, footerH + marginBot, 'F');
      addFooter(pdf, pageNum);
      heightLeft -= contentHeight;

      // Subsequent pages
      while (heightLeft > 0) {
        pageNum++;
        pdf.addPage();
        yPos -= contentHeight;
        pdf.addImage(imgData, 'PNG', marginX, yPos, contentWidth, scaledHeight);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, marginTop, 'F');
        pdf.rect(0, pdfHeight - footerH - marginBot, pdfWidth, footerH + marginBot, 'F');
        addFooter(pdf, pageNum);
        heightLeft -= contentHeight;
      }

      pdf.save(`coroner_report_${file_name || 'export'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setLoading(false);
    }
  }

  if (!session_id) return null

  return (
    <main className="coroner-page">

      {/* ── Session header ───────────────────────────────────────────────── */}
      <div className="coroner-header">
        <div className="coroner-session-info">
          <span className="coroner-tag">// ACTIVE INVESTIGATION //</span>
          <span className="coroner-file">{file_name}</span>
        </div>
        <button className="coroner-download-btn" onClick={handleDownload}>
          ↓ EXPORT REPORT PDF
        </button>
      </div>

      {/* ── Forensic report ──────────────────────────────────────────────── */}
      <div className="coroner-section">
        <div className="coroner-panel-label">[ FORENSIC REPORT ]</div>
        <div className="coroner-report-panel" ref={reportRef}>
          <div className="coroner-report-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report || ''}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* ── Chat ─────────────────────────────────────────────────────────── */}
      <div className="coroner-section">
        <div className="coroner-panel-label">[ INTERROGATE THE EVIDENCE ]</div>

        <div className="coroner-chat-history" ref={chatRef}>
          {messages.length === 0 && (
            <p className="coroner-empty">
              Investigation complete. Ask any follow-up questions about this file.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`coroner-msg coroner-msg--${m.role}`}>
              <span className="coroner-msg-label">
                {m.role === 'assistant' ? '[CORONER]' : '[YOU]'}
              </span>
              <pre className="coroner-msg-content">{m.content}</pre>
            </div>
          ))}
          {loading && (
            <div className="coroner-msg coroner-msg--assistant">
              <span className="coroner-msg-label">[CORONER]</span>
              <span className="coroner-thinking">ANALYZING_</span>
            </div>
          )}
        </div>

        <div className="coroner-input-row">
          <span className="coroner-prompt-symbol">&gt;</span>
          <textarea
            className="coroner-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the investigation..."
            rows={2}
            disabled={loading}
          />
          <button
            className="coroner-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            TRANSMIT
          </button>
        </div>
      </div>

    </main>
  )
}

export default CoronerPage
