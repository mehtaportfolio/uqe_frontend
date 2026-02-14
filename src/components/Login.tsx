import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, AlertCircle, Fingerprint } from 'lucide-react';
import { getBiometricEnabled, getStoredPassword, authenticateWithBiometrics } from '../utils/bioAuth';

interface LoginProps {
  onLogin: (password: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBioEnabled, setIsBioEnabled] = useState(false);

  const handleBioAuth = useCallback(async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      const storedPassword = getStoredPassword();
      if (storedPassword) {
        // Automatically login with stored password
        onLogin(storedPassword);
      } else {
        setError('Biometric data found but password missing. Please enter password.');
      }
    }
  }, [onLogin]);

  useEffect(() => {
    const enabled = getBiometricEnabled();
    setIsBioEnabled(enabled);
    
    if (enabled) {
      // Auto-trigger bio auth after a short delay to allow UI to render
      const timer = setTimeout(() => {
        handleBioAuth();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [handleBioAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Incorrect password');
        setError(errorMsg);
      } else {
        onLogin(password);
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-6 font-sans select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-xl overflow-hidden"
      >
        <div className="bg-red-600 p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight text-center">
            Uster Quantum
          </h1>
          <p className="text-red-100 text-sm mt-2">Enter password to access dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Lock size={20} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-red-600 focus:bg-white transition-all text-lg font-bold placeholder:font-medium"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100"
            >
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Unlock Dashboard'
            )}
          </button>

          {isBioEnabled && (
            <button
              type="button"
              onClick={handleBioAuth}
              className="w-full bg-blue-50 text-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest border-2 border-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Fingerprint size={20} />
              <span>Use Biometrics</span>
            </button>
          )}
        </form>
      </motion.div>
      
      <p className="mt-8 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        Uster Mobile Dashboard v1.0
      </p>
    </div>
  );
};

export default Login;
