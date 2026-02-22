import { useState, useRef } from 'react'
import './CryptoPage.css'

const API = 'http://localhost:8000'

const RISK_COLOR = { LOW: '#4a4a4a', MEDIUM: '#b8860b', HIGH: '#c0392b' }

export default function CryptoPage() {
  const [mode, setMode] = useState('wallet') // 'wallet' | 'file'
  const [wallet, setWallet] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const reset = () => { setResult(null); setError(null) }

  const handleAnalyzeWallet = async () => {
    if (!wallet.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(`${API}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim(), limit: 5 }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setResult({ type: 'wallet', data: await res.json() })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScanFile = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API}/scan-file`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setResult({ type: 'file', data: await res.json() })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); reset() }
  }

  return (
    <main className="crypto-main">
      <div className="crypto-header">
        <p className="crypto-tag">// CRYPTO FORENSICS //</p>
        <pre className="wallet-ascii">{` █     █░ ▄▄▄       ██▓     ██▓    ▓█████▄▄▄█████▓   ▄▄▄█████▓ ██▀███   ▄▄▄       ▄████▄  ▓█████
▓█░ █ ░█░▒████▄    ▓██▒    ▓██▒    ▓█   ▀▓  ██▒ ▓▒   ▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄    ▒██▀ ▀█  ▓█   ▀
▒█░ █ ░█ ▒██  ▀█▄  ▒██░    ▒██░    ▒███  ▒ ▓██░ ▒░   ▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ▒▓█    ▄ ▒███
░█░ █ ░█ ░██▄▄▄▄██ ▒██░    ▒██░    ▒▓█  ▄░ ▓██▓ ░    ░ ▓██▓ ░ ▒██▀▀█▄  ░██▄▄▄▄██ ▒▓▓▄ ▄██▒▒▓█  ▄
░░██▒██▓  ▓█   ▓██▒░██████▒░██████▒░▒████▒ ▒██▒ ░      ▒██▒ ░ ░██▓ ▒██▒ ▓█   ▓██▒▒ ▓███▀ ░░▒████▒
░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒░▓  ░░ ▒░▓  ░░░ ▒░ ░ ▒ ░░        ▒ ░░   ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░ ░▒ ▒  ░░░ ▒░ ░
  ▒ ░ ░    ▒   ▒▒ ░░ ░ ▒  ░░ ░ ▒  ░ ░ ░  ░   ░           ░      ░▒ ░ ▒░  ▒   ▒▒ ░  ░  ▒    ░ ░  ░
  ░   ░    ░   ▒     ░ ░     ░ ░      ░    ░           ░        ░░   ░   ░   ▒   ░           ░
    ░          ░  ░    ░  ░    ░  ░   ░  ░                       ░           ░  ░░ ░         ░  ░`}</pre>
        <p className="crypto-sub">Trace on-chain activity, detect suspicious behavior, and extract wallet addresses from evidence files.</p>
      </div>

      {/* Mode toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'wallet' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('wallet'); reset() }}
        >
          WALLET ADDRESS
        </button>
        <button
          className={`mode-btn ${mode === 'file' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('file'); reset() }}
        >
          SCAN FILE
        </button>
      </div>

      {/* Wallet input mode */}
      {mode === 'wallet' && (
        <div className="input-section">
          <p className="input-label">// ENTER WALLET ADDRESS //</p>
          <div className="wallet-row">
            <input
              className="wallet-input"
              type="text"
              placeholder="Solana wallet address..."
              value={wallet}
              onChange={(e) => { setWallet(e.target.value); reset() }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeWallet()}
            />
            <button
              className="analyze-btn"
              disabled={!wallet.trim() || loading}
              onClick={handleAnalyzeWallet}
            >
              {loading ? 'ANALYZING...' : 'ANALYZE'}
            </button>
          </div>
        </div>
      )}

      {/* File scan mode */}
      {mode === 'file' && (
        <div className="input-section">
          <p className="input-label">// UPLOAD EVIDENCE FILE //</p>
          <div
            className={`crypto-dropzone ${dragOver ? 'dragover' : ''} ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && inputRef.current.click()}
          >
            <input ref={inputRef} type="file" hidden onChange={(e) => { setFile(e.target.files[0]); reset() }} />
            {!file ? (
              <div className="drop-content">
                <p className="drop-tag">// DROP FILE //</p>
                <p className="drop-primary">LOG / DUMP / TEXT / CSV</p>
                <p className="drop-secondary">extracts all solana addresses and ranks by risk</p>
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-meta-tag">EVIDENCE</div>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button className="clear-btn" onClick={(e) => { e.stopPropagation(); setFile(null); reset() }}>x</button>
              </div>
            )}
          </div>
          <button
            className="analyze-btn"
            style={{ marginTop: '1rem' }}
            disabled={!file || loading}
            onClick={handleScanFile}
          >
            {loading ? 'SCANNING...' : 'SCAN FILE'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="result-error">
          <p className="drop-tag">// ERROR //</p>
          <p className="error-msg">{error}</p>
        </div>
      )}

      {/* Wallet report result */}
      {result?.type === 'wallet' && (
        <WalletReport data={result.data} />
      )}

      {/* File scan result */}
      {result?.type === 'file' && (
        <FileScanResult data={result.data} />
      )}
    </main>
  )
}

function RiskBadge({ label, score }) {
  return (
    <div className="risk-badge" style={{ borderColor: RISK_COLOR[label] ?? '#444', color: RISK_COLOR[label] ?? '#444' }}>
      <span className="risk-label">{label}</span>
      <span className="risk-score">{score}/100</span>
    </div>
  )
}

function WalletReport({ data }) {
  const { wallet, summary, risk, profile } = data
  return (
    <div className="result-panel">
      <p className="result-section-label">// INVESTIGATION REPORT //</p>

      <div className="report-top">
        <div>
          <p className="report-wallet-label">SUBJECT WALLET</p>
          <p className="report-wallet">{wallet}</p>
          <p className="report-type">{risk.wallet_type}</p>
        </div>
        <RiskBadge label={risk.label} score={risk.score} />
      </div>

      <div className="report-summary">
        <p className="result-section-label">// SUMMARY //</p>
        <p className="summary-text">{summary}</p>
      </div>

      {risk.flags.length > 0 && (
        <div className="report-flags">
          <p className="result-section-label">// FLAGS //</p>
          {risk.flags.map((f, i) => (
            <p key={i} className="flag-item">&#x25A0; {f}</p>
          ))}
        </div>
      )}

      {profile.top_counterparties?.length > 0 && (
        <div className="report-counterparties">
          <p className="result-section-label">// TOP COUNTERPARTIES //</p>
          {profile.top_counterparties.map((cp, i) => (
            <div key={i} className="counterparty-row">
              <span className="cp-index">#{i + 1}</span>
              <span className="cp-wallet">{cp.wallet}</span>
              <span className="cp-count">{cp.count} tx</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FileScanResult({ data }) {
  const { found, analyzed, results } = data
  return (
    <div className="result-panel">
      <p className="result-section-label">// FILE SCAN RESULTS //</p>
      <p className="scan-meta">{found} addresses found &nbsp;|&nbsp; {analyzed} analyzed</p>

      {results.length === 0 && (
        <p className="drop-secondary" style={{ marginTop: '1rem' }}>No Solana addresses found in file.</p>
      )}

      {results.map((r, i) => (
        <div key={i} className="scan-result-row">
          <div className="scan-row-top">
            <span className="cp-index">#{i + 1}</span>
            <span className="cp-wallet">{r.wallet}</span>
            {r.risk && <RiskBadge label={r.risk.label} score={r.risk.score} />}
          </div>
          {r.risk && (
            <div className="scan-row-detail">
              <span className="report-type">{r.risk.wallet_type}</span>
              {r.risk.flags.length > 0 && (
                <span className="flag-item" style={{ marginLeft: '1rem' }}>&#x25A0; {r.risk.flags[0]}</span>
              )}
            </div>
          )}
          {r.error && <p className="error-msg">{r.error}</p>}
        </div>
      ))}
    </div>
  )
}
