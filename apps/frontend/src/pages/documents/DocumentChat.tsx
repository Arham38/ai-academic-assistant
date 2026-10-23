import React, { useState } from 'react';
import { Send, Sparkles, Bot, User, BookOpen, FileSearch, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  citationSources?: string[];
}

export const DocumentChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Hello! I have indexed all 18 pages of this manuscript into ChromaDB. What section or hypothesis would you like to analyze or query?',
      timestamp: '10:42 AM',
      citationSources: ['Section 1: Introduction (p. 2)', 'Section 2: Bell Inequalities (p. 5)'],
    },
    {
      id: 'msg-2',
      sender: 'user',
      text: 'Can you summarize how atmospheric turbulence is accounted for in the QKD channel capacity theorem?',
      timestamp: '10:43 AM',
    },
    {
      id: 'msg-3',
      sender: 'ai',
      text: 'In Section 4.3 (Equations 12–15), atmospheric phase noise is modeled via the Hufnagel-Valley refractive index profile. The author derives a modified secrecy capacity bound where channel attenuation is counteracted by adaptive optical phase conjugate mirrors.',
      timestamp: '10:44 AM',
      citationSources: ['Section 4.3: Atmospheric Channel Models (p. 11)', 'Theorem 2.1 (p. 13)'],
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiReply: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      sender: 'ai',
      text: `Based on your manuscript analysis: "${inputVal}" is corroborated by the experimental measurements plotted in Figure 4 (p. 14). All references match the IEEE QKD working group guidelines.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citationSources: ['Figure 4: Photonic Bit Error Ratio (p. 14)'],
    };

    setMessages((prev) => [...prev, userMsg, aiReply]);
    setInputVal('');
  };

  return (
    <Card className="flex flex-col h-[650px] border border-slate-200/80 shadow-xs overflow-hidden">
      {/* 1. Chat Header */}
      <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Agentic RAG Assistant
              </CardTitle>
              <CardDescription className="text-xs">
                Contextually grounded exclusively in this document
              </CardDescription>
            </div>
          </div>

          <Badge variant="clean" className="space-x-1 self-start sm:self-auto">
            <CheckCircle2 className="w-3 h-3" />
            <span>124 Chunks Indexed (ChromaDB)</span>
          </Badge>
        </div>
      </CardHeader>

      {/* 2. Message History Thread */}
      <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100/80 text-slate-800 border border-slate-200/50'
              }`}
            >
              <p>{msg.text}</p>

              {msg.citationSources && msg.citationSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Grounded Document Citations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citationSources.map((cit, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-slate-200 text-slate-700"
                      >
                        <BookOpen className="w-2.5 h-2.5 mr-1 text-indigo-600" />
                        {cit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <span
                className={`text-[10px] block mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
      </CardContent>

      {/* 3. Input & Quick Suggestion Bar */}
      <div className="p-4 border-t border-slate-100 bg-white space-y-3">
        {/* Quick query pills */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setInputVal('Summarize methodology and experimental validation')}
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors shrink-0"
          >
            <FileSearch className="w-3 h-3 mr-1 text-slate-400" />
            Summarize Methodology
          </button>
          <button
            type="button"
            onClick={() =>
              setInputVal('Check reference formatting against IEEE citation guidelines')
            }
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors shrink-0"
          >
            <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
            Verify IEEE References
          </button>
        </div>

        {/* Form input */}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask anything about this manuscript..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-2xs"
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Card>
  );
};
