import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Key, ShieldCheck, RefreshCw, Loader2, Settings } from 'lucide-react';
import { sendGeminiChatMessage } from '../services/geminiService';

export default function AiAssistant({ userProfile }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I am your AI Assistant powered by Google Gemini. Ask me anything about ${userProfile?.name || 'this profile'}'s professional background, skills, or portfolio!`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('gemini_user_api_key') || '');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    if (e && e.preventDefault) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || loading) return;

    const newMessages = [...messages, { role: 'user', text: clean }];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendGeminiChatMessage(newMessages, userProfile);
      setMessages([...newMessages, { role: 'assistant', text: res.text }]);
    } catch(err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', text: 'Error contacting AI assistant: ' + err.message }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveKey() {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_user_api_key', apiKeyInput.trim());
    } else {
      localStorage.removeItem('gemini_user_api_key');
    }
    setShowSettings(false);
  }

  const samplePrompts = [
    "What are your core technical skills?",
    "Tell me about your software architecture experience",
    "How does the biometric security architecture work here?"
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[520px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white font-heading flex items-center gap-2">
              Gemini AI Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Isolated AI Layer
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Strictly decoupled: Zero biometric data is ever sent to Gemini</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          title="Assistant Settings"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Modal (Optional Dev Key) */}
      {showSettings && (
        <div className="p-3.5 mb-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini Connection Settings</span>
            </span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-[11px] text-slate-400">
            Production uses Firebase Cloud Functions (/api/geminiAssistant). For local test without deploying Cloud Functions, you may enter a test Gemini API key:
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... (Session Dev Key)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            />
            <button
              onClick={handleSaveKey}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
            }`}>
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-emerald-600/90 text-white rounded-tr-xs'
                : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-tl-xs'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            <span>Gemini is thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="pt-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(p)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[10px] text-slate-300 font-medium transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="pt-2 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Gemini about this profile, skills, or projects…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
}
