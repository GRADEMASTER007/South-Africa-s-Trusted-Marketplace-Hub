import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, AlertCircle } from 'lucide-react';

interface AdCreationAssistantProps {
  draftTitle: string;
  draftDescription: string;
  draftCategory: string;
  onApplySuggestions: (suggestions: {
    title: string;
    description: string;
    category: string;
    subcategory: string;
    suggestedPrice: number;
    keywords: string;
  }) => void;
}

export default function AdCreationAssistant({
  draftTitle,
  draftDescription,
  draftCategory,
  onApplySuggestions
}: AdCreationAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    if (!draftDescription || draftDescription.length < 5) {
      setError("Please write at least a few words in the description box first so the AI can analyze your listing.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setSuggestions(null);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDescription,
          category: draftCategory
        })
      });

      if (!response.ok) {
        throw new Error("Could not fetch optimization suggestions.");
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err: any) {
      console.error(err);
      setError("Eish, failed to connect to Gemini copywriter. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      // Parse pricing range to an single integer fallback
      let price = 0;
      if (suggestions.estimatedPricing) {
        const numbers = suggestions.estimatedPricing.replace(/[^0-9]/g, '');
        if (numbers) {
          // If a range is returned, take the starting or lower number
          price = parseInt(numbers.substring(0, 5)) || 0;
        }
      }

      onApplySuggestions({
        title: suggestions.suggestedTitle || draftTitle,
        description: suggestions.improvedDescription || draftDescription,
        category: suggestions.suggestedCategory || draftCategory,
        subcategory: suggestions.suggestedSubcategory || '',
        suggestedPrice: price,
        keywords: suggestions.southAfricanKeywords || ''
      });
      setSuggestions(null);
    }
  };

  return (
    <div id="ai-ad-assistant" className="bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-emerald-950 text-sm">Gemini AI Listing Assistant</h3>
          <p className="text-xs text-emerald-700">Write high-converting ads instantly</p>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        Type some rough details about what you're advertising below (e.g., condition, specs, reason for selling), then click the button below. Busi will write a professional South African sales description, propose Rands pricing, and choose the ideal categories for you.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!suggestions ? (
        <button
          type="button"
          onClick={handleGetSuggestions}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-sm hover:scale-[1.01]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Writing with Gemini AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce" />
              Optimize my Ad with AI
            </>
          )}
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-150 p-4 space-y-3 shadow-inner text-xs">
          <div className="border-b border-gray-100 pb-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Suggested Title</span>
            <p className="font-bold text-gray-800 text-sm">{suggestions.suggestedTitle}</p>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Improved Description Preview</span>
            <div className="text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
              {suggestions.improvedDescription}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Estimated Value (SA Rand)</span>
              <p className="font-bold text-emerald-800">{suggestions.estimatedPricing || "Market-related"}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Suggested Category</span>
              <p className="font-semibold text-gray-700">{suggestions.suggestedCategory} &gt; {suggestions.suggestedSubcategory}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to form
            </button>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="px-3 py-2 text-gray-500 hover:bg-gray-150 rounded-lg font-medium cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
