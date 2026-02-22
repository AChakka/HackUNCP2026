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

    const FOOTER_TEXT = 'HackUNCP 2026 \u2014 Confidential Forensic Report';
    const generatedAt = new Date().toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    try {
      setLoading(true);

      // ── 1. Build off-screen white shell ─────────────────────────────────────
      const shell = document.createElement('div');
      shell.style.cssText = [
        'position:absolute', 'left:-9999px', 'top:0',
        'width:860px', 'background:#ffffff', 'color:#111111',
        'font-family:"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
        'font-size:13px', 'line-height:1.65',
        'padding:52px 60px 40px', 'box-sizing:border-box',
        'overflow:visible', 'max-height:none',
      ].join(';');

      // ── 2. Simple text header ────────────────────────────────────────────────
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:28px;border-bottom:2px solid #000;padding-bottom:16px;';
      header.innerHTML = `
        <div style="font-size:20px;font-weight:700;color:#000;margin-bottom:6px;">
          DFIR Master Executive Report
        </div>
        <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.06em;">
          File: ${file_name || 'Unknown'} &nbsp;|&nbsp; ${generatedAt}
        </div>
      `;
      shell.appendChild(header);

      // ── 3. Clone + strip dark styles ────────────────────────────────────────
      const contentClone = reportRef.current.cloneNode(true);
      const stripDark = (el) => {
        if (el.nodeType !== 1) return;
        el.removeAttribute('style');
        if (el.classList) {
          el.classList.remove('coroner-report-markdown');
          el.classList.add('pdf-body');
        }
        Array.from(el.children).forEach(stripDark);
      };
      stripDark(contentClone);
      shell.appendChild(contentClone);

      // ── 4. Scoped black-and-white CSS ────────────────────────────────────────
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        .pdf-body { font-family:"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:13px; color:#111; line-height:1.65; }
        .pdf-body h1 { font-size:20px; font-weight:700; color:#000; margin:32px 0 10px; padding-bottom:7px; border-bottom:2px solid #000; page-break-after:avoid; }
        .pdf-body h2 { font-size:16px; font-weight:700; color:#000; margin:24px 0 8px; page-break-after:avoid; }
        .pdf-body h3 { font-size:13px; font-weight:600; color:#222; margin:18px 0 6px; page-break-after:avoid; }
        .pdf-body p  { margin:0 0 12px; color:#111; page-break-inside:avoid; }
        .pdf-body strong { color:#000; }
        .pdf-body ul, .pdf-body ol { margin:0 0 12px 22px; padding:0; color:#111; }
        .pdf-body li { margin-bottom:3px; color:#111; }
        .pdf-body blockquote { margin:14px 0; padding:10px 14px; border-left:3px solid #555; background:#f5f5f5; color:#444; font-style:italic; page-break-inside:avoid; }
        .pdf-body blockquote p { margin:0; color:#444; }
        .pdf-body code { font-family:"Courier New",Courier,monospace; font-size:11.5px; background:#f0f0f0; color:#111; padding:1px 4px; word-break:break-all; }
        .pdf-body pre  { background:#f0f0f0; border:1px solid #ccc; padding:12px 14px; margin:0 0 14px; overflow:visible; page-break-inside:avoid; }
        .pdf-body pre code { background:transparent; color:#111; padding:0; font-size:11.5px; white-space:pre-wrap; word-break:break-all; }
        .pdf-body table { width:100%; border-collapse:collapse; margin:0 0 18px; font-size:12px; page-break-inside:avoid; }
        .pdf-body th { background:#111; color:#fff; padding:8px 11px; text-align:left; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
        .pdf-body td { padding:7px 11px; border:1px solid #ccc; vertical-align:top; color:#111; background:#fff; }
        .pdf-body tbody tr:nth-child(even) td { background:#f9f9f9; }
        .pdf-body a  { color:#000; text-decoration:underline; }
        .pdf-body hr { border:none; border-top:1px solid #ccc; margin:20px 0; }
        .pdf-body img { max-width:100%; height:auto; page-break-inside:avoid; }
      `;
      shell.insertBefore(styleTag, shell.firstChild);

      document.body.appendChild(shell);
      await new Promise(r => setTimeout(r, 200));

      // ── 5. Capture ──────────────────────────────────────────────────────────
      const canvas = await html2canvas(shell, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
        windowWidth: 860,
        onclone: (doc) => {
          // Strip ALL existing page stylesheets so dark-mode CSS doesn't bleed in.
          // Our <style> tag lives inside the shell div (body), so it survives this.
          doc.querySelectorAll('link[rel="stylesheet"], head style').forEach(el => el.remove());
          doc.documentElement.style.cssText = 'background:#fff !important;';
          doc.body.style.cssText = 'background:#fff !important; margin:0; padding:0;';
        },
      });
      document.body.removeChild(shell);

      // ── 6. Paginated A4 PDF ─────────────────────────────────────────────────
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const footH = 9;
      const mBot = 4;
      const imgW = pdfW;
      const pageImgH = pdfH - footH - mBot;
      const imgTotalH = canvas.height * (imgW / canvas.width);

      const drawFooter = (doc, pg) => {
        const fy = pdfH - mBot;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(10, fy - 3, pdfW - 10, fy - 3);
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(FOOTER_TEXT, 10, fy);
        const label = `Page ${pg}`;
        doc.text(label, pdfW - 10 - doc.getTextWidth(label), fy);
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
      };

      let remaining = imgTotalH;
      let srcY = 0;
      let pageNum = 1;

      pdf.addImage(imgData, 'PNG', 0, srcY, imgW, imgTotalH);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pdfH - footH - mBot, pdfW, footH + mBot, 'F');
      drawFooter(pdf, pageNum);
      remaining -= pageImgH;

      while (remaining > 1) {
        pageNum++;
        pdf.addPage();
        srcY -= pageImgH;
        pdf.addImage(imgData, 'PNG', 0, srcY, imgW, imgTotalH);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pdfH - footH - mBot, pdfW, footH + mBot, 'F');
        drawFooter(pdf, pageNum);
        remaining -= pageImgH;
      }

      pdf.save(`coroner_report_${file_name || 'export'}.pdf`);
    } catch (err) {
      console.error('[CORONER] PDF export failed:', err);
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
