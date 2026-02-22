import { useState, useRef, useEffect } from 'react'
import './CryptoPage.css'

const API = 'http://localhost:8000'

const RISK_COLOR = { LOW: '#4a4a4a', MEDIUM: '#b8860b', HIGH: '#c0392b' }

const KNOWN_LABELS = {
  // System programs
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
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD': 'Marinade',
  // Pump.fun
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  // Bridges
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb': 'Wormhole',
  '3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5': 'Allbridge',
}

const CATEGORY_COLOR = {
  exchange:  '#2563eb',
  exploiter: '#c0392b',
  bridge:    '#7c3aed',
  mixer:     '#dc2626',
  protocol:  '#16a34a',
  pumpfun:   '#ea580c',
}

const HOP_COLORS = ['#c0392b', '#e67e22', '#2980b9']

const nodeLabel = (addr) => KNOWN_LABELS[addr] ?? (addr.slice(0, 8) + '...')

const STAGES = [
  'OPENING CASE FILE...',
  'EXAMINING THE BODY...',
  'COLLECTING EVIDENCE...',
  'RUNNING TOXICOLOGY...',
  'FILING REPORT...',
]

const STAGE_DURATION = 2400

function LoadingDisplay({ stage }) {
  const R = 78
  const CIRCUMFERENCE = 2 * Math.PI * R
  const progress = Math.min((stage + 0.75) / STAGES.length, 1)
  const offset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="loading-overlay">
      <div className="loading-center">
        <svg viewBox="0 0 200 200" width="200" height="200">
          {/* track ring */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="#111" strokeWidth="3" />
          {/* progress ring */}
          <circle
            cx="100" cy="100" r={R}
            fill="none"
            stroke="#c0392b"
            strokeWidth="3"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 2s linear' }}
          />
          {/* inner label */}
          <text x="100" y="93" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#2a2a2a" letterSpacing="3">CORONER</text>
          <text x="100" y="113" textAnchor="middle" fontSize="20" fontFamily="monospace" fill="#c0392b" fontWeight="bold">
            {stage + 1}/{STAGES.length}
          </text>
        </svg>

        <div className="loading-stage-list">
          {STAGES.map((label, i) => (
            <p key={i} className={`loading-stage-row ${
              i < stage ? 'loading-row--done' : i === stage ? 'loading-row--active' : 'loading-row--pending'
            }`}>
              <span className="loading-row-icon">{i < stage ? '[X]' : i === stage ? '[>]' : '[ ]'}</span>
              {label}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CryptoPage() {
  const [mode, setMode] = useState('wallet')
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

  useEffect(() => { return () => clearInterval(stageTimerRef.current) }, [])

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
        <button className={`mode-btn ${mode === 'wallet' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('wallet'); reset() }}>
          WALLET ADDRESS
        </button>
        <button className={`mode-btn ${mode === 'file' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('file'); reset() }}>
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
            <button className="analyze-btn" disabled={!wallet.trim() || loading}
              onClick={handleAnalyzeWallet}>
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
          <button className="analyze-btn" style={{ marginTop: '1rem' }}
            disabled={!file || loading} onClick={handleScanFile}>
            {loading ? 'SCANNING...' : 'SCAN FILE'}
          </button>
        </div>
      )}

      {loading && <LoadingDisplay stage={stage} />}

      {error && (
        <div className="result-error">
          <p className="drop-tag">// ERROR //</p>
          <p className="error-msg">{error}</p>
        </div>
      )}

      {result?.type === 'wallet' && <WalletReport data={result.data} />}
      {result?.type === 'file' && <FileScanResult data={result.data} />}
    </main>
  )
}

// ── Shared components ──────────────────────────────────────────────────────

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

function CategoryBadge({ category, label }) {
  const color = CATEGORY_COLOR[category] ?? '#555'
  return (
    <span className="cp-label" style={{ borderColor: color, color }}>
      {label}
    </span>
  )
}

// ── Timeline chart ─────────────────────────────────────────────────────────

function TimelineChart({ transactions }) {
  if (!transactions || transactions.length === 0) return null
  const withTs = transactions.filter(t => t.timestamp)
  if (withTs.length === 0) return null

  const min = Math.min(...withTs.map(t => t.timestamp))
  const max = Math.max(...withTs.map(t => t.timestamp))
  const range = max - min || 1

  const W = 700, H = 64, PAD = 28
  const xPos = (ts) => PAD + ((ts - min) / range) * (W - PAD * 2)
  const fmt = (ts) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div>
      <p className="result-section-label">// TRANSACTION TIMELINE //</p>
      <svg className="timeline-svg" viewBox={`0 0 ${W} ${H}`} width="100%">
        {/* baseline */}
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#1c1c1c" strokeWidth="1" />
        {/* end ticks */}
        <line x1={PAD} y1={H / 2 - 5} x2={PAD} y2={H / 2 + 5} stroke="#2a2a2a" strokeWidth="1" />
        <line x1={W - PAD} y1={H / 2 - 5} x2={W - PAD} y2={H / 2 + 5} stroke="#2a2a2a" strokeWidth="1" />
        {/* dots */}
        {withTs.map((t, i) => (
          <g key={i}>
            <line x1={xPos(t.timestamp)} y1={H / 2 - 10} x2={xPos(t.timestamp)} y2={H / 2 - 5}
              stroke="#c0392b" strokeWidth="1" opacity="0.5" />
            <circle cx={xPos(t.timestamp)} cy={H / 2} r="4.5" fill="#c0392b" opacity="0.85" />
          </g>
        ))}
        {/* date labels */}
        <text x={PAD} y={H - 6} fontSize="7.5" fontFamily="monospace" fill="#2a2a2a">{fmt(min)}</text>
        {min !== max && (
          <text x={W - PAD} y={H - 6} fontSize="7.5" fontFamily="monospace" fill="#2a2a2a" textAnchor="end">
            {fmt(max)}
          </text>
        )}
      </svg>
      <p className="scan-meta">{withTs.length} transaction(s) in sample window</p>
    </div>
  )
}

// ── Token Holdings ──────────────────────────────────────────────────────────

function TokenHoldings({ wallet }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (data) { setVisible(v => !v); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setData(await res.json())
      setVisible(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="token-section">
      <button className="trace-btn" onClick={load} disabled={loading}>
        {loading ? '// LOADING...' : visible ? '// HIDE TOKEN HOLDINGS //' : '// LOAD TOKEN HOLDINGS //'}
      </button>
      {error && <p className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</p>}
      {visible && data && (
        <div className="token-holdings-panel">
          <p className="result-section-label">// SPL TOKEN HOLDINGS //</p>
          {data.count === 0 ? (
            <p className="scan-meta">No SPL token balances found.</p>
          ) : (
            <>
              <p className="scan-meta">{data.count} token account(s) with non-zero balance</p>
              <div className="token-list">
                {data.tokens.slice(0, 10).map((t, i) => (
                  <div key={i} className="token-row">
                    <span className="token-mint">
                      {t.label ? (
                        <CategoryBadge category={t.category} label={t.label} />
                      ) : (
                        <span className="cp-wallet">{t.mint.slice(0, 8)}...{t.mint.slice(-4)}</span>
                      )}
                    </span>
                    <span className="token-amount">{t.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  </div>
                ))}
                {data.count > 10 && (
                  <p className="scan-meta" style={{ marginTop: '0.5rem' }}>+{data.count - 10} more token account(s)</p>
                )}
              </div>
            </>
          )}
          {data.error && <p className="error-msg">{data.error}</p>}
        </div>
      )}
    </div>
  )
}

// ── 1-Hop Trace Graph ──────────────────────────────────────────────────────

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

  const W = 700, H = 340, CX = W / 2, CY = H / 2, RING = 130

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
              const from = nodePos[e.from], to = nodePos[e.to]
              if (!from || !to) return null
              const w = 1 + (e.count / maxCount) * 2.5
              const op = 0.25 + (e.count / maxCount) * 0.55
              return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="#c0392b" strokeWidth={w} strokeOpacity={op} />
            })}
            {Object.entries(nodePos).map(([addr, pos]) => (
              <g key={addr}>
                {pos.isCenter && (
                  <circle cx={pos.x} cy={pos.y} r={16} fill="none" stroke="#c0392b" strokeWidth="1">
                    <animate attributeName="r" values="18;28;18" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={pos.x} cy={pos.y}
                  r={pos.isCenter ? 16 : 8}
                  fill={pos.isCenter ? '#c0392b' : '#0d0d0d'}
                  stroke={pos.isCenter ? '#c0392b' : '#2a2a2a'}
                  strokeWidth="1" />
                <text x={pos.x} y={pos.isCenter ? pos.y + 28 : pos.y + 18}
                  textAnchor="middle" fontSize={pos.isCenter ? 8 : 6.5}
                  fontFamily="monospace" fill={pos.isCenter ? '#c0392b' : '#3a3a3a'}>
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

// ── 2-Hop Multi-Hop Graph ──────────────────────────────────────────────────

function MultiHopGraph({ wallet }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)

  const fetchHops = async () => {
    if (data) { setVisible(v => !v); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/multihop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, hops: 2, limit: 2 }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setData(await res.json())
      setVisible(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const W = 700, H = 420, CX = W / 2, CY = H / 2
  const RINGS = [0, 110, 205]

  const nodesByHop = [[], [], []]
  if (data) {
    data.nodes.forEach(n => { if (nodesByHop[n.hop]) nodesByHop[n.hop].push(n.address) })
  }

  const nodePos = {}
  if (data) {
    nodesByHop.forEach((group, hop) => {
      group.forEach((addr, i) => {
        if (hop === 0) {
          nodePos[addr] = { x: CX, y: CY, hop }
        } else {
          const angle = (2 * Math.PI * i / group.length) - Math.PI / 2
          nodePos[addr] = {
            x: CX + RINGS[hop] * Math.cos(angle),
            y: CY + RINGS[hop] * Math.sin(angle),
            hop,
          }
        }
      })
    })
  }

  const maxHop = data ? data.nodes.reduce((m, n) => Math.max(m, n.hop), 0) : 0

  return (
    <div className="multihop-section">
      <button className="trace-btn" onClick={fetchHops} disabled={loading}>
        {loading ? '// TRACING HOPS...' : visible ? '// HIDE 2-HOP MAP //' : '// EXPAND 2-HOP NETWORK //'}
      </button>
      {error && <p className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</p>}
      {visible && data && (
        <div className="trace-graph-wrap">
          <p className="result-section-label">// MULTI-HOP MONEY FLOW //</p>
          <svg className="trace-svg" viewBox={`0 0 ${W} ${H}`} width="100%">
            {data.edges.map((e, i) => {
              const from = nodePos[e.from], to = nodePos[e.to]
              if (!from || !to) return null
              const color = HOP_COLORS[e.hop - 1] ?? '#444'
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={color} strokeWidth="1.2" strokeOpacity="0.4" />
              )
            })}
            {Object.entries(nodePos).map(([addr, pos]) => {
              const color = HOP_COLORS[pos.hop] ?? '#444'
              const r = pos.hop === 0 ? 14 : pos.hop === 1 ? 8 : 5
              const lbl = KNOWN_LABELS[addr] ?? (addr.slice(0, 6) + '...')
              return (
                <g key={addr}>
                  {pos.hop === 0 && (
                    <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke={color} strokeWidth="1">
                      <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={pos.x} cy={pos.y} r={r}
                    fill={pos.hop === 0 ? color : '#0d0d0d'}
                    stroke={color} strokeWidth="1" />
                  <text x={pos.x} y={pos.y + r + 10} textAnchor="middle"
                    fontSize={pos.hop === 0 ? 7.5 : 6.5} fontFamily="monospace"
                    fill={color} opacity="0.9">
                    {lbl}
                  </text>
                </g>
              )
            })}
          </svg>
          <div className="mh-legend">
            {['HOP 0 — SUBJECT', 'HOP 1 — DIRECT', 'HOP 2 — SECONDARY'].slice(0, maxHop + 1).map((lbl, i) => (
              <div key={i} className="mh-legend-item">
                <span className="mh-dot" style={{ background: HOP_COLORS[i] }} />
                <span className="mh-label">{lbl}</span>
              </div>
            ))}
          </div>
          <p className="scan-meta">
            {data.nodes.length} nodes &nbsp;·&nbsp; {data.edges.length} edges &nbsp;·&nbsp; {maxHop} hop(s) deep
          </p>
        </div>
      )}
    </div>
  )
}

// ── Wallet Report ──────────────────────────────────────────────────────────

function WalletReport({ data }) {
  const { wallet, summary, risk, profile, balance_sol, pumpfun_activity } = data

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

      {/* Pump.fun warning */}
      {pumpfun_activity && (
        <div className="pumpfun-alert">
          <span className="pumpfun-badge">PUMP.FUN</span>
          <span className="pumpfun-desc">
            Memecoin launchpad activity detected in sampled transactions.
            Wallet has interacted with <span style={{ color: '#ea580c' }}>Pump.fun</span> — associated with high-volatility speculative token trading.
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="report-summary">
        <p className="result-section-label">// SUMMARY //</p>
        <p className="summary-text">{summary}</p>
      </div>

      {/* Flags */}
      {risk.flags.length > 0 && (
        <div className="report-flags">
          <p className="result-section-label">// FLAGS //</p>
          {risk.flags.map((f, i) => <p key={i} className="flag-item">{f}</p>)}
        </div>
      )}

      {/* Transaction Timeline */}
      {profile.recent_transactions?.length > 0 && (
        <TimelineChart transactions={profile.recent_transactions} />
      )}

      {/* Token Holdings (lazy) */}
      <TokenHoldings wallet={wallet} />

      {/* Top Counterparties */}
      {profile.top_counterparties?.length > 0 && (
        <div className="report-counterparties">
          <p className="result-section-label">// TOP COUNTERPARTIES //</p>
          {profile.top_counterparties.map((cp, i) => (
            <div key={i} className="counterparty-row">
              <span className="cp-index">#{i + 1}</span>
              <span className="cp-wallet">{cp.wallet}</span>
              {cp.label && (
                <CategoryBadge category={cp.category} label={cp.label} />
              )}
              <span className="cp-count">{cp.count} tx</span>
            </div>
          ))}
        </div>
      )}

      {/* 1-Hop Network */}
      <TraceGraph wallet={wallet} />

      {/* 2-Hop Network */}
      <MultiHopGraph wallet={wallet} />
    </div>
  )
}

// ── File Scan Result ───────────────────────────────────────────────────────

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
