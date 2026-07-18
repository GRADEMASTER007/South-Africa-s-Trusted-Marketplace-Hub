import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, X, ArrowRight, CornerDownRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AiSearchChatbotProps {
  onApplyFilters: (filters: {
    province: string | null;
    city: string | null;
    category: string | null;
    subcategory: string | null;
    query: string | null;
    minPrice: number | null;
    maxPrice: number | null;
  }) => void;
  isOpenInitially?: boolean;
}

export default function AiSearchChatbot({ onApplyFilters, isOpenInitially = false }: AiSearchChatbotProps) {
  const [isOpen, setIsOpen] = useState(isOpenInitially);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Howzit! I'm Busi, your SA Market Hub AI guide. 🇿🇦 I can find exactly what you need. Try asking me: 'Show me bakkies under R150,000 in Gauteng' or 'Are there plumbers near Durban?'"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedFilters, setExtractedFilters] = useState<any>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    setExtractedFilters(null);

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: data.advice || `No problem, boet! I've filtered the marketplace for your search.` 
      }]);

      // If the AI found structured filters, we show a button to let the user apply them instantly
      if (data.province || data.city || data.category || data.subcategory || data.query || data.maxPrice) {
        setExtractedFilters({
          province: data.province,
          city: data.city,
          category: data.category,
          subcategory: data.subcategory,
          query: data.query || data.subcategory || userMessage,
          minPrice: data.minPrice || null,
          maxPrice: data.maxPrice || null
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "Eish, my connection took a knock! But don't worry, you can still use the normal search filters at the top." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyExtractedFilters = () => {
    if (extractedFilters) {
      onApplyFilters(extractedFilters);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Lekker! I've set the search filters for you. Take a look at the listings below! 🚀"
      }]);
      setExtractedFilters(null);
    }
  };

  return (
    <>
      {/* Chat floating trigger button */}
      {!isOpen && (
        <button
          id="ai-chat-trigger"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-natural-green hover:bg-natural-green-hover text-white p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 animate-bounce cursor-pointer group"
        >
          <Sparkles className="w-6 h-6 text-natural-amber animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-medium whitespace-nowrap">
            Conversational AI Search
          </span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div 
          id="ai-chat-window"
          className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-natural-bg border border-natural-border rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[500px] text-natural-text"
        >
          {/* Header */}
          <div className="bg-natural-green text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <div className="bg-natural-amber p-1.5 rounded-full text-white">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-sm">Busi - AI Search</h3>
                <p className="text-xs text-natural-amber font-medium">SA Market Hub Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-natural-green-hover rounded-full text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-natural-cream/10">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-natural-green text-white rounded-br-none' 
                      : 'bg-natural-bg border border-natural-border text-natural-text rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-natural-bg border border-natural-border text-natural-muted rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2.5 h-2.5 bg-natural-green rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-natural-amber rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2.5 h-2.5 bg-[#A35D4C] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}

            {/* Extracted filters suggestion */}
            {extractedFilters && !isLoading && (
              <div className="bg-natural-cream/30 border border-natural-border rounded-xl p-3 shadow-inner animate-fade-in space-y-2 text-natural-text">
                <div className="flex gap-1.5 items-start text-xs text-natural-amber font-semibold uppercase tracking-wider">
                  <CornerDownRight className="w-4 h-4 text-natural-amber shrink-0" />
                  <span>Found Matching Classified Search Filters</span>
                </div>
                <div className="text-xs text-natural-muted space-y-1 pl-5">
                  {extractedFilters.category && <div>• Category: <span className="font-semibold text-natural-text">{extractedFilters.category}</span></div>}
                  {extractedFilters.subcategory && <div>• Subcategory: <span className="font-semibold text-natural-text">{extractedFilters.subcategory}</span></div>}
                  {extractedFilters.province && <div>• Province: <span className="font-semibold text-natural-text">{extractedFilters.province}</span></div>}
                  {extractedFilters.city && <div>• City/Town: <span className="font-semibold text-natural-text">{extractedFilters.city}</span></div>}
                  {extractedFilters.maxPrice && <div>• Max Price: <span className="font-semibold text-natural-text">R{extractedFilters.maxPrice}</span></div>}
                </div>
                <button
                  onClick={applyExtractedFilters}
                  className="w-full mt-1 bg-natural-amber hover:opacity-90 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
                >
                  Apply Filters & Search Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-natural-border bg-natural-bg flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Find caravan parks near Durban..."
              className="flex-1 text-sm border border-natural-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-natural-green focus:border-natural-green outline-none bg-natural-cream/30 text-natural-text"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-natural-green text-white p-2.5 rounded-xl hover:bg-natural-green-hover disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
