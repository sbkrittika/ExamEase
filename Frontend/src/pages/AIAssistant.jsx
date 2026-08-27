import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello Admin! I am your ExamEase AI Assistant. I can help you find rooms, resolve invigilation conflicts, or generate seat plans. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiText = "I understand. Let me check the database for that information.";
      
      const lowerInput = userMessage.text.toLowerCase();
      if (lowerInput.includes('room')) {
        aiText = "Open Room Management to review current capacity and availability. I can only use rooms and plans that have been saved in the system.";
      } else if (lowerInput.includes('conflict')) {
        aiText = "Open Invigilation Duties to review assignments and resolve any conflicts using the saved examination schedule.";
      }

      setMessages((prev) => [...prev, { id: Date.now(), type: 'ai', text: aiText }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>
      
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>ExamEase AI</span>
              <Sparkles size={16} className="text-blue-500" />
            </h2>
            <p className="text-sm text-emerald-600 font-medium flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online and ready to help</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
              <div className="flex-shrink-0">
                {msg.type === 'user' ? (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-slate-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-blue-600" />
                  </div>
                )}
              </div>
              <div 
                className={`p-4 rounded-2xl ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10' 
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-blue-600" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 z-10">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about seat plans, conflicts, or recommendations..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap">Suggested:</span>
          <button type="button" onClick={() => setInput("Where is the exam room for CSE 311?")} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 transition-colors whitespace-nowrap">Where is the exam room for CSE 311?</button>
          <button type="button" onClick={() => setInput("Check for invigilation conflicts")} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 transition-colors whitespace-nowrap">Check for invigilation conflicts</button>
        </div>
      </div>
    </div>
  );
}
