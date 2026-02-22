import { useState, useRef } from 'react'
import './App.css'
import bloodImg from './assets/9gtem78jepmgj4390oifvtpo12.png'

function App() {
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
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-area">
            <div className="logo-placeholder" />
            <span className="logo-text">CORONER</span>
          </div>
          <nav className="nav">
            <a href="#">TBD</a>
            <a href="#">TBD</a>
            <a href="#">TBD</a>
            <a href="#">TBD</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
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

        {/* Drop Zone */}
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
              <div className="drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="drop-primary">Drag &amp; drop file here</p>
              <p className="drop-secondary">or click to browse</p>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="file-info">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button className="clear-btn" onClick={(e) => { e.stopPropagation(); handleClear() }}>x</button>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="pipeline">
          {['TBD', 'TBD', 'TBD', 'TBD', 'TBD'].map((label, i) => (
            <div key={i} className="pipeline-step">
              <span className="step-label">{label}</span>
              {i < 4 && <span className="step-arrow">-&gt;</span>}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="analyze-btn" disabled={!file} onClick={handleAnalyze}>
          TBD
        </button>
      </main>

      <footer className="footer">
        <p>TBD &bull; TBD &bull; TBD</p>
      </footer>
    </div>
  )
}

export default App
