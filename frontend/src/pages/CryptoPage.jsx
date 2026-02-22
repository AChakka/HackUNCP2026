import { useState, useRef, useEffect } from 'react'
import './CryptoPage.css'

const API = 'http://localhost:8000'

const RISK_COLOR = { LOW: '#4a4a4a', MEDIUM: '#b8860b', HIGH: '#c0392b' }

const KNOWN_LABELS = {
  // Core programs
  '11111111111111111111111111111111': 'System',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL Token',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'ATA Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex',
  'BPFLoaderUpgradeab1e11111111111111111111111': 'BPF Loader',
  // DEX / DeFi protocols
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin': 'Serum DEX',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K': 'Magic Eden',
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX': 'OpenBook DEX',
  'So11111111111111111111111111111111111111112': 'Wrapped SOL',
}

const nodeLabel = (addr) => KNOWN_LABELS[addr] ?? (addr.slice(0, 8) + '...')

const STAGES = [
  'OPENING CASE FILE...',
  'EXAMINING THE BODY...',
  'COLLECTING EVIDENCE...',
  'RUNNING TOXICOLOGY...',
  'FILING REPORT...',
]

// ms per stage — 5 stages, ~12s total budget
const STAGE_DURATION = 2400

function LoadingDisplay({ stage }) {
  const RADIUS = 18
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <div className="loading-display">
      <div className="loading-circles">
        {STAGES.map((label, i) => {
          const filled = i < stage
          const active = i === stage
          const progress = filled ? 1 : active ? 0.85 : 0
          const offset = CIRCUMFERENCE * (1 - progress)
          return (
            <div key={i} className="loading-circle-wrap">
              <svg className="loading-svg" viewBox="0 0 44 44" width="44" height="44">
                <circle
                  cx="22" cy="22" r={RADIUS}
                  fill="none"
                  stroke="#111"
                  strokeWidth="2"
                />
                <circle
                  cx="22" cy="22" r={RADIUS}
                  fill="none"
                  stroke={filled ? '#c0392b' : active ? '#c0392b' : '#1a1a1a'}
                  strokeWidth="2"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 22 22)"
                  className={active ? 'loading-arc--active' : ''}
                  style={{ transition: filled ? 'stroke-dashoffset 0.4s ease' : 'stroke-dashoffset 2.2s linear' }}
                />
                <text
                  x="22" y="26"
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill={filled || active ? '#c0392b' : '#222'}
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
              </svg>
              <span className={`loading-stage-label ${active ? 'loading-stage-label--active' : filled ? 'loading-stage-label--done' : ''}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <p className="loading-status">
        {stage < STAGES.length ? STAGES[stage] : 'FINALIZING...'}
      </p>
    </div>
  )
}

export default function CryptoPage() {
  const [mode, setMode] = useState('wallet') // 'wallet' | 'file'
  const [wallet, setWallet] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const stageTimerRef = useRef(null)

  const reset = () => { setResult(null); setError(null) }

  const startStageTimer = () => {
    setStage(0)
    let current = 0
    stageTimerRef.current = setInterval(() => {
      current = (current + 1) % STAGES.length
      setStage(current)
    }, STAGE_DURATION)
  }

  const stopStageTimer = () => {
    clearInterval(stageTimerRef.current)
    setStage(STAGES.length - 1)
  }

  useEffect(() => {
    return () => clearInterval(stageTimerRef.current)
  }, [])

  const handleAnalyzeWallet = async () => {
    if (!wallet.trim()) return
    setLoading(true); setError(null); setResult(null)
    startStageTimer()
    try {
      const res = await fetch(`${API}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim(), limit: 5 }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      stopStageTimer()
      setResult({ type: 'wallet', data: await res.json() })
    } catch (e) {
      stopStageTimer()
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScanFile = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    startStageTimer()
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API}/scan-file`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      stopStageTimer()
      setResult({ type: 'file', data: await res.json() })
    } catch (e) {
      stopStageTimer()
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

      {/* Loading */}
      {loading && <LoadingDisplay stage={stage} />}

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
  const color = RISK_COLOR[label] ?? '#444'
  return (
    <div className="risk-badge" style={{ borderColor: color, color }}>
      <span className="risk-label">{label}</span>
      <span className="risk-score">{score}/100</span>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

function TraceGraph({ wallet }) {
  const [traceData, setTraceData] = useState(null)
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceError, setTraceError] = useState(null)
  const [visible, setVisible] = useState(false)

  const fetchTrace = async () => {
    if (traceData) { setVisible(v => !v); return }
    setTraceLoading(true)
    try {
      const res = await fetch(`${API}/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, limit: 5 }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setTraceData(data)
      setVisible(true)
    } catch (e) {
      setTraceError(e.message)
    } finally {
      setTraceLoading(false)
    }
  }

  const W = 700, H = 340
  const CX = W / 2, CY = H / 2
  const RING = 130

  const nodes = traceData?.nodes ?? []
  const edges = traceData?.edges ?? []
  const maxCount = edges.length > 0 ? Math.max(...edges.map(e => e.count)) : 1

  const counterparties = nodes.filter(n => n !== wallet)
  const nodePos = { [wallet]: { x: CX, y: CY, isCenter: true } }
  counterparties.forEach((addr, i) => {
    const angle = (2 * Math.PI * i / counterparties.length) - Math.PI / 2
    nodePos[addr] = {
      x: CX + RING * Math.cos(angle),
      y: CY + RING * Math.sin(angle),
      isCenter: false,
    }
  })

  return (
    <div className="trace-section">
      <button className="trace-btn" onClick={fetchTrace} disabled={traceLoading}>
        {traceLoading ? '// MAPPING...' : visible ? '// HIDE NETWORK //' : '// TRACE NETWORK //'}
      </button>
      {traceError && <p className="error-msg" style={{ marginTop: '0.5rem' }}>{traceError}</p>}
      {visible && traceData && (
        <div className="trace-graph-wrap">
          <p className="result-section-label">// TRANSACTION NETWORK MAP //</p>
          <svg className="trace-svg" viewBox={`0 0 ${W} ${H}`} width="100%">
            {edges.map((e, i) => {
              const from = nodePos[e.from]
              const to = nodePos[e.to]
              if (!from || !to) return null
              const w = 1 + (e.count / maxCount) * 2.5
              const op = 0.25 + (e.count / maxCount) * 0.55
              return (
                <line key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="#c0392b" strokeWidth={w} strokeOpacity={op}
                />
              )
            })}
            {Object.entries(nodePos).map(([addr, pos]) => (
              <g key={addr}>
                {pos.isCenter && (
                  <circle cx={pos.x} cy={pos.y} r={16} fill="none" stroke="#c0392b" strokeWidth="1">
                    <animate attributeName="r" values="18;28;18" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={pos.isCenter ? 16 : 8}
                  fill={pos.isCenter ? '#c0392b' : '#0d0d0d'}
                  stroke={pos.isCenter ? '#c0392b' : '#2a2a2a'}
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.isCenter ? pos.y + 28 : pos.y + 18}
                  textAnchor="middle"
                  fontSize={pos.isCenter ? 8 : 6.5}
                  fontFamily="monospace"
                  fill={pos.isCenter ? '#c0392b' : '#3a3a3a'}
                >
                  {nodeLabel(addr)}
                </text>
              </g>
            ))}
          </svg>
          <p className="scan-meta">
            {traceData.tx_count} tx sampled &nbsp;·&nbsp; {traceData.unique_counterparties} unique counterparties
          </p>
        </div>
      )}
    </div>
  )
}

function WalletReport({ data }) {
  const { wallet, summary, risk, profile, balance_sol } = data
  return (
    <div className="result-panel">
      <p className="result-section-label">// INVESTIGATION REPORT //</p>

      <div className="report-top">
        <div>
          <p className="report-wallet-label">SUBJECT WALLET</p>
          <p className="report-wallet">{wallet}</p>
          <p className="report-type">{risk.wallet_type}</p>
          {balance_sol != null && (
            <p className="report-balance">
              <span className="balance-label">BALANCE</span>
              <span className="balance-value">{balance_sol} SOL</span>
            </p>
          )}
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
            <p key={i} className="flag-item">{f}</p>
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

      <TraceGraph wallet={wallet} />
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
