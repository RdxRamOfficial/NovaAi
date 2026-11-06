import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus, MessageSquare, Settings2, Send, Sparkles, Menu, X,
  Bot, UserRound, Trash2, ChevronDown, Zap, ShieldCheck, Mic, Volume2, VolumeX
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "nova-ai-chats-v1";
const MODEL_OPTIONS = {
  openai: [
    { id: "gpt-6-astra", name: "GPT-6 Astra · Best reasoning" },
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol · Balanced" },
    { id: "gpt-6.1-terra", name: "GPT-6.1 Terra · Fast" },
    { id: "gpt-6-luna", name: "GPT-6 Luna · Efficient" }
  ],
  gemini: [
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash · Latest" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro · Preview" },
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash · Preview" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }
  ]
};

function makeChat() {
  return { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
}

function App() {
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [makeChat()]; }
    catch { return [makeChat()]; }
  });
  const [activeId, setActiveId] = useState(() => chats[0]?.id);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState(MODEL_OPTIONS.openai[0].id);
  const [language, setLanguage] = useState("auto");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeId) || chats[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, busy]);

  const updateActive = (updater) => {
    setChats(prev => prev.map(chat => chat.id === activeId ? updater(chat) : chat));
  };

  const newChat = () => {
    const chat = makeChat();
    setChats(prev => [chat, ...prev]);
    setActiveId(chat.id);
    setInput("");
    setNotice("");
    setSidebarOpen(false);
  };

  const deleteChat = (id, event) => {
    event.stopPropagation();
    const remaining = chats.filter(c => c.id !== id);
    const next = remaining.length ? remaining : [makeChat()];
    setChats(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const sendMessage = async (text = input) => {
    const message = text.trim();
    if (!message || busy || !activeChat) return;

    const previous = activeChat.messages;
    const nextMessages = [...previous, { role: "user", content: message }];
    const title = previous.length === 0
      ? (message.length >  30 ? message.slice(0, 30) + "…" : message)
      : activeChat.title;

    updateActive(chat => ({ ...chat, title, messages: nextMessages, updatedAt: Date.now() }));
    setInput("");
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          language,
          message,
          history: previous.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      updateActive(chat => ({
        ...chat,
        messages: [...chat.messages, { role: "assistant", content: data.answer }],
        updatedAt: Date.now()
      }));
    } catch (err) {
      setNotice(err.message || "Could not connect. Is the server running?");
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Voice typing is not supported in this browser. Try Chrome on Android.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "auto" ? "hi-IN" : language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setListening(true); setNotice(""); };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onerror = (event) => {
      setNotice(event.error === "not-allowed" ? "Microphone permission denied. Allow microphone access and try again." : `Voice input error: ${event.error}`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakMessage = (text, index) => {
    if (!("speechSynthesis" in window)) {
      setNotice("Voice playback is not supported in this browser.");
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "auto" ? "hi-IN" : language;
    utterance.rate = 1;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <span className="brand-name">nova<span>ai</span></span>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18}/></button>
        </div>
        <button className="new-chat" onClick={newChat}><Plus size={18}/> New chat</button>
        <div className="side-label">YOUR WORKSPACE</div>
        <div className="chat-list">
          {chats.map(chat => (
            <div key={chat.id} className={`chat-row ${chat.id === activeId ? "selected" : ""}`} onClick={() => { setActiveId(chat.id); setSidebarOpen(false); }}>
              <MessageSquare size={16}/>
              <span>{chat.title}</span>
              <button className="delete-chat" onClick={(e) => deleteChat(chat.id, e)} aria-label="Delete chat"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Zap size={16}/></div>
            <div><strong>Nova AI</strong><small>Your ideas, amplified.</small></div>
          </div>
          <div className="privacy-note"><ShieldCheck size={14}/> API keys stay on your server</div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
            <div className="mobile-brand"><div className="brand-mark"><Sparkles size={16}/></div><b>nova<span>ai</span></b></div>
            <div className="model-picker">
              <select value={provider} onChange={e => {
                const nextProvider = e.target.value;
                setProvider(nextProvider);
                setModel(MODEL_OPTIONS[nextProvider][0].id);
              }} aria-label="Choose AI provider">
                <option value="openai">GPT</option>
                <option value="gemini">Gemini</option>
              </select>
              <ChevronDown size={14}/>
            </div>
            <div className="model-picker language-picker">
              <select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Choose language" title="Response and voice language">
                <option value="auto">Auto language</option>
                <option value="hi-IN">हिन्दी</option>
                <option value="en-US">English</option>
                <option value="bn-IN">বাংলা</option>
                <option value="mr-IN">मराठी</option>
                <option value="ta-IN">தமிழ்</option>
                <option value="te-IN">తెలుగు</option>
              </select>
              <ChevronDown size={14}/>
            </div>
            <div className="model-picker model-name-picker">
              <select value={model} onChange={e => setModel(e.target.value)} aria-label="Choose model">
                {MODEL_OPTIONS[provider].map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
              <ChevronDown size={14}/>
            </div>
          </div>
          <div className="top-badge"><span className="status-dot"/> AI workspace</div>
        </header>

        <section className="conversation">
          {activeChat?.messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-orb"><Sparkles size={30}/></div>
              <div className="eyebrow">WELCOME TO YOUR AI SPACE</div>
              <h1>What can I help<br/><span>you explore?</span></h1>
              <p>Ask anything. Explore ideas. Make something amazing.</p>
              <div className="suggestions">
                {[
                  ["✦", "Explain a complex topic", "Explain quantum computing in simple words"],
                  ["⌘", "Help me write something", "Help me write a professional email"],
                  ["↗", "Brainstorm new ideas", "Give me 5 creative startup ideas"]
                ].map(([icon, label, prompt]) => (
                  <button className="suggestion" key={label} onClick={() => sendMessage(prompt)}>
                    <span>{icon}</span>{label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {activeChat?.messages.map((message, index) => (
                <article className={`message ${message.role}`} key={index}>
                  <div className={`avatar ${message.role}`}>
                    {message.role === "assistant" ? <Sparkles size={16}/> : <UserRound size={16}/>}
                  </div>
                  <div className="message-body">
                    <div className="message-author">{message.role === "assistant" ? "Nova AI" : "You"}</div>
                    <div className="message-text">{message.content}</div>
                    {message.role === "assistant" && <button className={`speak-btn ${speakingIndex === index ? "active" : ""}`} onClick={() => speakMessage(message.content, index)} aria-label={speakingIndex === index ? "Stop voice playback" : "Read response aloud"}>
                      {speakingIndex === index ? <VolumeX size={14}/> : <Volume2 size={14}/>}{speakingIndex === index ? "Stop" : "Listen"}
                    </button>}
                  </div>
                </article>
              ))}
              {busy && <article className="message assistant"><div className="avatar assistant"><Sparkles size={16}/></div><div className="message-body"><div className="message-author">Nova AI</div><div className="typing"><i/><i/><i/></div></div></article>}
              <div ref={endRef}/>
            </div>
          )}
        </section>

        <div className="composer-wrap">
          {notice && <div className="error-banner">{notice}</div>}
          <div className="composer">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Nova AI..."
              rows={1}
              aria-label="Message Nova AI"
            />
            <button className={`mic-btn ${listening ? "listening" : ""}`} onClick={startVoiceInput} disabled={busy} aria-label={listening ? "Stop voice input" : "Start voice input"} title={listening ? "Listening… tap to stop" : "Start voice input"}><Mic size={18}/></button>
            <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || busy} aria-label="Send message"><Send size={18}/></button>
          </div>
          <div className="composer-foot"><span><Sparkles size={12}/> Powered by your selected AI model</span><span>{listening ? "Listening… speak now" : "Voice input · Listen: read replies aloud"}</span></div>
        </div>
        <footer className="footer">Nova AI can make mistakes. Check important information.</footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
