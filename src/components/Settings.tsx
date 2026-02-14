import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, Save, AlertCircle, CheckCircle2, Key, X, Fingerprint } from 'lucide-react';
import RestartButton from './RestartButton';
import { isBiometricAvailable, getBiometricEnabled, setBiometricEnabled, authenticateWithBiometrics, registerBiometrics } from '../utils/bioAuth';

interface SettingsProps {
  onBack: () => void;
  currentPassword: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

const Settings: React.FC<SettingsProps> = ({ onBack, currentPassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    const checkBio = async () => {
      const supported = await isBiometricAvailable();
      setBioSupported(supported);
      setBioEnabled(getBiometricEnabled());
    };
    checkBio();
  }, []);

  const handleToggleBio = async () => {
    const newState = !bioEnabled;
    
    if (newState) {
      // Ask for biometric verification before enabling
      // We use registerBiometrics to ensure a credential exists and trigger the prompt
      const success = await registerBiometrics();
      if (!success) {
        setError('Biometric registration failed');
        return;
      }
    }
    
    setBioEnabled(newState);
    setBiometricEnabled(newState, currentPassword);
    
    if (newState) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
      } else {
        // Update stored biometric password if enabled
        if (bioEnabled) {
          setBiometricEnabled(true, newPassword);
        }
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans select-none relative">
      {/* Header */}
      <header className="bg-red-600 px-6 pt-4 pb-12 rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
          >
            <ArrowLeft className="text-white" size={20} />
          </button>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Settings</h1>
          <div className="w-10"></div>
        </div>
        <div className="text-white text-center">
          <p className="text-red-100 text-sm font-medium">Manage your system</p>
          <h2 className="text-2xl font-black uppercase tracking-tight">Preferences</h2>
        </div>
      </header>

      <main className="flex-1 px-6 -mt-8 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 space-y-4 sm:space-y-6"
        >
          <div className="space-y-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 p-4 sm:p-6 rounded-2xl flex items-center justify-between border-2 border-gray-100 transition-all group"
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                  <Key size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security</p>
                  <p className="text-base sm:text-lg font-black uppercase">Change Password</p>
                </div>
              </div>
              <ArrowLeft className="rotate-180 text-gray-300" size={18} />
            </button>

            {bioSupported && (
              <div
                className="w-full bg-gray-50 text-gray-800 p-4 sm:p-6 rounded-2xl flex items-center justify-between border-2 border-gray-100 transition-all"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Fingerprint size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Authentication</p>
                    <p className="text-base sm:text-lg font-black uppercase">Biometric Login</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleBio}
                  className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${bioEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <motion.div 
                    animate={{ x: bioEnabled ? 24 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            )}
            <RestartButton variant="full" />
          </div>
        </motion.div>
      </main>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-6 top-[20%] bg-white rounded-[40px] shadow-2xl z-[201] overflow-hidden"
            >
              <div className="bg-red-600 p-6 flex justify-between items-center">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Change Password</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2 ml-1">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className="block w-full pl-12 pr-4 py-3 sm:py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-red-600 focus:bg-white transition-all font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2 ml-1">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm New Password"
                        className="block w-full pl-12 pr-4 py-3 sm:py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-red-600 focus:bg-white transition-all font-bold"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 sm:p-4 rounded-xl border border-red-100"
                    >
                      <AlertCircle size={18} />
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">{error}</p>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 sm:p-4 rounded-xl border border-green-100"
                    >
                      <CheckCircle2 size={18} />
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">Password changed successfully!</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="mr-2" size={20} />
                        Update Password
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
