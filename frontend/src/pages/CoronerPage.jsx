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
    try {
      setLoading(true);
      // 1. Create a hidden clone to apply universal design styles independently of dark mode
      const clone = reportRef.current.cloneNode(true);

      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '800px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#111827';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';

      clone.classList.add('pdf-export-clone');
      document.body.appendChild(clone);

      // 2. Capture canvas with forced white background
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      document.body.removeChild(clone);

      // 3. Setup standard A4 document
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 20; // 20mm uniform margin (~0.8 inches)

      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let heightLeft = scaledHeight;
      let position = margin;

      // 4. Print first page
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, scaledHeight);
      heightLeft -= contentHeight;

      // Mask bottom margin to prevent image bleed
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

      // 5. Handle subsequent pages
      while (heightLeft > 0) {
        pdf.addPage();
        position -= contentHeight;
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, scaledHeight);

        // Mask top and bottom margins for a clean professional look
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, margin, 'F');
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

        heightLeft -= contentHeight;
      }

      pdf.save(`coroner_report_${file_name || 'export'}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
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
