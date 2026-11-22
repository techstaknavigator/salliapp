import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";

export function LoginView() {
  const { login, logoutNotice, showToast, updateSecurityPin } = useFinance();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set Custom PIN accordion
  const [showCustomPinSetup, setShowCustomPinSetup] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [customPinMsg, setCustomPinMsg] = useState(null);

  const handleKeypadPress = (digit) => {
    setError("");
    if (digit === "clear") {
      setPin("");
    } else if (digit === "backspace") {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 16) {
        setPin((prev) => prev + digit);
      }
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter your Security PIN.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await login(pin);
      if (!res || res.success === false) {
        setError(res?.error || "Invalid PIN or password. Try default PIN: 1234");
      }
    } catch (err) {
      setError("Authentication error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPin = async (e) => {
    e.preventDefault();
    setCustomPinMsg(null);

    if (newPinInput !== confirmPinInput) {
      setCustomPinMsg({ type: "error", text: "New PIN and confirmation do not match." });
      return;
    }

    if (newPinInput.length < 8) {
      setCustomPinMsg({ type: "error", text: "New PIN or Passphrase must be at least 8 characters for enhanced security." });
      return;
    }

    const success = await updateSecurityPin(currentPinInput || "1234", newPinInput);
    if (success) {
      setCustomPinMsg({ type: "success", text: "PIN successfully updated! You can now authenticate with your new PIN." });
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
      setPin(newPinInput);
    } else {
      setCustomPinMsg({ type: "error", text: "Failed to update PIN. Check your current PIN." });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto space-y-6 relative z-10">
        {/* Brand / Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/20 mb-2">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Personal Salary & Finance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Excel-Only Database Architecture • Client-Side Security
          </p>
        </div>

        {/* Post-Logout Notice Banner */}
        {logoutNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{logoutNotice}</span>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-emerald-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Web Crypto PBKDF2 Authentication</span>
            </div>
            <h2 className="text-lg font-bold text-white">Unlock Your Financial Session</h2>
            <p className="text-xs text-slate-400">
              Enter your master PIN to access your local financial workspace.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* PIN Display & Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                    setError("");
                    setPin(e.target.value);
                  }}
                  maxLength={64}
                  placeholder="Enter PIN or Passphrase (min 4)"
                  className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-center text-lg sm:text-xl font-mono tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Quick Access Helper Badge */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <Info className="w-3 h-3 text-slate-500" />
                Default PIN: <strong className="text-emerald-400 font-mono">1234</strong>
              </span>
              <button
                type="button"
                onClick={() => setPin("1234")}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2"
              >
                Auto-fill Default
              </button>
            </div>

            {/* Touch-Friendly Number Pad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num.toString())}
                  className="h-11 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 active:bg-emerald-600/30 text-white font-mono font-bold text-base transition-all flex items-center justify-center border border-slate-800 hover:border-slate-700"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress("clear")}
                className="h-11 rounded-xl bg-slate-800/40 hover:bg-rose-950/40 active:bg-rose-900/40 text-rose-400 font-medium text-xs transition-all flex items-center justify-center border border-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("0")}
                className="h-11 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 active:bg-emerald-600/30 text-white font-mono font-bold text-base transition-all flex items-center justify-center border border-slate-800 hover:border-slate-700"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("backspace")}
                className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-700/40 text-slate-400 font-medium text-xs transition-all flex items-center justify-center border border-slate-800"
              >
                ⌫
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <span>{isSubmitting ? "Verifying..." : "Authenticate Session"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Toggle Custom PIN Setup */}
          <div className="pt-2 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setShowCustomPinSetup(!showCustomPinSetup)}
              className="text-xs text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showCustomPinSetup ? "Hide PIN Settings" : "Configure Custom Master PIN"}</span>
            </button>
          </div>

          {/* Custom PIN Form Accordion */}
          {showCustomPinSetup && (
            <form onSubmit={handleSaveNewPin} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Change or Set Custom PIN
              </h3>

              {customPinMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    customPinMsg.type === "success"
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                      : "bg-rose-950/60 text-rose-300 border border-rose-800/50"
                  }`}
                >
                  {customPinMsg.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{customPinMsg.text}</span>
                </div>
              )}

              <input
                type="password"
                placeholder="Current PIN (Default: 1234)"
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="password"
                placeholder="New PIN or Passphrase (min 8 chars)"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
              <input
                type="password"
                placeholder="Confirm New PIN or Passphrase"
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Save New PIN
              </button>
            </form>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>
            Zero Server Uploads • In-Memory Session Security • Excel Database Custody
          </p>
          <p className="text-slate-600">
            Sessions automatically terminate on window close or page refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
