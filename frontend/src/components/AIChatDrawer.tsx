'use client'

import React, { useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIChatDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIChatDrawer({ isOpen, onClose }: AIChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Hello! I am your Kijani AI Assistant. Ask me anything about Lake Victoria hyacinth proliferation, satellite STAC telemetry, water metrics, or ecological risk forecasts.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim() || loading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, session_id: 'session-1' })
      })
      const data = await res.json()
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I processed your query against Lake Victoria telemetry.'
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to connect to AI Assistant endpoint. Please verify backend service.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    'Assess hyacinth risk near Kisumu Bay',
    'How does wind speed affect mat movement?',
    'What is the significance of Turbidity K490?'
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-700/80 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-white text-lg">Kijani Gemini AI Assistant</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none'
                    : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-bl-none'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs p-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Gemini is reasoning over telemetry...
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30 flex gap-2 overflow-x-auto">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-xs whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 rounded-full px-3 py-1.5 transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask AI Assistant about Lake Victoria..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
