import { useState, useRef, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import bloodImg from './assets/9gtem78jepmgj4390oifvtpo12.png'
import cursorImg from './assets/7qm8h0d555imegvquob85gn0ve.png'
import CryptoPage from './pages/CryptoPage.jsx'
import RansomPage from './pages/RansomPage.jsx'

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
          <Link to="/crypto" className={location.pathname === '/crypto' ? 'nav-active' : ''}>Crypto Trace</Link>
          <Link to="/ransom" className={location.pathname === '/ransom' ? 'nav-active' : ''}>Profiler</Link>
          <a href="#">TBD</a>
        </nav>
      </div>
    </header>
  )
}

function HomePage() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileInput = (e) => {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }

  const handleAnalyze = () => {
    // TODO: send file to MCP backend
    console.log('Analyzing:', file)
  }

  const handleClear = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="main">
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
        <p className="hero-sub">TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD</p>
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''} ${file ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && inputRef.current.click()}
      >
        <input ref={inputRef} type="file" hidden onChange={handleFileInput} />

        {!file ? (
          <div className="drop-content">
            <p className="drop-tag">// EVIDENCE INTAKE //</p>
            <div className="drop-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            </div>
            <p className="drop-primary">DROP EVIDENCE HERE</p>
            <p className="drop-secondary">disk images / memory dumps / raw files</p>
            <p className="drop-secondary">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</p>
          </div>
        ) : (
          <div className="file-preview">
            <div className="file-meta-tag">EXHIBIT A</div>
            <div className="file-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
              </svg>
            </div>
            <div className="file-info">
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB &nbsp;|&nbsp; PENDING ANALYSIS</p>
            </div>
            <button className="clear-btn" onClick={(e) => { e.stopPropagation(); handleClear() }}>x</button>
          </div>
        )}
      </div>

      <div className="pipeline">
        {['TBD', 'TBD', 'TBD', 'TBD', 'TBD'].map((label, i) => (
          <div key={i} className="pipeline-step">
            <span className="step-label">{label}</span>
            {i < 4 && <span className="step-arrow">-&gt;</span>}
          </div>
        ))}
      </div>

      <button className="analyze-btn" disabled={!file} onClick={handleAnalyze}>
        TBD
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

      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crypto" element={<CryptoPage />} />
        <Route path="/ransom" element={<RansomPage />} />
      </Routes>

      <footer className="footer">
        <p>TBD &bull; TBD &bull; TBD</p>
      </footer>
    </div>
  )
}

export default App
