import React, { useState, useEffect, useRef } from 'react';
import { Activity, Layers, Settings, Search, X, Check, Eye, EyeOff, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type LongTermDataRecord } from './types';
import { type TrendResponse } from '../live-report/types';
import TrendView from '../live-report/TrendView';

interface TrendTabProps {
  data: LongTermDataRecord[];
  onLoadData: (startDate: string, endDate: string) => void;
  loading: boolean;
  onTrendResponseChange?: (response: TrendResponse | null) => void;
  onParameterChange?: (parameter: string) => void;
  onFirstColumnChange?: (firstColumn: string) => void;
}

const FIRST_COLUMN_OPTIONS = [
  { id: 'unit', label: 'Unit' },
  { id: 'articlename', label: 'Article Name' },
  { id: 'articlenumber', label: 'Article Number' },
  { id: 'lotid', label: 'Lot ID' },
  { id: 'machinename', label: 'Machine Name' },
];

const TREND_GROUPS = [
  { id: 'quality', label: 'Quality' },
  { id: 'cuts', label: 'Cuts' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'cmt', label: 'CMT' },
];

const GROUP_PARAMETERS: Record<string, string[]> = {
  quality: ['Nep140', 'Nep200', 'Nep280', 'Nep400', 'Thick35', 'Thick50', 'Thick70', 'Thick100', 'Thin40', 'Thin30', 'Thin50', 'Thin60', 'CVAvg', 'HAvg', 'IPI', 'HSIPI'],
  cuts: ['YarnFaults', 'YarnJoints', 'YarnBreaks', 'NCuts', 'SCuts', 'LCuts', 'TCuts', 'FDCuts', 'PPCuts', 'CpCuts', 'CmCuts', 'CCpCuts', 'CCmCuts', 'JpCuts', 'JmCuts', 'PFCuts'],
  alarms: ['totalAlarms', 'NSABlks', 'LABlks', 'TABlks', 'CABlks', 'CCABlks', 'FABlks', 'PPABlks', 'PFABlks', 'CVpABlks', 'HpABlks', 'CMTABlks'],
  cmt: ['B_A1Events', 'B_A2Events', 'B_B1Events', 'B_B2Events'],
};

const PARAMETER_SHORT_NAMES: Record<string, string> = {
  YarnFaults: 'YF', NCuts: 'N', SCuts: 'S', LCuts: 'L', TCuts: 'T', FDCuts: 'FD', PPCuts: 'PP',
  CpCuts: 'Cp', CmCuts: 'Cm', CCpCuts: 'CCp', CCmCuts: 'CCm', JpCuts: 'Jp', JmCuts: 'Jm', PFCuts: 'PF',
  YarnJoints: 'YJ', YarnBreaks: 'YB', B_A1Events: 'A1', B_A2Events: 'A2', B_B1Events: 'B1', B_B2Events: 'B2',
  CVAvg: 'CV%', HAvg: 'H', NSABlks: 'NS', LABlks: 'LA', TABlks: 'TA', CABlks: 'CA', CCABlks: 'CC',
  FABlks: 'FA', PPABlks: 'PP', PFABlks: 'PF', CVpABlks: 'CV', HpABlks: 'HA', CMTABlks: 'CMT',
  IPI: 'IPI', HSIPI: 'HS IPI', totalAlarms: 'Total Alarms'
};

const DEFAULT_GROUP_PARAMETERS: Record<string, string> = {
  quality: 'IPI',
  cuts: 'YarnFaults',
  alarms: 'totalAlarms',
  cmt: 'B_A1Events'
};

const SearchableMultiSelect: React.FC<{
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}> = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-xs font-bold text-gray-700 cursor-pointer flex justify-between items-center min-h-[42px]"
      >
        <span className="truncate max-w-[150px]">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} selected`}
        </span>
        <div className="flex items-center space-x-1">
          {selectedValues.length > 0 && (
            <X size={14} className="text-gray-400 hover:text-uster-red" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
          )}
          <Search size={14} className="text-gray-400" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-50">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-xs border-none bg-gray-50 rounded-xl focus:ring-0"
                autoFocus
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No results found</div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-700">{opt}</span>
                    {selectedValues.includes(opt) && <Check size={14} className="text-uster-red" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TrendTab: React.FC<TrendTabProps> = ({ data, onLoadData, loading, onTrendResponseChange, onParameterChange, onFirstColumnChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedTrendGroup, setSelectedTrendGroup] = useState<string>('quality');
  const [selectedFirstColumn, setSelectedFirstColumn] = useState<string>('unit');
  const [selectedParameter, setSelectedParameter] = useState<string>(DEFAULT_GROUP_PARAMETERS['quality']);
  const [selectedTrendValues, setSelectedTrendValues] = useState<string[]>([]);
  const [trendResponse, setTrendResponse] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [hideEmptyLatest, setHideEmptyLatest] = useState(true);

  // Propagate changes to parent
  useEffect(() => {
    onTrendResponseChange?.(trendResponse);
  }, [trendResponse, onTrendResponseChange]);

  useEffect(() => {
    onParameterChange?.(selectedParameter);
  }, [selectedParameter, onParameterChange]);

  useEffect(() => {
    onFirstColumnChange?.(selectedFirstColumn);
  }, [selectedFirstColumn, onFirstColumnChange]);

  const availableUnits = Array.from(new Set(data.map(r => String(r.MillUnit)).filter(Boolean))).sort();
  
  const getTrendValueOptions = () => {
    let values: string[] = [];
    switch (selectedFirstColumn) {
      case 'unit': values = data.map(r => String(r.MillUnit)); break;
      case 'machinename': values = data.map(r => r.MachineName); break;
      case 'articlenumber': values = data.map(r => r.ArticleNumber); break;
      case 'articlename': values = data.map(r => r.ArticleName || 'N/A'); break;
      case 'lotid': values = data.map(r => r.LotID); break;
      default: values = [];
    }
    return Array.from(new Set(values.filter(Boolean))).sort();
  };

  const handleShowData = async () => {
    if (startDate && endDate) {
      onLoadData(startDate, endDate);
    }
    
    setTrendLoading(true);

    // Short timeout to wait for data to be potentially updated if onLoadData was called
    // In a real app, you might want to wait for data to change via useEffect or use a Promise
    setTimeout(() => {
      calculateTrend();
    }, 500);
  };

  const calculateTrend = () => {
    try {
      const trendMap: Record<string, Record<string, any>> = {};
      const labelsSet = new Set<string>();
      const datesSet = new Set<string>();
      const labelMachineMap: Record<string, Set<string>> = {};

      data.forEach(item => {
        if (selectedUnit && item.MillUnit !== selectedUnit) return;

        const d = new Date(item.ShiftStartTime);
        if (isNaN(d.getTime())) return;
        const dateStr = d.toISOString().split('T')[0];

        let label = 'Unknown';
        if (selectedFirstColumn === 'unit') label = String(item.MillUnit);
        else if (selectedFirstColumn === 'articlename') label = item.ArticleName || 'Unknown';
        else if (selectedFirstColumn === 'articlenumber') label = item.ArticleNumber || 'Unknown';
        else if (selectedFirstColumn === 'lotid') label = item.LotID || 'Unknown';
        else if (selectedFirstColumn === 'machinename') label = item.MachineName || 'Unknown';

        if (selectedTrendValues.length > 0 && !selectedTrendValues.includes(label)) return;

        labelsSet.add(label);
        datesSet.add(dateStr);

        // Find parameter value
        let val = 0;
        if (selectedParameter === 'IPI') {
          val = (Number(item.Thin50 || 0)) + (Number(item.Thick50 || 0)) + (Number(item.Nep200 || 0));
        } else if (selectedParameter === 'HSIPI') {
          val = (Number(item.Thin40 || 0)) + (Number(item.Thick35 || 0)) + (Number(item.Nep140 || 0));
        } else if (selectedParameter === 'totalAlarms') {
          const alarmColumns = [
            'NSABlks', 'LABlks', 'TABlks', 'CABlks', 'CCABlks', 
            'FABlks', 'PPABlks', 'PFABlks', 'CVpABlks', 'HpABlks', 'CMTABlks'
          ];
          val = alarmColumns.reduce((acc, col) => acc + (Number(item[col]) || 0), 0);
        } else {
          val = Number(item[selectedParameter]) || 0;
        }

        const ipRefLength = Number(item.IPRefLength || 0);
        const yarnLength = Number(item.YarnLength || 0);
        const machineName = item.MachineName || 'Unknown';

        if (!trendMap[dateStr]) trendMap[dateStr] = {};
        if (!trendMap[dateStr][label]) {
          trendMap[dateStr][label] = { sum: 0, refLength: 0, yarnLength: 0, count: 0, machines: {} };
        }
        
        const stats = trendMap[dateStr][label];
        stats.sum += val;
        stats.refLength += ipRefLength;
        stats.yarnLength += yarnLength;
        stats.count += 1;

        if (!stats.machines[machineName]) {
          stats.machines[machineName] = { sum: 0, refLength: 0, yarnLength: 0, count: 0 };
        }
        stats.machines[machineName].sum += val;
        stats.machines[machineName].refLength += ipRefLength;
        stats.machines[machineName].yarnLength += yarnLength;
        stats.machines[machineName].count += 1;
      });

      const sortedDates = Array.from(datesSet).sort();
      
      const calculateFinal = (s: any) => {
        if (selectedTrendGroup === 'quality') {
          if (selectedParameter === 'CVAvg' || selectedParameter === 'HAvg') {
            return s.count > 0 ? (s.sum / s.count).toFixed(2) : "0.00";
          } else {
            return s.refLength > 0 ? (s.sum / s.refLength).toFixed(2) : "0.00";
          }
        } else if (selectedTrendGroup === 'cuts' || selectedTrendGroup === 'cmt') {
          return s.yarnLength > 0 ? ((s.sum / s.yarnLength) * 100).toFixed(2) : "0.00";
        } else {
          return s.sum.toString();
        }
      };

      const result = sortedDates.map(date => {
        const row: any = { date };
        Object.keys(trendMap[date]).forEach(label => {
          row[label] = calculateFinal(trendMap[date][label]);
          if (!labelMachineMap[label]) labelMachineMap[label] = new Set();
          Object.keys(trendMap[date][label].machines).forEach(m => labelMachineMap[label].add(m));
        });
        return row;
      });

      const drillDownData: any = {};
      Object.keys(labelMachineMap).forEach(label => {
        const machines = Array.from(labelMachineMap[label]).sort();
        drillDownData[label] = {
          labels: machines,
          data: sortedDates.map(date => {
            const dRow: any = { date };
            machines.forEach(m => {
              if (trendMap[date] && trendMap[date][label] && trendMap[date][label].machines[m]) {
                dRow[m] = calculateFinal(trendMap[date][label].machines[m]);
              }
            });
            return dRow;
          })
        };
      });

      setTrendResponse({
        data: result,
        labels: Array.from(labelsSet).sort(),
        dates: sortedDates,
        drillDownData: drillDownData
      });
    } catch (error) {
      console.error("Error calculating trend:", error);
    } finally {
      setTrendLoading(false);
    }
  };

  // If data changes from outside (backend fetch), recalculate trend if we have a response already
  useEffect(() => {
    if (trendResponse && !loading) {
      calculateTrend();
    }
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-black space-y-4">
        <div className="flex flex-col space-y-3">
          {/* Date Filters */}
          <div className="flex space-x-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Start Date</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14} /></div>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer" 
                />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">End Date</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14} /></div>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer" 
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Activity size={14} /></div>
              <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                <option value="">All Units</option>
                {availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Layers size={14} /></div>
              <select 
                value={selectedTrendGroup} 
                onChange={(e) => {
                  setSelectedTrendGroup(e.target.value);
                  setSelectedParameter(DEFAULT_GROUP_PARAMETERS[e.target.value]);
                }} 
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
              >
                {TREND_GROUPS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Settings size={14} /></div>
              <select 
                value={selectedFirstColumn} 
                onChange={(e) => {
                  setSelectedFirstColumn(e.target.value);
                  setSelectedTrendValues([]);
                }} 
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
              >
                {FIRST_COLUMN_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Settings size={14} /></div>
              <select 
                value={selectedParameter} 
                onChange={(e) => setSelectedParameter(e.target.value)} 
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
              >
                {GROUP_PARAMETERS[selectedTrendGroup].map(opt => (
                  <option key={opt} value={opt}>
                    {PARAMETER_SHORT_NAMES[opt] || opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex space-x-3">
            <div className="flex-1">
              <SearchableMultiSelect
                options={getTrendValueOptions()}
                selectedValues={selectedTrendValues}
                onChange={setSelectedTrendValues}
                placeholder={`Select ${FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFirstColumn)?.label || 'Values'}...`}
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={handleShowData}
              disabled={trendLoading || loading}
              className="flex-1 bg-uster-red text-white font-black uppercase tracking-widest py-3 rounded-2xl shadow-lg shadow-uster-red/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {trendLoading || loading ? 'Loading Data...' : 'Show Data'}
            </button>
            <button 
              onClick={() => setHideEmptyLatest(!hideEmptyLatest)}
              className={`w-12 flex items-center justify-center rounded-2xl transition-all ${
                hideEmptyLatest ? 'bg-uster-red text-white shadow-lg shadow-uster-red/20' : 'bg-gray-50 text-gray-400'
              }`}
              title={hideEmptyLatest ? "Showing rows with latest data" : "Showing all rows"}
            >
              {hideEmptyLatest ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </div>

      <TrendView 
        response={trendResponse} 
        loading={trendLoading || loading} 
        parameter={PARAMETER_SHORT_NAMES[selectedParameter] || selectedParameter} 
        hideEmptyLatest={hideEmptyLatest}
      />
    </div>
  );
};

export default TrendTab;
