import { useState, useRef, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import bloodImg from './assets/9gtem78jepmgj4390oifvtpo12.png'
import cursorImg from './assets/7qm8h0d555imegvquob85gn0ve.png'
import CryptoPage from './pages/CryptoPage.jsx'
import RansomPage from './pages/RansomPage.jsx'
import CoronerPage from './pages/CoronerPage.jsx'

const INVESTIGATION_STAGES = [
  'FILE INTAKE',
  'TOOL DISPATCH',
  'AI ANALYSIS',
  'SYNTHESIS',
  'GENERATING REPORT',
]

function InvestigationOverlay({ currentStage }) {
  const total = INVESTIGATION_STAGES.length
  const r = 78
  const circumference = 2 * Math.PI * r
  const filled = currentStage >= 0 ? (currentStage / (total - 1)) * circumference : 0
  const offset = circumference - filled

  return (
    <div className="home-loading-overlay">
      <div className="home-loading-center">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <circle
            cx="100" cy="100" r={r}
            fill="none"
            stroke="#c0392b"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="square"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 0.9s ease' }}
          />
          <text x="100" y="95" textAnchor="middle" fill="#fff"
            fontFamily="monospace" fontSize="11" letterSpacing="2">
            CORONER
          </text>
          <text x="100" y="114" textAnchor="middle" fill="#c0392b"
            fontFamily="monospace" fontSize="8" letterSpacing="1">
            {currentStage >= 0 ? INVESTIGATION_STAGES[currentStage] : ''}
          </text>
        </svg>

        <ul className="home-loading-stages">
          {INVESTIGATION_STAGES.map((s, i) => {
            const done   = i < currentStage
            const active = i === currentStage
            return (
              <li key={i} className={`home-stage-row ${done ? 'home-stage--done' : active ? 'home-stage--active' : 'home-stage--pending'}`}>
                <span className="home-stage-icon">{done ? '[X]' : active ? '[>]' : '[ ]'}</span>
                {s}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Cursor() {
  const [pos, setPos] = useState({ x: -200, y: -200 })

  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <img
      src={cursorImg}
      className="custom-cursor"
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
      alt=""
    />
  )
}

function Header() {
  const location = useLocation()
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo-area" style={{ textDecoration: 'none' }}>
          <div className="logo-placeholder" />
          <span className="logo-text">CORONER</span>
        </Link>
        <nav className="nav">
          <Link to="/" className={location.pathname === '/' ? 'nav-active' : ''}>Home</Link>
          <Link to="/crypto" className={location.pathname === '/crypto' ? 'nav-active' : ''}>Wallet Trace</Link>
          <Link to="/ransom" className={location.pathname === '/ransom' ? 'nav-active' : ''}>Digital Sketch</Link>
          <Link to="/coroner" className={location.pathname === '/coroner' ? 'nav-active' : ''}>Coroner</Link>
        </nav>
      </div>
    </header>
  )
}

function HomePage() {
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState([])
  const [investigating, setInvestigating] = useState(false)
  const [currentStage, setCurrentStage] = useState(-1)
  const inputRef = useRef(null)
  const stageTimerRef = useRef(null)
  const navigate = useNavigate()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) setFiles(prev => [...prev, ...dropped])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length) setFiles(prev => [...prev, ...selected])
    inputRef.current.value = ''
  }

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const handleAnalyze = async () => {
    if (!files.length || investigating) return
    setInvestigating(true)
    setCurrentStage(0)

    // Tick through stages while waiting for the API
    let stage = 0
    stageTimerRef.current = setInterval(() => {
      stage = Math.min(stage + 1, INVESTIGATION_STAGES.length - 2)
      setCurrentStage(stage)
    }, 4500)

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('http://localhost:8002/api/start-investigation', {
        method: 'POST',
        body: formData,
      })
      clearInterval(stageTimerRef.current)
      setCurrentStage(INVESTIGATION_STAGES.length - 1)

      if (!res.ok) throw new Error('Investigation failed')
      const data = await res.json()

      setTimeout(() => {
        navigate('/coroner', {
          state: {
            session_id: data.session_id,
            report: data.report,
            file_name: data.file_name,
          },
        })
      }, 600)
    } catch (err) {
      clearInterval(stageTimerRef.current)
      console.error(err)
      setInvestigating(false)
      setCurrentStage(-1)
    }
  }

  const handleClear = () => {
    setFiles([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="main">
      {investigating && <InvestigationOverlay currentStage={currentStage} />}

      <div className="hero">
        <div className="ascii-wrap">
          <img src={bloodImg} className="blood-bg" alt="" aria-hidden="true" />
          <pre className="ascii-logo">{` ▄████▄   ▒█████   ██▀███   ▒█████   ███▄    █ ▓█████  ██▀███
▒██▀ ▀█  ▒██▒  ██▒▓██ ▒ ██▒▒██▒  ██▒ ██ ▀█   █ ▓█   ▀ ▓██ ▒ ██▒
▒▓█    ▄ ▒██░  ██▒▓██ ░▄█ ▒▒██░  ██▒▓██  ▀█ ██▒▒███   ▓██ ░▄█ ▒
▒▓▓▄ ▄██▒▒██   ██░▒██▀▀█▄  ▒██   ██░▓██▒  ▐▌██▒▒▓█  ▄ ▒██▀▀█▄
▒ ▓███▀ ░░ ████▓▒░░██▓ ▒██▒░ ████▓▒░▒██░   ▓██░░▒████▒░██▓ ▒██▒
░ ░▒ ▒  ░░ ▒░▒░▒░ ░ ▒▓ ░▒▓░░ ▒░▒░▒░ ░ ▒░   ▒ ▒ ░░ ▒░ ░░ ▒▓ ░▒▓░
  ░  ▒     ░ ▒ ▒░   ░▒ ░ ▒░  ░ ▒ ▒░ ░ ░░   ░ ▒░ ░ ░  ░  ░▒ ░ ▒░
░        ░ ░ ░ ▒    ░░   ░ ░ ░ ░ ▒     ░   ░ ░    ░     ░░   ░
░ ░          ░ ░     ░         ░ ░           ░    ░  ░   ░
░                                                              `}</pre>
        </div>
        <p className="hero-sub">Upload any file for full forensic AI analysis — entropy, AV scanning, metadata extraction, timeline reconstruction.</p>
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''} ${files.length ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current.click()}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={handleFileInput} />

        {files.length === 0 ? (
          <div className="drop-content">
            <p className="drop-tag">// EVIDENCE INTAKE //</p>
            <div className="drop-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            </div>
            <p className="drop-primary">DROP EVIDENCE HERE</p>
            <p className="drop-secondary">disk images / memory dumps / log files / raw files</p>
            <p className="drop-secondary">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</p>
          </div>
        ) : (
          <div className="file-list-preview">
            <div className="file-list-header">
              <span className="file-meta-tag">{files.length} FILE{files.length > 1 ? 'S' : ''} QUEUED</span>
              <button className="clear-btn" onClick={(e) => { e.stopPropagation(); handleClear() }}>CLEAR ALL</button>
            </div>
            <div className="file-list-items">
              {files.map((f, i) => (
                <div key={i} className="file-list-row">
                  <span className="file-exhibit-tag">EX-{i + 1}</span>
                  <span className="file-list-name">{f.name}</span>
                  <span className="file-list-size">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button className="clear-btn" onClick={(e) => { e.stopPropagation(); removeFile(i) }}>×</button>
                </div>
              ))}
            </div>
            <p className="file-list-hint">// CLICK OR DROP TO ADD MORE //</p>
          </div>
        )}
      </div>

      <div className="pipeline">
        {['FILE INTAKE', 'TOOL DISPATCH', 'AI ANALYSIS', 'SYNTHESIS', 'CORONER'].map((label, i) => (
          <div key={i} className="pipeline-step">
            <span className="step-label">{label}</span>
            {i < 4 && <span className="step-arrow">-&gt;</span>}
          </div>
        ))}
      </div>

      <button className="analyze-btn" disabled={!files.length || investigating} onClick={handleAnalyze}>
        BEGIN INVESTIGATION
      </button>
    </main>
  )
}

function App() {
  return (
    <div className="app">
      <Cursor />
      <img src={bloodImg} className="blood-deco blood-deco--tl" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--tr" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--bl" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--br" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--mid" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--mid-left" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--top-mid" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--bot-mid" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--inner-tl" alt="" aria-hidden="true" />
      <img src={bloodImg} className="blood-deco blood-deco--inner-br" alt="" aria-hidden="true" />

      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crypto" element={<CryptoPage />} />
        <Route path="/ransom" element={<RansomPage />} />
        <Route path="/coroner" element={<CoronerPage />} />
      </Routes>

      <footer className="footer">
        <p>TBD &bull; TBD &bull; TBD</p>
      </footer>
    </div>
  )
}

export default App
