import './App.css'
import { useState, useRef, useEffect } from 'react'

function App() {
  const [audioSrc, setAudioSrc] = useState(null) // store uploaded audio
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const rafRef = useRef(null)
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file) // create temporary URL
      setAudioSrc(objectUrl)

      setTimeout(() => {
        if (audioRef.current && !audioContextRef.current) {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 4096
          analyser.smoothingTimeConstant = 0.8

          const src = ctx.createMediaElementSource(audioRef.current)
          src.connect(analyser)
          analyser.connect(ctx.destination)

          const bufferLen = analyser.frequencyBinCount
          dataArrayRef.current = new Uint8Array(bufferLen)
          audioContextRef.current = ctx
          analyserRef.current = analyser
          startDrawing()
        }
      }, 0)
    }
  }

  const startDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
  
    // Handle high-DPI canvas
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx2d = canvas.getContext('2d')
    ctx2d.scale(dpr, dpr)
  
    const draw = () => {
      const analyser = analyserRef.current
      const data = dataArrayRef.current
      if (!analyser || !data) return
  
      analyser.getByteFrequencyData(data)
  
      // Compute low/mid/high and overall volume
      const len = data.length
      const low = avgRange(data, 0, Math.floor(len * 0.0012))                    // 0-12% (sub-bass)
      const lowmid = avgRange(data, Math.floor(len * 0.012), Math.floor(len * 0.025))  // 12-25% (bass)
      const mid = avgRange(data, Math.floor(len * 0.025), Math.floor(len * 0.045))     // 25-45% (low-mid)
      const midhigh = avgRange(data, Math.floor(len * 0.045), Math.floor(len * 0.065)) // 45-65% (mid)
      const high = avgRange(data, Math.floor(len * 0.065), Math.floor(len * 0.085))    // 65-85% (high-mid)
      const highhigh = avgRange(data, Math.floor(len * 0.075), len)                  // 85-100% (treble)
      const volume = avgRange(data, 0, len)

      // Clear
      ctx2d.clearRect(0, 0, rect.width, rect.height)
      ctx2d.fillStyle = 'black'
      ctx2d.fillRect(0, 0, rect.width, rect.height)

      // Six bars across full width
      const w = rect.width
      const h = rect.height
      const barW = w / 6 - 8  // Divide by 6 instead of 3
      const gap = 4
      const scale = h / 255

      // Draw 6 bars with proper spacing and colors
      drawBar(ctx2d, gap, h, barW, low * scale, '#149414')           // Green (sub-bass)
      drawBar(ctx2d, barW + gap * 2, h, barW, lowmid * scale, '#149418')  // Dark green (bass)
      drawBar(ctx2d, (barW + gap) * 2 + gap, h, barW, mid * scale, '#0e6b0e')      // Medium green (low-mid)
      drawBar(ctx2d, (barW + gap) * 3 + gap, h, barW, midhigh * scale, '#649568')  // Light green (mid)
      drawBar(ctx2d, (barW + gap) * 4 + gap, h, barW, high * scale, '#8fbc8f')     // Pale green (high-mid)
      drawBar(ctx2d, (barW + gap) * 5 + gap, h, barW, highhigh * scale, '#98fb98') // Light green (treble)
  
      // glow by volume (optional)
      ctx2d.strokeStyle = `rgba(255,255,255,${Math.min(1, volume / 180)})`
      ctx2d.lineWidth = 2
      
      // Draw rounded rectangle for glow
      const radius = 40
      
      ctx2d.beginPath()
      ctx2d.moveTo(radius, 2)
      ctx2d.lineTo(w - radius, 2)
      ctx2d.quadraticCurveTo(w - 2, 2, w - 2, radius)
      ctx2d.lineTo(w - 2, h - radius)
      ctx2d.quadraticCurveTo(w - 2, h - 2, w - radius, h - 2)
      ctx2d.lineTo(radius, h - 2)
      ctx2d.quadraticCurveTo(2, h - 2, 2, h - radius)
      ctx2d.lineTo(2, radius)
      ctx2d.quadraticCurveTo(2, 2, radius, 2)
      ctx2d.stroke()
  
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
  }
  
  function avgRange(arr, start, end) {
    let sum = 0
    const s = Math.max(0, start)
    const e = Math.min(arr.length, end)
    for (let i = s; i < e; i++) sum += arr[i]
    return e > s ? sum / (e - s) : 0
  }
  
  function drawBar(ctx, x, h, w, value, color) {
    const barH = Math.max(4, value)
    const y = h - barH - 2

    // Gold gradient palette (light → rich → deep)
    const gradient = ctx.createLinearGradient(x, y, x, y + barH)
    gradient.addColorStop(0, '#FFF3C4')   // pale gold highlight
    gradient.addColorStop(0.5, '#F1C40F') // rich gold
    gradient.addColorStop(1, '#B8860B')   // deep goldenrod

    // Draw the gradient bar
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, w, barH)

    // Golden glow
    ctx.shadowColor = '#F1C40F'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#F1C40F22' // subtle inner tint
    ctx.fillRect(x + 1, y + 1, w - 2, barH - 2)
    ctx.shadowBlur = 0
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  // Particles effect
  useEffect(() => {
    const init = () => window.particlesJS && window.particlesJS('particles-bg', {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: '#ffffff' },
          shape: { type: 'circle' },
          opacity: { value: 0.5 },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.4, width: 1 },
          move: { enable: true, speed: 2, direction: 'none', out_mode: 'out' }
        },
        interactivity: {
          detect_on: 'canvas',
          events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
          modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
        },
        retina_detect: true
      })
    if (window.particlesJS) init()
    else {
      const iv = setInterval(() => {
        if (window.particlesJS) { init(); clearInterval(iv) }
      }, 100)
      setTimeout(() => clearInterval(iv), 5000)
    }
  }, [])

  return (
    <>
      <div id="particles-bg" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', backgroundColor: '#000' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
      <h1 className="header">AI Music Visualizer</h1>

      {/* Visualization container */}
      <div className="glassy" style={{ width: '100%', borderRadius: '40px', overflow: 'hidden', margin: '24px 0' }}>
        <canvas id="viz-canvas" ref={canvasRef} style={{ width: '100%', height: '200px', display: 'block' }} />
      </div>

      <div className="card">
        {/* File upload for MP3 */}
        <input type="file" accept="audio/mp3,audio/wav" onChange={handleFileUpload} className="file-input" style={{ marginBottom: '40px',  justifyContent:'center'}} />

        {/* Audio player */}
        {audioSrc && (
          <div className="mt-6 flex justify-center">
            <audio className="autoplayer w-full max-w-md" ref={audioRef} controls src={audioSrc} autoPlay />
          </div>
        )}
      </div>

      <p className="read-the-docs mt-20">
        Generate the perfect visualization for your music today! 🧑🏻‍💻🤯🎶
      </p>
      </div>
    </>
  )
}

export default App
