import { useState, useEffect, useRef } from 'react'
import './RansomPage.css'

const API = 'http://localhost:8001'

const STAGES = [
  'RECEIVING NOTE',
  'PARSING CONTENT',
  'RUNNING FAMILY MODEL',
  'DIALECT ANALYSIS',
  'COMPILING PROFILE',
]

const DIALECT_FLAG = {
  us: '🇺🇸', gb: '🇬🇧', au: '🇦🇺', ie: '🇮🇪', in: '🇮🇳',
}

const SAMPLE_NOTE = `ATTENTION! All of your important files have been encrypted!
Your documents, photos, databases, and other critical data are no longer accessible.

To recover your files, you must send 0.5 BTC to the following address within 72 hours:
1BoatSLRHtKNngkdXEeobR76b53LETtpyT

After payment is confirmed, you will receive the decryption key via email.
Contact: support@decrypt-help.onion

DO NOT attempt to remove this software. DO NOT contact law enforcement.
Your files will be permanently destroyed if you fail to comply.
The clock is ticking. You have been warned.`


// ── Loading animation ──────────────────────────────────────────────────────

function LoadingDisplay({ stage }) {
  return (
    <div className="rp-loading">
      <div className="rp-loading-circles">
        {STAGES.map((label, i) => (
          <div key={i} className={`rp-stage ${i < stage ? 'done' : i === stage ? 'active' : ''}`}>
            <div className="rp-stage-circle">
              {i < stage ? (
                <svg viewBox="0 0 36 36" width="36" height="36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#c0392b" strokeWidth="2" />
                  <polyline points="10,18 16,24 26,12" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : i === stage ? (
                <svg viewBox="0 0 36 36" width="36" height="36" className="rp-spin">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#333" strokeWidth="2" />
                  <path d="M18 3 A15 15 0 0 1 33 18" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 36 36" width="36" height="36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#222" strokeWidth="2" />
                </svg>
              )}
            </div>
            <span className={`rp-stage-label ${i === stage ? 'rp-stage-active' : ''}`}>{label}</span>
          </div>
        ))}
      </div>
      <p className="rp-loading-status">
        {stage < STAGES.length ? `[ ${STAGES[stage]} ]` : '[ DONE ]'}
      </p>
    </div>
  )
}


// ── Confidence bar ─────────────────────────────────────────────────────────

function ConfBar({ label, value, highlight }) {
  const pct = Math.round(value * 100)
  return (
    <div className={`rp-conf-row ${highlight ? 'rp-conf-top' : ''}`}>
      <span className="rp-conf-label">{label}</span>
      <div className="rp-conf-track">
        <div
          className="rp-conf-fill"
          style={{ width: `${pct}%`, background: highlight ? '#c0392b' : '#2a2a2a' }}
        />
      </div>
      <span className="rp-conf-pct">{pct}%</span>
    </div>
  )
}


// ── Result panel ───────────────────────────────────────────────────────────

const SOPHISTICATION_COLOR = {
  'Script Kiddie': '#444',
  'Low':           '#555',
  'Medium':        '#b8860b',
  'High':          '#c0392b',
  'Nation-State':  '#8b0000',
}

const NEGOTIATION_COLOR = {
  'Very Likely':    '#1a6b3c',
  'Likely':         '#2e7d52',
  'Unlikely':       '#b8860b',
  'Non-Negotiable': '#c0392b',
}

function AiCard({ ai }) {
  if (!ai || ai.error) return (
    <section className="rp-card">
      <p className="rp-card-tag">// AI THREAT INTELLIGENCE //</p>
      <p className="rp-kw-none">{ai?.error ?? 'No AI analysis available'}</p>
    </section>
  )

  const sophColor = SOPHISTICATION_COLOR[ai.sophistication] ?? '#555'
  const negColor  = NEGOTIATION_COLOR[ai.negotiation_likelihood] ?? '#555'

  return (
    <section className="rp-card">
      <p className="rp-card-tag">// AI THREAT INTELLIGENCE //</p>

      <div className="rp-ai-grid">

        <div className="rp-ai-cell">
          <p className="rp-ai-label">KNOWN GROUP RESEMBLANCE</p>
          <p className="rp-ai-value rp-ai-value--accent">{ai.known_group_resemblance ?? '—'}</p>
          {ai.confidence_note && <p className="rp-ai-note">{ai.confidence_note}</p>}
        </div>

        <div className="rp-ai-cell">
          <p className="rp-ai-label">ACTOR PROFILE</p>
          <p className="rp-ai-value">{ai.threat_actor_profile ?? '—'}</p>
        </div>

        <div className="rp-ai-cell rp-ai-cell--half">
          <p className="rp-ai-label">SOPHISTICATION</p>
          <p className="rp-ai-value" style={{ color: sophColor }}>{ai.sophistication ?? '—'}</p>
        </div>

        <div className="rp-ai-cell rp-ai-cell--half">
          <p className="rp-ai-label">TARGET PROFILE</p>
          <p className="rp-ai-value">{ai.target_profile ?? '—'}</p>
        </div>

        <div className="rp-ai-cell rp-ai-cell--half">
          <p className="rp-ai-label">NEGOTIATION</p>
          <p className="rp-ai-value" style={{ color: negColor }}>{ai.negotiation_likelihood ?? '—'}</p>
        </div>

        <div className="rp-ai-cell rp-ai-cell--half">
          <p className="rp-ai-label">PAYMENT DEADLINE</p>
          <p className="rp-ai-value">
            {ai.payment_deadline_hours != null ? `${ai.payment_deadline_hours} HRS` : '—'}
          </p>
        </div>

        {ai.attack_vector_hints && (
          <div className="rp-ai-cell">
            <p className="rp-ai-label">ATTACK VECTOR HINTS</p>
            <p className="rp-ai-value">{ai.attack_vector_hints}</p>
          </div>
        )}

        {ai.psychological_tactics?.length > 0 && (
          <div className="rp-ai-cell">
            <p className="rp-ai-label">PSYCHOLOGICAL TACTICS</p>
            <div className="rp-ai-tags">
              {ai.psychological_tactics.map(t => (
                <span key={t} className="rp-ai-tag">{t}</span>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}

function ResultPanel({ data }) {
  const { family, dialect, heuristics, ai_analysis } = data
  const { iocs, urgency_keywords, payment_keywords, threat_keywords, urgency_score } = heuristics

  const hasIocs = Object.keys(iocs).length > 0
  const urgencyLabel = urgency_score >= 60 ? 'HIGH' : urgency_score >= 30 ? 'MEDIUM' : 'LOW'
  const urgencyColor = urgency_score >= 60 ? '#c0392b' : urgency_score >= 30 ? '#b8860b' : '#444'

  return (
    <div className="rp-result">

      {/* ── Family ─────────────────────────────────────────── */}
      <section className="rp-card">
        <p className="rp-card-tag">// RANSOMWARE FAMILY //</p>
        <div className="rp-top-match">
          <span className="rp-top-name">{family.top}</span>
          <span className="rp-top-conf">{Math.round(family.confidence * 100)}% MATCH</span>
        </div>
        <div className="rp-bars">
          {Object.entries(family.all_scores).map(([cls, score]) => (
            <ConfBar key={cls} label={cls} value={score} highlight={cls === family.top} />
          ))}
        </div>
      </section>

      {/* ── Dialect ────────────────────────────────────────── */}
      <section className="rp-card">
        <p className="rp-card-tag">// LINGUISTIC ORIGIN //</p>
        <div className="rp-top-match">
          <span className="rp-top-name">
            {DIALECT_FLAG[dialect.code] ?? ''} {dialect.label.toUpperCase()}
          </span>
          <span className="rp-top-conf">{Math.round(dialect.confidence * 100)}% CONFIDENCE</span>
        </div>
        <div className="rp-bars">
          {Object.entries(dialect.all_scores).map(([code, score]) => (
            <ConfBar key={code} label={code.toUpperCase()} value={score} highlight={code === dialect.code} />
          ))}
        </div>
      </section>

      {/* ── Behavioral signals ─────────────────────────────── */}
      <section className="rp-card">
        <p className="rp-card-tag">// BEHAVIORAL SIGNALS //</p>

        <div className="rp-urgency-row">
          <span className="rp-urgency-label">THREAT LEVEL</span>
          <div className="rp-urgency-track">
            <div className="rp-urgency-fill" style={{ width: `${urgency_score}%`, background: urgencyColor }} />
          </div>
          <span className="rp-urgency-badge" style={{ color: urgencyColor }}>{urgencyLabel}</span>
        </div>

        <div className="rp-kw-grid">
          {[
            { label: 'URGENCY', list: urgency_keywords, color: '#b8860b' },
            { label: 'PAYMENT', list: payment_keywords, color: '#1a6b3c' },
            { label: 'THREATS', list: threat_keywords,  color: '#c0392b' },
          ].map(({ label, list, color }) => (
            <div key={label} className="rp-kw-col">
              <p className="rp-kw-heading" style={{ color }}>{label}</p>
              {list.length === 0
                ? <p className="rp-kw-none">—</p>
                : list.map(w => <p key={w} className="rp-kw-item">{w}</p>)
              }
            </div>
          ))}
        </div>

        <div className="rp-meta-row">
          <span>{heuristics.word_count} words</span>
          <span>{heuristics.char_count} characters</span>
        </div>
      </section>

      {/* ── IOCs ───────────────────────────────────────────── */}
      {hasIocs && (
        <section className="rp-card rp-card--ioc">
          <p className="rp-card-tag">// INDICATORS OF COMPROMISE //</p>
          {iocs.bitcoin_addresses?.map(a => (
            <div key={a} className="rp-ioc-row">
              <span className="rp-ioc-type">BTC</span>
              <span className="rp-ioc-val">{a}</span>
            </div>
          ))}
          {iocs.monero_addresses?.map(a => (
            <div key={a} className="rp-ioc-row">
              <span className="rp-ioc-type">XMR</span>
              <span className="rp-ioc-val">{a}</span>
            </div>
          ))}
          {iocs.onion_urls?.map(u => (
            <div key={u} className="rp-ioc-row">
              <span className="rp-ioc-type">ONION</span>
              <span className="rp-ioc-val">{u}</span>
            </div>
          ))}
          {iocs.emails?.map(e => (
            <div key={e} className="rp-ioc-row">
              <span className="rp-ioc-type">EMAIL</span>
              <span className="rp-ioc-val">{e}</span>
            </div>
          ))}
        </section>
      )}

      {/* ── AI Intelligence ────────────────────────────────── */}
      <AiCard ai={ai_analysis} />
    </div>
  )
}


// ── Main page ──────────────────────────────────────────────────────────────

export default function RansomPage() {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage]     = useState(0)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const timerRef              = useRef(null)

  const runStages = () => {
    let s = 0
    setStage(0)
    timerRef.current = setInterval(() => {
      s += 1
      if (s >= STAGES.length) clearInterval(timerRef.current)
      else setStage(s)
    }, 900)
  }

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    runStages()

    try {
      const res  = await fetch(`${API}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Wait for last stage animation to finish
      setTimeout(() => {
        clearInterval(timerRef.current)
        setStage(STAGES.length)
        setResult(data)
        setLoading(false)
      }, 900 * (STAGES.length + 1))
    } catch (e) {
      clearInterval(timerRef.current)
      setError(e.message || 'Analysis failed. Is the ransom-module backend running?')
      setLoading(false)
    }
  }

  const handleClear = () => {
    setText('')
    setResult(null)
    setError(null)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <main className="rp-main">

      <div className="rp-hero">
        <pre className="rp-ascii">{`▓█████▄  ██▓  ▄████  ██▓▄▄▄█████▓ ██▓ ▄▄▄       ██▓         ██████  ██ ▄█▀▓█████▄▄▄█████▓ ▄████▄   ██░ ██  ██▓ ███▄    █   ▄████
▒██▀ ██▌▓██▒ ██▒ ▀█▒▓██▒▓  ██▒ ▓▒▓██▒▒████▄    ▓██▒       ▒██    ▒  ██▄█▒ ▓█   ▀▓  ██▒ ▓▒▒██▀ ▀█  ▓██░ ██▒▓██▒ ██ ▀█   █  ██▒ ▀█▒
░██   █▌▒██▒▒██░▄▄▄░▒██▒▒ ▓██░ ▒░▒██▒▒██  ▀█▄  ▒██░       ░ ▓██▄   ▓███▄░ ▒███  ▒ ▓██░ ▒░▒▓█    ▄ ▒██▀▀██░▒██▒▓██  ▀█ ██▒▒██░▄▄▄░
░▓█▄   ▌░██░░▓█  ██▓░██░░ ▓██▓ ░ ░██░░██▄▄▄▄██ ▒██░         ▒   ██▒▓██ █▄ ▒▓█  ▄░ ▓██▓ ░ ▒▓▓▄ ▄██▒░▓█ ░██ ░██░▓██▒  ▐▌██▒░▓█  ██▓
░▒████▓ ░██░░▒▓███▀▒░██░  ▒██▒ ░ ░██░ ▓█   ▓██▒░██████▒   ▒██████▒▒▒██▒ █▄░▒████▒ ▒██▒ ░ ▒ ▓███▀ ░░▓█▒░██▓░██░▒██░   ▓██░░▒▓███▀▒
 ▒▒▓  ▒ ░▓   ░▒   ▒ ░▓    ▒ ░░   ░▓   ▒▒   ▓▒█░░ ▒░▓  ░   ▒ ▒▓▒ ▒ ░▒ ▒▒ ▓▒░░ ▒░ ░ ▒ ░░   ░ ░▒ ▒  ░ ▒ ░░▒░▒░▓  ░ ▒░   ▒ ▒  ░▒   ▒
 ░ ▒  ▒  ▒ ░  ░   ░  ▒ ░    ░     ▒ ░  ▒   ▒▒ ░░ ░ ▒  ░   ░ ░▒  ░ ░░ ░▒ ▒░ ░ ░  ░   ░      ░  ▒    ▒ ░▒░ ░ ▒ ░░ ░░   ░ ▒░  ░   ░
 ░ ░  ░  ▒ ░░ ░   ░  ▒ ░  ░       ▒ ░  ░   ▒     ░ ░      ░  ░  ░  ░ ░░ ░    ░    ░      ░         ░  ░░ ░ ▒ ░   ░   ░ ░ ░ ░   ░
   ░     ░        ░  ░            ░        ░  ░    ░  ░         ░  ░  ░      ░  ░        ░ ░       ░  ░  ░ ░           ░       ░
 ░                                                                                       ░                                       `}</pre>
        <p className="rp-sub">
          Paste a ransom note or threat message. Identifies ransomware family, linguistic origin,
          psychological tactics, and threat actor resemblance.
        </p>
      </div>

      <div className="rp-input-block">
        <div className="rp-textarea-wrap">
          <p className="rp-textarea-tag">// PASTE NOTE BELOW //</p>
          <textarea
            className="rp-textarea"
            placeholder="ATTENTION! All of your files have been encrypted..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="rp-btn-row">
          <button
            className="rp-btn rp-btn--ghost"
            onClick={() => setText(SAMPLE_NOTE)}
            disabled={loading}
          >
            LOAD SAMPLE
          </button>
          <button
            className="rp-btn rp-btn--ghost"
            onClick={handleClear}
            disabled={loading || (!text && !result)}
          >
            CLEAR
          </button>
          <button
            className="rp-btn rp-btn--primary"
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
          >
            {loading ? 'ANALYZING...' : 'ANALYZE NOTE'}
          </button>
        </div>
      </div>

      {loading && <LoadingDisplay stage={stage} />}

      {error && (
        <div className="rp-error">
          <span className="rp-error-tag">ERROR</span> {error}
        </div>
      )}

      {result && !loading && <ResultPanel data={result} />}
    </main>
  )
}
