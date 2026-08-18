import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const QUICK_PROMPTS = [
  { icon: '⚛️', label: 'Explain React useEffect & Hooks', text: 'Explain React.js useEffect hook and component lifecycle with code examples' },
  { icon: '🗄️', label: 'ACID Transactions in MySQL', text: 'Explain ACID properties and transaction management in MySQL with an example' },
  { icon: '🎯', label: 'Top 5 Full-Stack Interview Questions', text: 'Give me top 5 MERN and Full-Stack technical interview questions with answers' },
  { icon: '🐳', label: 'Docker Containerization & Dockerfile', text: 'Explain Docker containerization and show a production Dockerfile for Node.js' },
  { icon: '📄', label: 'ATS Resume Keywords for Developers', text: 'Give me top ATS keywords and project bullet points for a Full-Stack developer resume' }
];

export default function AITutorWidget() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      title: '👋 Welcome to CampusFlow AI Academic Tutor!',
      text: "I'm your intelligent academic and placement assistant. Ask me anything about your course modules, coding doubts, MySQL queries, or interview preparation!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = async (customText) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setPrompt('');
    setLoading(true);

    try {
      const res = await api.post('/ai/ask', { prompt: textToSend.trim() });
      if (res.success && res.data?.response) {
        const aiMsg = {
          sender: 'ai',
          title: res.data.response.title,
          text: res.data.response.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          title: '⚠️ Connection Error',
          text: 'Unable to reach the AI engine. Please ensure your backend server is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON ── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '1.75rem',
          right: '1.75rem',
          zIndex: 1060,
          background: 'linear-gradient(135deg, #f97316 0%, #8b5cf6 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50px',
          padding: '0.85rem 1.4rem',
          fontWeight: 800,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 8px 30px rgba(249, 115, 22, 0.45)',
          cursor: 'pointer',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
      >
        <span style={{ fontSize: '1.25rem' }}>🤖</span>
        <span>AI Academic Tutor</span>
      </button>

      {/* ── EXPANDABLE CHAT DRAWER MODAL ── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.75rem',
            width: '90vw',
            maxWidth: '440px',
            height: '620px',
            maxHeight: '80vh',
            zIndex: 1070,
            background: 'var(--cf-card-bg, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--cf-border, #e2e8f0)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUpChat 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.1rem 1.25rem',
              background: 'linear-gradient(135deg, #f97316 0%, #8b5cf6 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1 }}>CampusFlow AI Tutor</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Academic & Viva Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Suggestion Pills */}
          <div
            style={{
              padding: '0.6rem 0.8rem',
              background: 'var(--cf-bg, #f1f5f9)',
              borderBottom: '1px solid var(--cf-border, #e2e8f0)',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none'
            }}
          >
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.text)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  background: 'var(--cf-card-bg, #ffffff)',
                  border: '1px solid var(--cf-border, #cbd5e1)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--cf-text-main, #334155)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  flexShrink: 0
                }}
              >
                <span>{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}
              >
                <div
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.sender === 'user' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'var(--cf-input-bg, #f8fafc)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--cf-text-main, #0f172a)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--cf-border, #e2e8f0)',
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {m.title && (
                    <div style={{ fontWeight: 800, marginBottom: '0.4rem', color: m.sender === 'user' ? '#fff' : '#f97316' }}>
                      {m.title}
                    </div>
                  )}
                  <div>{m.text}</div>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--cf-text-muted, #94a3b8)',
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    padding: '0 0.3rem'
                  }}
                >
                  {m.time}
                </span>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '18px',
                  background: 'var(--cf-input-bg, #f8fafc)',
                  border: '1px solid var(--cf-border, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--cf-text-muted, #64748b)'
                }}
              >
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span>AI is thinking & analyzing concept...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '0.8rem 1rem',
              borderTop: '1px solid var(--cf-border, #e2e8f0)',
              background: 'var(--cf-card-bg, #ffffff)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Ask academic doubt or interview topic..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '12px',
                border: '1.5px solid var(--cf-border, #cbd5e1)',
                background: 'var(--cf-input-bg, #f8fafc)',
                color: 'var(--cf-text-main, #0f172a)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                color: '#ffffff',
                fontWeight: 800,
                cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !prompt.trim() ? 0.6 : 1,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
