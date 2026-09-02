'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot, Check, ChevronRight, CircuitBoard, Clock3, Code2, Copy, Download,
  FileText, FileUp, Flame, Lightbulb, MessageCircle, Moon, Play, Plus, Search,
  Send, Settings2, ShieldCheck, Sparkles, Sun, Terminal, Usb, X, Zap,
} from 'lucide-react'

const robots = [
  { title: 'Sumo Bot', level: 'Beginner', time: '45 min', hardware: '2 Large Motors · Ultrasonic Sensor', image: '/sumo-bot.png', tone: 'yellow', steps: ['Build the wedge chassis and attach both drive motors.', 'Connect the ultrasonic sensor to Port F and face it forward.', 'Calibrate the motors, then test the arena edge routine.'] },
  { title: 'Color Sorter', level: 'Intermediate', time: '70 min', hardware: '3 Large Motors · Color Sensor', image: '/color-sorter.png', tone: 'cyan', steps: ['Assemble the conveyor belt and sorting gate.', 'Aim the color sensor at the center of the belt.', 'Tune the gate angle for each color family.'] },
  { title: 'Line Follower with Gyro', level: 'Advanced', time: '90 min', hardware: '2 Large Motors · Color + Gyro Sensors', image: '/line-follower.png', tone: 'magenta', steps: ['Build the low-profile chassis with dual color sensors.', 'Mount the hub flat and reset the gyro before each run.', 'Use proportional steering to keep the bot on track.'] },
]

const code = `from spike import PrimeHub, Motor, DistanceSensor
from spike.control import wait_for_seconds

hub = PrimeHub()
left_motor = Motor('A')
right_motor = Motor('B')
distance = DistanceSensor('F')

# Reset the heading so every run starts consistently
hub.motion_sensor.reset_yaw_angle()
left_motor.set_degrees_counted(0)
right_motor.set_degrees_counted(0)

# Drive forward until the wall is 10 cm away
left_motor.start_at_power(45)
right_motor.start_at_power(45)
while distance.get_distance_cm() > 10:
    wait_for_seconds(0.05)

# Brake both motors, then pivot 90 degrees
left_motor.stop()
right_motor.stop()
hub.motion_sensor.reset_yaw_angle()
left_motor.run_for_degrees(210, 45)
right_motor.run_for_degrees(-210, 45)`

export default function Page() {
  const [dark, setDark] = useState(true)
  const [language, setLanguage] = useState<'en' | 'ru'>('en')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState<(typeof robots)[number] | null>(null)
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi! I\'m your Spike Prime copilot. Tell me what your robot is doing and I\'ll help you debug it step by step.' }])
  const [chatInput, setChatInput] = useState('')
  const [hubPdf, setHubPdf] = useState<File | null>(null)
  const [selectedRobot, setSelectedRobot] = useState('')
  const [robotPromptError, setRobotPromptError] = useState('')
  useEffect(() => { document.documentElement.lang = language }, [language])

  const copy = language === 'ru' ? { builds: 'Инструкции сборки', ai: 'AI-код и ассистент', hub: 'Какие порты выбрать', open: 'Открыть AI-студию', explore: 'Смотреть сборки', library: 'БИБЛИОТЕКА СБОРОК', blueprint: 'Начните с чертежа.', libraryText: 'Практические сборки с понятными шагами.', connect: 'Подключите хаб.', workspace: 'AI-СТУДИЯ', upgraded: 'Ваш робот — на новом уровне.', choose: 'Сначала выберите робота. Затем опишите задачу.', robot: 'Модель робота', chooseRobot: 'Выберите робота...', language: 'Язык программирования', promptTitle: 'Что должен делать робот?', generate: 'Сгенерировать код', chatTitle: 'Что-то не работает?', ask: 'Спросите о своём роботе...', online: 'В сети', hubOnline: 'Хаб подключён', guide: 'Инструкция сборки', inGuide: 'В этой инструкции', close: 'Закрыть инструкции', view: 'Посмотреть инструкцию', search: 'Поиск сборок роботов...', all: 'Все', beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый' } : { builds: 'Build Instructions', ai: 'AI Code & Assistant', hub: 'Which ports to choose', open: 'Open AI workspace', explore: 'Explore builds', library: 'BUILD LIBRARY', blueprint: 'Start with a blueprint.', libraryText: 'Hands-on builds, clearly explained.', connect: 'Connect your hub.', workspace: 'AI WORKSPACE', upgraded: 'Your robot, upgraded.', choose: 'Choose your robot first. Then describe the behavior.', robot: 'Robot model', chooseRobot: 'Choose a robot...', language: 'Programming language', promptTitle: 'What should your robot do?', generate: 'Generate code', chatTitle: 'Something not working?', ask: 'Ask about your robot...', online: 'Online', hubOnline: 'Hub online', guide: 'BUILD GUIDE', inGuide: 'In this guide', close: 'Close instructions', view: 'View instructions', search: 'Search robot builds...', all: 'All', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
  const filtered = useMemo(() => robots.filter((robot) => (filter === 'All' || robot.level === filter) && robot.title.toLowerCase().includes(query.toLowerCase())), [filter, query])
  const submitChat = (text = chatInput) => { if (!text.trim()) return; setMessages((m) => [...m, { from: 'user', text }, { from: 'bot', text: 'Let\'s isolate it:\n\n☐ Check that the motor cable clicks into Port A.\n☐ Run the motor calibration routine.\n☐ Swap the cable with Port B to rule out a hardware issue.\n\nTry one check and tell me what you observe.' }]); setChatInput('') }
  const generateCode = () => { if (!selectedRobot) { setRobotPromptError('Choose a robot first so the AI can write code for the right build.'); return } setRobotPromptError(''); setPrompt(`For my ${selectedRobot}, drive forward until the Ultrasonic Sensor on Port F sees a wall under 10 cm, then pivot 90 degrees using the Gyro.`) }

  return (
    <div className={dark ? 'app-shell dark' : 'app-shell'}>
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark"><CircuitBoard size={19} /></span><span>RoboEasy <b>AI</b></span></a>
        <nav><a href="#build">{copy.builds}</a><a href="#workspace">{copy.ai}</a><a href="#ports">{copy.hub}</a></nav><div className="language-switcher" aria-label="Language"><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button><button className={language === 'ru' ? 'active' : ''} onClick={() => setLanguage('ru')}>RU</button></div>
        <button className="icon-button" aria-label="Toggle color theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
      </header>

      <main id="top">
        <section className="hero"><div className="eyebrow"><span className="pulse-dot" /> SPIKE PRIME LEARNING LAB</div><h1>Build smarter.<br /><em>Think like a robot.</em></h1><p>AI-powered guides and code for curious minds building with LEGO Spike Prime.</p><div className="hero-actions"><a className="primary-button" href="#workspace"><Sparkles size={16} /> Open AI workspace</a><a className="text-link" href="#build">Explore builds <ChevronRight size={15} /></a></div></section>

        <section id="build" className="section"><div className="section-heading"><div><div className="eyebrow">01 / BUILD LIBRARY</div><h2>Start with a blueprint.</h2></div><p>Hands-on builds, clearly explained.<br />Pick a challenge and make it yours.</p></div>
          <div className="toolbar"><div className="search-wrap"><Search size={16} /><input aria-label="Search builds" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.search} /></div><div className="filter-group">{['All', 'Beginner', 'Intermediate', 'Advanced'].map((item) => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{language === 'ru' ? ({ All: 'Все', Beginner: 'Начинающий', Intermediate: 'Средний', Advanced: 'Продвинутый' } as Record<string, string>)[item] : item}</button>)}</div></div>
          <div className="robot-grid">{filtered.map((robot) => <article className="robot-card" key={robot.title} onClick={() => setSelected(robot)}><div className={`robot-image ${robot.tone}`}><img src={robot.image} alt={`${robot.title} robot build`} /><span className="level-tag">{robot.level}</span><button className="open-icon" aria-label={`Open ${robot.title}`}><ChevronRight size={16} /></button></div><div className="card-body"><div className="card-title"><h3>{robot.title}</h3><span className="time"><Clock3 size={14} />{robot.time}</span></div><p>{robot.hardware}</p><button className="card-link">{copy.view} <ChevronRight size={14} /></button></div></article>)}</div>
        </section>

        <section id="hub-setup" className="section hub-setup-section"><div className="section-heading"><div><div className="eyebrow">02 / HUB CONNECTION</div><h2>{language === 'ru' ? 'Подключите хаб.' : 'Connect your hub.'}</h2></div><p>Follow the setup checklist, then attach<br />your hub instructions as a PDF.</p></div><div className="setup-grid"><div className="panel setup-copy"><div className="panel-kicker"><Usb size={15} /> SPIKE PRIME HUB SETUP</div><h3>From box to connected.</h3><ol className="setup-steps"><li><span>01</span><div><strong>Power on the hub</strong><p>Press the center button until the status light turns on.</p></div></li><li><span>02</span><div><strong>Open the Spike app</strong><p>Choose your hub from the Bluetooth connection menu.</p></div></li><li><span>03</span><div><strong>Confirm the ports</strong><p>Match your motors and sensors with the map below.</p></div></li></ol></div><div className="panel pdf-upload-panel"><div className="panel-kicker"><FileUp size={15} /> ATTACH INSTRUCTIONS</div><h3>Hub connection PDF</h3><p className="upload-description">Keep a wiring diagram or classroom handout beside your project for quick reference.</p><label className="upload-dropzone" htmlFor="hub-pdf"><FileText size={28} /><strong>{hubPdf ? hubPdf.name : 'Choose a PDF file'}</strong><span>{hubPdf ? `${(hubPdf.size / 1024 / 1024).toFixed(2)} MB · Ready to reference` : 'PDF only · Max 10 MB'}</span><input id="hub-pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setHubPdf(e.target.files?.[0] ?? null)} /></label>{hubPdf && <button className="text-link remove-file" onClick={() => setHubPdf(null)}><X size={14} /> Remove attachment</button>}</div></div></section>

        <section id="workspace" className="section workspace-section"><div className="section-heading"><div><div className="eyebrow cyan-text">03 / {copy.workspace}</div><h2>{copy.upgraded}</h2></div><p>{copy.choose}<br />Get clean code and debug with confidence.</p></div><div className="workspace-controls"><label>{copy.robot}<select aria-label="Choose robot model" value={selectedRobot} onChange={(e) => { setSelectedRobot(e.target.value); setRobotPromptError('') }}><option value="">{copy.chooseRobot}</option>{robots.map((robot) => <option key={robot.title} value={robot.title}>{robot.title}</option>)}</select></label><label>{copy.language}<select><option>MicroPython · Spike Prime</option><option>Block-based pseudocode</option></select></label><label>Connected hub<select><option>Spike Prime Large Hub · Connected</option><option>Spike Prime Small Hub</option></select></label><span className="connected"><span className="pulse-dot" /> Hub online</span></div>
          <div className="workspace-grid"><div className="panel code-panel"><div className="panel-top"><div><div className="panel-kicker"><Code2 size={15} /> AI CODE GENERATOR</div><h3>What should your robot do?</h3></div><span className="ai-badge"><Sparkles size={13} /> Ready</span></div><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Drive forward until the ultrasonic sensor sees a wall under 10 cm, then pivot 90 degrees using the gyro." /><button className="generate-button" onClick={generateCode}><Sparkles size={16} /> {copy.generate}</button>{robotPromptError && <p className="robot-prompt-error" role="alert">{robotPromptError}</p>}<div className="code-window"><div className="code-head"><span><span className="window-dot yellow" /><span className="window-dot cyan" /><span className="window-dot magenta" /> main.py</span><button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button></div><pre><code>{code}</code></pre></div><div id="ports" className="port-map"><div className="port-title"><span><Usb size={15} /> Port mapping</span><span className="muted">Large Hub</span></div><div className="hub"><span className="hub-logo">SPIKE</span><div className="ports">{['A','B','C','D','E','F'].map((port, i) => <span key={port} className={i < 2 ? 'port used' : 'port'}><b>{port}</b><small>{i < 2 ? 'Motor' : 'Open'}</small></span>)}</div></div></div></div>
            <div className="panel chat-panel"><div className="panel-top"><div><div className="panel-kicker"><MessageCircle size={15} /> TROUBLESHOOTING COPILOT</div><h3>{copy.chatTitle}</h3></div><span className="online-label"><span className="pulse-dot" /> Online</span></div><div className="quick-prompts">{['Motor calibration', 'Gyro sensor drift', 'Bluetooth error'].map((item) => <button key={item} onClick={() => submitChat(item)}><Plus size={13} /> {item}</button>)}</div><div className="messages">{messages.map((message, i) => <div className={`message ${message.from}`} key={`${message.from}-${i}`}><span className="avatar">{message.from === 'bot' ? <Bot size={15} /> : 'Y'}</span><div><span className="message-name">{message.from === 'bot' ? 'RoboEasy AI' : 'You'}</span><p>{message.text}</p></div></div>)}</div><div className="chat-input"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) submitChat() }} placeholder="Ask about your robot..." /><button aria-label="Send message" onClick={() => submitChat()}><Send size={16} /></button></div><div className="powered"><ShieldCheck size={12} /> Answers are generated for Spike Prime</div></div></div>
        </section>
      </main>

      <footer><div className="brand"><span className="brand-mark"><CircuitBoard size={17} /></span><span>RoboEasy <b>AI</b></span></div><span>Made for builders, by builders.</span><span className="footer-links">Documentation · Community · <Flame size={13} /> Keep experimenting</span></footer>

      {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" aria-label={copy.close} onClick={() => setSelected(null)}><X size={18} /></button><div className={`pdf-preview ${selected.tone}`}><FileText size={42} /><span>{copy.guide}</span><strong>{selected.title}</strong><small>PDF · 12 pages · Illustrated steps</small></div><div className="modal-content"><div className="eyebrow">BUILD GUIDE / {selected.level.toUpperCase()}</div><h2 id="guide-title">{selected.title}</h2><p className="modal-hardware">{selected.hardware} · {selected.time}</p><h4>{copy.inGuide}</h4><ol>{selected.steps.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}</ol><button className="primary-button"><Download size={16} /> Download PDF</button></div></div></div>}
    </div>
  )
}
