import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

interface RestartButtonProps {
  className?: string;
  variant?: 'icon' | 'full';
}

const RestartButton: React.FC<RestartButtonProps> = ({ className = "", variant = 'icon' }) => {
  const [restartLoading, setRestartLoading] = useState(false);

  const handleRestartServer = async () => {
    setRestartLoading(true);
    try {
      const response = await fetch(`${API_BASE}/restart-server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON response (like 404 from Render if not deployed)
        await response.text();
        throw new Error(response.status === 404 ? 'Restart endpoint not found. Please ensure the backend is deployed with the new changes.' : `Server error: ${response.status}`);
      }

      if (!response.ok) {
        alert(data.error || 'Failed to restart server');
      } else {
        alert('Server is restarted');
      }
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('An error occurred. Please try again later.');
      }
      console.error(err);
    } finally {
      setRestartLoading(false);
    }
  };

  if (variant === 'full') {
    return (
      <button
        onClick={handleRestartServer}
        disabled={restartLoading}
        className={`w-full bg-gray-50 hover:bg-gray-100 text-gray-800 p-4 sm:p-6 rounded-2xl flex items-center justify-between border-2 border-gray-100 transition-all group ${restartLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            {restartLoading ? (
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <RefreshCw size={20} className="sm:w-6 sm:h-6" />
            )}
          </div>
          <div className="text-left">
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">System</p>
            <p className="text-base sm:text-lg font-black uppercase">Server Restart</p>
          </div>
        </div>
        <RefreshCw className={`text-gray-300 ${restartLoading ? 'animate-spin' : ''}`} size={18} />
      </button>
    );
  }

  return (
    <button 
      onClick={handleRestartServer}
      disabled={restartLoading}
      title="Restart Server"
      className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${restartLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'} ${className}`}
    >
      <RefreshCw className={`text-white ${restartLoading ? 'animate-spin' : ''}`} size={20} />
    </button>
  );
};

export default RestartButton;
