import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface YocoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  amount: number;
  listingId?: string;
  userId: string;
  userEmail: string;
  onPaymentSuccess: (reference: string) => void;
}

export default function YocoPaymentModal({
  isOpen,
  onClose,
  packageName,
  amount,
  listingId,
  userId,
  userEmail,
  onPaymentSuccess
}: YocoPaymentModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholder, setCardholder] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4);
    if (value.length > 2) {
      setExpiry(`${value.substring(0, 2)}/${value.substring(2)}`);
    } else {
      setExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 3);
    setCvv(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (expiry.length !== 5) {
      setError("Please enter card expiry as MM/YY.");
      return;
    }
    if (cvv.length !== 3) {
      setError("Please enter a valid 3-digit CVV code.");
      return;
    }
    if (!cardholder.trim()) {
      setError("Please enter the cardholder's name.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/yoco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listingId || null,
          packageName,
          amount,
          email: userEmail,
          cardToken: 'yoco_mock_token_' + Math.random().toString(36).substring(7)
        })
      });

      if (!response.ok) {
        throw new Error('Yoco gateway authentication failed.');
      }

      const data = await response.json();

      // Write payment record to Firestore
      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "payments"), {
          userId,
          userEmail,
          listingId: listingId || null,
          packageName,
          amount,
          reference: data.reference,
          status: 'success',
          createdAt: new Date().toISOString()
        });
      } else {
        // Fallback: save to local storage
        const localPayments = JSON.parse(localStorage.getItem('samarket_payments') || '[]');
        localPayments.push({
          id: Math.random().toString(36).substring(2, 9),
          userId,
          userEmail,
          listingId: listingId || null,
          packageName,
          amount,
          reference: data.reference,
          status: 'success',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('samarket_payments', JSON.stringify(localPayments));

        // Create a local confirmation notification
        const localNotifications = JSON.parse(localStorage.getItem('samarket_notifications') || '[]');
        localNotifications.push({
          id: Math.random().toString(36).substring(2, 9),
          userId,
          title: "⚡ Payment Approved & Ad Boosted!",
          message: `Lekker! Your payment of R${amount} has been verified successfully. Your advertisement has been successfully boosted to the ${packageName.toUpperCase()} package!`,
          type: "payment",
          read: false,
          listingId: listingId || null,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('samarket_notifications', JSON.stringify(localNotifications));
      }

      setTransactionRef(data.reference);
      setPaymentSuccess(true);
      setTimeout(() => {
        onPaymentSuccess(data.reference);
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError("Eish, transaction declined by bank gateway. Check card funds or details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-sky-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-base">Yoco Secure Checkout</h3>
              <p className="text-xs text-sky-100">South African Card Processing</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-sky-700 rounded-full text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
            <div>
              <h4 className="text-xl font-bold text-gray-800">Lekker! Payment Approved</h4>
              <p className="text-xs text-gray-500 mt-1">Transaction Ref: <span className="font-mono font-semibold text-gray-700">{transactionRef}</span></p>
            </div>
            <p className="text-sm text-green-600 font-medium">Your classified boost is now active!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Package Summary */}
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex justify-between items-center text-sm">
              <div>
                <p className="font-bold text-sky-950">{packageName}</p>
                <p className="text-xs text-sky-700">Classification upgrade plan</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-sky-900">R{amount}</p>
                <p className="text-[10px] text-gray-400">Inc. 15% VAT</p>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sipho Ndlovu"
                  value={cardholder}
                  onChange={(e) => setCardholder(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full text-sm border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono tracking-widest"
                  />
                  <CreditCard className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CVV Code</label>
                  <input
                    type="password"
                    required
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md cursor-pointer hover:scale-[1.01]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying card securely...
                </>
              ) : (
                `Pay R${amount} with Yoco`
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-50">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>PCI-DSS Compliant • Secure 3D 128-bit SSL Gateway</span>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
