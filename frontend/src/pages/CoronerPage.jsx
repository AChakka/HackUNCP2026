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

      // ── 1. Build an off-screen print shell ─────────────────────────────────
      // We build a FRESH div from scratch instead of cloning the live dark DOM.
      // Cloning inherits computed dark-mode styles that html2canvas bakes in
      // even when you override them with !important CSS injected after the fact.
      const shell = document.createElement('div');
      shell.style.cssText = [
        'position:absolute', 'left:-9999px', 'top:0',
<<<<<<< HEAD
        'width:900px', 'background:#ffffff', 'color:#111',
        'font-family:Georgia,serif',
        'font-size:14px', 'line-height:1.7',
        'padding:48px 56px', 'box-sizing:border-box',
        'max-height:none', 'overflow:visible',
=======
        'width:860px',         // ~A4 at 96dpi with margins
        'background:#ffffff',
        'color:#111111',
        'font-family:"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
        'font-size:13px', 'line-height:1.65',
        'padding:52px 60px 40px',
        'box-sizing:border-box',
        'overflow:visible', 'max-height:none',
>>>>>>> f8d94fb95f7021c4fd3cecb856b1ca7c4f7ac031
      ].join(';');

      // ── 2. Premium coverstrip header ────────────────────────────────────────
      const coverStrip = document.createElement('div');
      coverStrip.style.cssText = [
        'background:#0f0f0f', 'margin:-52px -60px 36px',
        'padding:22px 60px 18px',
        'border-bottom:3px solid #c0392b',
        'display:flex', 'align-items:center', 'justify-content:space-between',
      ].join(';');
      coverStrip.innerHTML = `
        <div>
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.22em;color:#c0392b;font-weight:700;margin-bottom:6px;">
            ◈ CORONER &nbsp;// DIGITAL FORENSICS &amp; INCIDENT RESPONSE
          </div>
          <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-.3px;">
            DFIR Master Executive Report
          </div>
        </div>
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#666666;text-align:right;line-height:1.8;">
          <div style="color:#888;text-transform:uppercase;letter-spacing:.12em;">Evidence</div>
          <div style="color:#cccccc;max-width:220px;word-break:break-all;">${file_name || 'Unknown'}</div>
          <div style="color:#555;margin-top:4px;">${generatedAt}</div>
        </div>
      `;
      shell.appendChild(coverStrip);

<<<<<<< HEAD
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
=======
      // ── 3. Clone report content & surgically strip all dark-mode styles ─────
      // Strategy: deep-clone, then walk every element and remove any inline
      // style attributes + replace className references to dark-mode classes.
      const contentClone = reportRef.current.cloneNode(true);

      // Recursively strip inline styles that carry dark palette values
      const stripDarkInlineStyles = (el) => {
        if (el.nodeType !== 1) return;
        el.removeAttribute('style');
        // Replace the markdown wrapper class so our PDF CSS takes over
        if (el.classList) {
          el.classList.remove('coroner-report-markdown');
          el.classList.add('pdf-report-body');
>>>>>>> f8d94fb95f7021c4fd3cecb856b1ca7c4f7ac031
        }
        Array.from(el.children).forEach(stripDarkInlineStyles);
      };
      stripDarkInlineStyles(contentClone);
      shell.appendChild(contentClone);

<<<<<<< HEAD
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
=======
      // ── 4. Scoped premium print CSS injected into the shell ─────────────────
      // These rules only apply inside `shell` due to the .pdf-report-* prefix.
      // All colors are forced via explicit values (not !important tricks) because
      // html2canvas reads getComputedStyle() — a freshly built DOM node with
      // no conflicting stylesheet will pick up these rules cleanly.
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        /* Base */
        .pdf-report-body {
          font-family: "Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
>>>>>>> f8d94fb95f7021c4fd3cecb856b1ca7c4f7ac031
          font-size: 13px;
          color: #111111;
          line-height: 1.65;
        }
<<<<<<< HEAD
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
=======
>>>>>>> f8d94fb95f7021c4fd3cecb856b1ca7c4f7ac031

        /* Headings */
        .pdf-report-body h1 {
          font-size: 20px; font-weight: 700; color: #0a0a0a;
          margin: 32px 0 10px; padding-bottom: 7px;
          border-bottom: 2px solid #c0392b;
          letter-spacing: -.3px;
          page-break-after: avoid;
        }
        .pdf-report-body h2 {
          font-size: 15px; font-weight: 700; color: #0a0a0a;
          margin: 24px 0 8px; text-transform: uppercase;
          letter-spacing: .06em;
          page-break-after: avoid;
        }
        .pdf-report-body h3 {
          font-size: 13px; font-weight: 600; color: #222222;
          margin: 18px 0 6px;
          page-break-after: avoid;
        }

        /* Body text */
        .pdf-report-body p {
          margin: 0 0 12px; color: #111111;
          page-break-inside: avoid;
        }
        .pdf-report-body strong { color: #0a0a0a; }
        .pdf-report-body em { color: #333333; }

        /* Lists */
        .pdf-report-body ul,
        .pdf-report-body ol {
          margin: 0 0 12px 22px; padding: 0; color: #111111;
        }
        .pdf-report-body li { margin-bottom: 3px; color: #111111; }

        /* Blockquote */
        .pdf-report-body blockquote {
          margin: 14px 0; padding: 10px 14px;
          border-left: 3px solid #c0392b;
          background: #fafafa;
          color: #333333; font-style: italic;
          border-radius: 0 3px 3px 0;
          page-break-inside: avoid;
        }
        .pdf-report-body blockquote p { margin: 0; color: #333333; }

        /* Inline code */
        .pdf-report-body code {
          font-family: "Courier New",Courier,monospace;
          font-size: 11.5px;
          background: #f0f0f0;
          color: #b91c1c;
          padding: 1px 4px;
          border-radius: 3px;
          word-break: break-all;
        }

        /* Code blocks */
        .pdf-report-body pre {
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-left: 3px solid #c0392b;
          border-radius: 4px;
          padding: 12px 14px;
          margin: 0 0 14px;
          overflow: visible;
          page-break-inside: avoid;
        }
        .pdf-report-body pre code {
          background: transparent;
          color: #111111;
          padding: 0;
          border-radius: 0;
          font-size: 11.5px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* Tables */
        .pdf-report-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 18px;
          font-size: 12px;
          page-break-inside: avoid;
        }
        .pdf-report-body thead {
          background: #0f0f0f;
        }
        .pdf-report-body th {
          background: #0f0f0f;
          color: #ffffff;
          padding: 8px 11px;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
          border: 1px solid #0f0f0f;
        }
        .pdf-report-body td {
          padding: 7px 11px;
          border: 1px solid #e0e0e0;
          border-top: none;
          vertical-align: top;
          color: #111111;
          background: #ffffff;
        }
        .pdf-report-body tbody tr:nth-child(even) td {
          background: #f9f9f9;
        }

        /* Links */
        .pdf-report-body a {
          color: #b91c1c;
          text-decoration: underline;
        }

        /* Horizontal rules */
        .pdf-report-body hr {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 20px 0;
        }

        /* Images */
        .pdf-report-body img {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
      `;
      shell.insertBefore(styleTag, shell.firstChild);

      document.body.appendChild(shell);

      // Brief pause so the browser resolves layout + font rendering
      await new Promise(r => setTimeout(r, 200));

      // ── 5. Capture ──────────────────────────────────────────────────────────
      const canvas = await html2canvas(shell, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 860,
        // Ensure html2canvas reads fresh styles, not the dark-page's styles
        onclone: (clonedDoc) => {
          // Force white background on the cloned document root
          clonedDoc.documentElement.style.background = '#ffffff';
          clonedDoc.body.style.background = '#ffffff';
        },
      });

      document.body.removeChild(shell);

      // ── 6. Build paginated A4 PDF ───────────────────────────────────────────
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const mX = 0;           // image bleeds to edge; we used shell padding
      const mTop = 0;
      const footH = 9;
      const mBot = 4;

      const imgW = pdfW - mX * 2;
      const pageImgH = pdfH - mTop - footH - mBot;
      const ratio = imgW / canvas.width;
      const imgTotalH = canvas.height * ratio;

      let remaining = imgTotalH;
      let srcY = mTop;
      let pageNum = 1;

<<<<<<< HEAD
      const addFooter = (doc, pg) => {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        const fy = pdfHeight - marginBot;
        doc.text(FOOTER_TEXT, marginX, fy);
        const pgLabel = `Page ${pg}`;
        doc.text(pgLabel, pdfWidth - marginX - doc.getTextWidth(pgLabel), fy);
        doc.setDrawColor(180, 180, 180);
        doc.line(marginX, fy - 2.5, pdfWidth - marginX, fy - 2.5);
=======
      const drawFooter = (doc, pg) => {
        const fy = pdfH - mBot;
        doc.setDrawColor(192, 57, 43);
        doc.setLineWidth(0.4);
        doc.line(10, fy - 3, pdfW - 10, fy - 3);
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(FOOTER_TEXT, 10, fy);
        const label = `Page ${pg}`;
        doc.text(label, pdfW - 10 - doc.getTextWidth(label), fy);
>>>>>>> f8d94fb95f7021c4fd3cecb856b1ca7c4f7ac031
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
      };

      // Page 1
      pdf.addImage(imgData, 'PNG', mX, srcY, imgW, imgTotalH);
      // Mask the footer area with white before drawing footer text
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pdfH - footH - mBot, pdfW, footH + mBot, 'F');
      drawFooter(pdf, pageNum);
      remaining -= pageImgH;

      while (remaining > 1) {
        pageNum++;
        pdf.addPage();
        srcY -= pageImgH;
        pdf.addImage(imgData, 'PNG', mX, srcY, imgW, imgTotalH);
        // Mask top bleed
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfW, mTop, 'F');
        // Mask footer area
        pdf.rect(0, pdfH - footH - mBot, pdfW, footH + mBot, 'F');
        drawFooter(pdf, pageNum);
        remaining -= pageImgH;
      }

      pdf.save(`coroner_report_${file_name || 'export'}.pdf`);
    } catch (err) {
      console.error('[CORONER] PDF export failed:', err);
      alert('PDF export failed. Check the console for details.');
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
