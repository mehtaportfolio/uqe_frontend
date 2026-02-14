import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  BarChart3, 
  Home, 
  Settings, 
  Layers,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import LiveReport from './components/LiveReport';
import LongTermReport from './components/LongTermReport';
import Login from './components/Login';
import SettingsView from './components/Settings';
import RestartButton from './components/RestartButton';

const API_BASE = import.meta.env.VITE_API_URL;

interface UnitCuts {
  YarnFaults?: number | string;
  NCuts?: number | string;
  SCuts?: number | string;
  LCuts?: number | string;
  FDCuts?: number | string;
  PPCuts?: number | string;
}

interface UnitData {
  unit?: string;
  unitCuts?: UnitCuts;
  shiftNumber?: string;
  latestShift?: string;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userPassword, setUserPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState('home');
  const [unitsData, setUnitsData] = useState<UnitData[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // PWA Auto Update logic
  useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      // Force reload when a new version is available
      window.location.reload();
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`${API_BASE}/quantum/live`);
      const result = await response.json();
      setUnitsData(result);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching live data:", error);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchData();
      const dataInterval = setInterval(fetchData, 30000);
      return () => clearInterval(dataInterval);
    }
  }, [fetchData, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && unitsData.length > 0) {
      const rotationInterval = setInterval(() => {
        setCurrentUnitIndex((prevIndex) => (prevIndex + 1) % unitsData.length);
      }, 4000); // 4 seconds rotation
      return () => clearInterval(rotationInterval);
    }
  }, [unitsData.length, isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLogin={(pwd) => {
      setIsAuthenticated(true);
      setUserPassword(pwd);
    }} />;
  }

  const currentUnitData: UnitData = unitsData[currentUnitIndex] || {};
  const unitCuts = currentUnitData.unitCuts || {};

  const formatOneDecimal = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0.0';
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

  const stats = [
    { label: 'YF', value: formatOneDecimal(unitCuts.YarnFaults || 0) },
    { label: 'N', value: formatOneDecimal(unitCuts.NCuts || 0) },
    { label: 'S', value: formatOneDecimal(unitCuts.SCuts || 0) },
    { label: 'L', value: formatOneDecimal(unitCuts.LCuts || 0) },
    { label: 'FD', value: formatOneDecimal(unitCuts.FDCuts || 0) },
    { label: 'PP', value: formatOneDecimal(unitCuts.PPCuts || 0) },
  ];

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return <LiveReport onBack={() => setActiveTab('home')} initialTab="dashboard" />;
    }
    if (activeTab === 'online') {
      return <LiveReport onBack={() => setActiveTab('home')} initialTab="online" />;
    }
    if (activeTab === 'longterm') {
      return <LongTermReport onBack={() => setActiveTab('home')} />;
    }
    if (activeTab === 'settings') {
      return <SettingsView onBack={() => setActiveTab('home')} currentPassword={userPassword} />;
    }

    return (
      <>
        {/* Header */}
        <header className="bg-red-600 px-6 pt-4 pb-12 rounded-b-[40px] shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Home className="text-white" size={20} />
            </div>
            <div className="flex space-x-3">
              <RestartButton />
              <button 
                onClick={() => {
                  setIsAuthenticated(false);
                  setActiveTab('home');
                }}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
              >
                <LogOut className="text-white" size={20} />
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
              >
                <Settings className="text-white" size={20} />
              </button>
            </div>
          </div>
          <div className="text-white">
            <p className="text-red-100 text-sm font-medium">Welcome back,</p>
            <h1 className="text-2xl font-black uppercase tracking-tight">Uster Quantum Report</h1>
          </div>
        </header>

        {/* Unit Header */}
        <div className="px-6 -mt-8">
          <div className="bg-white p-4 rounded-2xl shadow-md border-l-4 border-red-600 flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Active Unit</p>
              <h2 className="text-2xl font-black text-gray-800">{currentUnitData.unit || 'Loading...'}</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 ${loading ? 'bg-amber-400' : 'bg-green-400'} rounded-full animate-pulse`}></span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                {loading ? 'Loading Data...' : `Live Data ${currentUnitData.latestShift && currentUnitData.latestShift !== 'All' ? `(${currentUnitData.latestShift})` : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Individual Cards Grid */}
        {!loading && (
          <main className="flex-1 px-6 pt-6 pb-24">
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {stats.map((stat, index) => (
                  <motion.div
                    key={`${currentUnitData.unit}-${stat.label}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden h-32"
                  >
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full opacity-50"></div>
                    <p className="text-[24px] font-black text-red-600 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                    <p className="text-3xl font-black text-gray-800">{stat.value}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </main>
        )}

        {loading && (
          <main className="flex-1 px-6 pt-12 flex flex-col items-center justify-start opacity-50">
             <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Fetching latest reports...</p>
          </main>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans text-gray-900 select-none">
      
      {renderContent()}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] z-[100]">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'dashboard', icon: Activity, label: 'Dashboard' },
          { id: 'online', icon: Layers, label: 'Online Data' },
          { id: 'longterm', icon: BarChart3, label: 'Long Term' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-all ${activeTab === tab.id ? 'text-red-600' : 'text-black'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-red-50' : ''}`}>
              <tab.icon size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
