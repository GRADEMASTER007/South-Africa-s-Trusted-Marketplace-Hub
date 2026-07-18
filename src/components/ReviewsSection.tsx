import React, { useState, useEffect } from 'react';
import { Star, Send, ShieldAlert, CheckCircle } from 'lucide-react';
import { Review } from '../types';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

interface ReviewsSectionProps {
  targetId: string; // seller userId or businessId
  currentUser: any;
}

export default function ReviewsSection({ targetId, currentUser }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseAvailable && db) {
        const q = query(
          collection(db, "reviews"),
          where("targetId", "==", targetId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(fetched);
      } else {
        // Fallback local storage reviews
        const allReviews = JSON.parse(localStorage.getItem('samarket_reviews') || '[]');
        const filtered = allReviews
          .filter((r: any) => r.targetId === targetId)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(filtered);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [targetId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage("You must login to post a seller review.");
      return;
    }
    if (!comment.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    const newReview = {
      targetId,
      reviewerId: currentUser.uid,
      reviewerName: currentUser.displayName || 'Verified Buyer',
      reviewerPhoto: currentUser.photoURL || '',
      rating,
      text: comment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "reviews"), newReview);
      } else {
        const allReviews = JSON.parse(localStorage.getItem('samarket_reviews') || '[]');
        allReviews.push({ id: Math.random().toString(36).substring(2, 9), ...newReview });
        localStorage.setItem('samarket_reviews', JSON.stringify(allReviews));
      }

      setComment('');
      setRating(5);
      setMessage("Review published! Thank you for strengthening community trust.");
      fetchReviews();
    } catch (err) {
      console.error(err);
      setMessage("Eish, failed to submit review. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : '5.0';

  return (
    <div className="bg-natural-bg rounded-2xl border border-natural-border p-6 space-y-6 text-natural-text">
      <div className="flex items-center justify-between border-b border-natural-border pb-4">
        <div>
          <h4 className="font-serif font-bold text-natural-text text-base">Seller Reviews & Trust</h4>
          <p className="text-xs text-natural-muted">Based on verified marketplace interactions</p>
        </div>
        <div className="text-right flex items-center gap-2">
          <div className="bg-natural-cream text-natural-amber font-black text-xl px-2.5 py-1 rounded-xl border border-natural-border">
            {averageRating}
          </div>
          <div className="text-left">
            <div className="flex text-natural-amber">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`w-3.5 h-3.5 ${s <= Math.round(Number(averageRating)) ? 'fill-natural-amber text-natural-amber' : 'text-natural-cream'}`} 
                />
              ))}
            </div>
            <p className="text-[10px] text-natural-dusty font-bold uppercase">{reviews.length} reviews</p>
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-natural-muted">Loading feedback...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-natural-border rounded-xl space-y-1.5 bg-natural-cream/5">
            <p className="text-xs text-natural-text font-bold">No Reviews Yet</p>
            <p className="text-[10px] text-natural-muted max-w-[200px] mx-auto">Be the first to share your experience with this seller!</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-natural-cream/15 rounded-xl p-4 space-y-1.5 border border-natural-border">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <img 
                    src={r.reviewerPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}
                    alt={r.reviewerName}
                    className="w-5.5 h-5.5 rounded-full"
                  />
                  <span className="font-bold text-natural-text">{r.reviewerName}</span>
                </div>
                <span className="text-[10px] text-natural-dusty">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex text-natural-amber">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-natural-amber text-natural-amber' : 'text-natural-cream'}`} />
                ))}
              </div>

              <p className="text-xs text-natural-muted leading-relaxed pl-1 font-sans">
                {r.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Post a Review */}
      {currentUser ? (
        <form onSubmit={handleSubmitReview} className="pt-4 border-t border-natural-border space-y-3">
          <h5 className="font-serif font-bold text-natural-text text-xs">Leave a Review</h5>
          
          {message && (
            <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl border border-natural-green/20 bg-natural-green/5 text-natural-green font-medium animate-fade-in">
              <CheckCircle className="w-4 h-4 text-natural-green shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-natural-dusty uppercase">Your Rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="cursor-pointer hover:scale-115 transition-transform"
                >
                  <Star className={`w-5 h-5 ${s <= rating ? 'text-natural-amber fill-natural-amber' : 'text-natural-cream fill-none'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Excellent communication and safe handover, sharp-sharp!"
              className="flex-1 text-xs border border-natural-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-natural-green focus:border-natural-green outline-none bg-natural-cream/30 text-natural-text"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-natural-green hover:bg-natural-green-hover text-white p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-natural-cream/30 border border-natural-border p-3.5 rounded-xl text-center text-xs text-natural-text flex items-center gap-2 justify-center">
          <ShieldAlert className="w-4.5 h-4.5 text-natural-amber shrink-0" />
          <span>You must be signed in to submit community reviews.</span>
        </div>
      )}
    </div>
  );
}
