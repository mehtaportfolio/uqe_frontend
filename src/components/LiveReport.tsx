import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Home,
  RefreshCw,
  Download,
  Scissors,
  Bell,
  RotateCcw,
  Calendar,
  Layers,
  Settings,
  Repeat,
  TrendingUp,
  Search,
  X,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Sub-components and types
import { type LiveReportData, type TrendResponse } from './live-report/types';
import { getMachineWiseData } from './live-report/utils';
import DashboardView from './live-report/DashboardView';
import CutsView from './live-report/CutsView';
import AlarmsView from './live-report/AlarmsView';
import QualityView from './live-report/QualityView';
import TrendView from './live-report/TrendView';
import RestartButton from './RestartButton';

const API_BASE = import.meta.env.VITE_API_URL;

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
  alarms: ['totalAlarms', 'YABlks', 'NSABlks', 'LABlks', 'TABlks', 'CABlks', 'CCABlks', 'FABlks', 'PPABlks', 'PFABlks', 'CVpABlks', 'HpABlks', 'CMTABlks'],
  cmt: ['B_A1Events', 'B_A2Events', 'B_B1Events', 'B_B2Events'],
};

const PARAMETER_SHORT_NAMES: Record<string, string> = {
  YarnFaults: 'YF', NCuts: 'N', SCuts: 'S', LCuts: 'L', TCuts: 'T', FDCuts: 'FD', PPCuts: 'PP',
  CpCuts: 'Cp', CmCuts: 'Cm', CCpCuts: 'CCp', CCmCuts: 'CCm', JpCuts: 'Jp', JmCuts: 'Jm', PFCuts: 'PF',
  YarnJoints: 'YJ', YarnBreaks: 'YB', B_A1Events: 'A1', B_A2Events: 'A2', B_B1Events: 'B1', B_B2Events: 'B2',
  CVAvg: 'CV%', HAvg: 'H', NSABlks: 'NS', LABlks: 'LA', TABlks: 'TA', CABlks: 'CA', CCABlks: 'CCA',
  FABlks: 'FA', PPABlks: 'PPA', PFABlks: 'PFA', CVpABlks: 'CVpA', HpABlks: 'HpA', CMTABlks: 'CMTA',
  YABlks: 'YA', IPI: 'IPI', HSIPI: 'HS IPI', totalAlarms: 'Total Alarms'
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
        className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 px-4 text-xs font-bold text-gray-700 cursor-pointer flex justify-between items-center min-h-[42px]"
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

interface LiveReportProps {
  onBack: () => void;
  initialTab?: 'dashboard' | 'online';
  initialData?: LiveReportData[];
}

const LiveReport: React.FC<LiveReportProps> = ({ onBack, initialTab = 'dashboard', initialData = [] }) => {
  const [data, setData] = useState<LiveReportData[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quality' | 'cuts' | 'alarms' | 'trend'>('dashboard');
  const [mainTab, setMainTab] = useState<'dashboard' | 'online'>(initialTab);
  const [viewMode, setViewMode] = useState<'article' | 'machine'>('article');

  useEffect(() => {
    setMainTab(initialTab);
    if (initialTab === 'dashboard') {
      setActiveTab('dashboard');
      // Reset date to empty when switching to dashboard so it triggers the "yesterday" default
      setSelectedDate('');
    } else if (activeTab === 'dashboard') {
      setActiveTab('cuts');
    }
  }, [initialTab]);

  const [availableFilters, setAvailableFilters] = useState<{ 
    dates: string[], 
    shifts: (string | number)[], 
    units: string[], 
    machines: string[],
    articles: string[],
    articleNames: string[],
    lotIds: string[]
  }>({ dates: [], shifts: [], units: [], machines: [], articles: [], articleNames: [], lotIds: [] });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});
  
  // Trend specific state
  const [selectedTrendGroup, setSelectedTrendGroup] = useState<string>('quality');
  const [selectedFirstColumn, setSelectedFirstColumn] = useState<string>('unit');
  const [selectedFilterColumn, setSelectedFilterColumn] = useState<string>('unit');
  const [selectedReportType, setSelectedReportType] = useState<'daily' | 'shift'>('daily');
  const [selectedParameter, setSelectedParameter] = useState<string>(DEFAULT_GROUP_PARAMETERS['quality']);
  const [selectedTrendValues, setSelectedTrendValues] = useState<string[]>([]);
  const [selectedTrendDates, setSelectedTrendDates] = useState<string[]>([]);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);
  const [trendResponse, setTrendResponse] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [hideEmptyLatest, setHideEmptyLatest] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTabElement = tabsRef.current.querySelector('[data-active="true"]');
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab]);

  const fetchFilters = async (unit?: string) => {
    try {
      const url = new URL(`${API_BASE}/quantum/available-filters`);
      if (unit) url.searchParams.append('unit', unit);
      const response = await fetch(url.toString());
      const result = await response.json();
      setAvailableFilters(result);

      // If dashboard and no date selected, default to yesterday (dates[1])
      if (initialTab === 'dashboard' && !selectedDate && result.dates && result.dates.length > 0) {
        const defaultDate = result.dates[1] || result.dates[0];
        setSelectedDate(defaultDate);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const fetchData = useCallback(async () => {
    if (activeTab === 'trend') return;
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedShift) params.append('shift', selectedShift);
      if (mainTab === 'dashboard') params.append('mode', 'dashboard');
      
      // Only apply unit and machine filters if NOT on the dashboard
      if (activeTab !== 'dashboard') {
        if (selectedUnit) params.append('unit', selectedUnit);
        if (selectedMachine) params.append('machine', selectedMachine);
      }
      
      const response = await fetch(`${API_BASE}/quantum/live?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching live data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedShift, selectedUnit, selectedMachine, activeTab]);

  const fetchTrendData = async () => {
    setTrendLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('group', selectedTrendGroup);
      params.append('firstColumn', selectedFirstColumn);
      params.append('parameter', selectedParameter);
      params.append('reportType', selectedReportType);
      if (selectedUnit) params.append('unit', selectedUnit);
      if (selectedTrendValues.length > 0) params.append('filterValues', selectedTrendValues.join(','));
      if (selectedTrendDates.length > 0) params.append('dates', selectedTrendDates.join(','));
      
      // New filters
      if (selectedFilterValues.length > 0) {
        params.append('filterType', selectedFilterColumn);
        params.append('additionalFilterValues', selectedFilterValues.join(','));
      }
      
      const response = await fetch(`${API_BASE}/quantum/trend?${params.toString()}`);
      const result = await response.json();
      setTrendResponse(result);
    } catch (error) {
      console.error("Error fetching trend data:", error);
    } finally {
      setTrendLoading(false);
    }
  };

  const getTrendValueOptions = (columnId?: string) => {
    const col = columnId || selectedFirstColumn;
    switch (col) {
      case 'unit': return availableFilters.units;
      case 'machinename': return availableFilters.machines;
      case 'articlenumber': return availableFilters.articles;
      case 'articlename': return availableFilters.articleNames;
      case 'lotid': return availableFilters.lotIds;
      default: return [];
    }
  };

  useEffect(() => {
    fetchFilters(selectedUnit);
    if (activeTab === 'trend') {
      setSelectedTrendValues([]);
      setSelectedTrendDates([]);
      setSelectedFilterValues([]);
      setTrendResponse(null);
    }
  }, [selectedUnit, activeTab]);

  useEffect(() => {
    if (activeTab !== 'trend') {
      if (data.length === 0) {
        setLoading(true);
      }
      fetchData();
      
      if (!selectedDate && !selectedShift && !selectedUnit && !selectedMachine) {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [selectedDate, selectedShift, selectedUnit, selectedMachine, fetchData, activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const resetFilters = () => {
    if (initialTab === 'dashboard' && availableFilters.dates.length > 0) {
      setSelectedDate(availableFilters.dates[1] || availableFilters.dates[0]);
    } else {
      setSelectedDate('');
    }
    setSelectedShift('all');
    setSelectedUnit('');
    setSelectedMachine('');
  };

  const toggleArticleExpansion = (unit: string, id: string) => {
    const key = `${unit}-${id}`;
    setExpandedArticles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const downloadPDF = async () => {
    setRefreshing(true);
    try {
      // Determine orientation based on columns
      let orientation: 'p' | 'l' = 'p';
      let colCount = 0;
      
      if (activeTab === 'quality') colCount = 8;
      else if (activeTab === 'cuts') colCount = 10;
      else if (activeTab === 'alarms') colCount = 13;
      else if (activeTab === 'trend' && trendResponse) {
        colCount = (trendResponse.allKeys || trendResponse.dates || []).length + 2;
      }

      if (colCount > 8) orientation = 'l';

      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const fileName = `Live_Quality_${tabName}_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;

      const addHeader = (doc: jsPDF, title: string) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 16, 46);
        doc.text(title, 14, 15);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        const filterParts = [];
        if (selectedDate) filterParts.push(`Date: ${selectedDate}`);
        if (selectedShift) filterParts.push(`Shift: ${selectedShift === 'all' ? 'All' : selectedShift}`);
        if (selectedUnit) filterParts.push(`Unit: ${selectedUnit}`);
        if (selectedMachine) filterParts.push(`Machine: ${selectedMachine}`);
        
        const filterText = filterParts.length > 0 ? `Filters: ${filterParts.join('   |   ')}` : "Filters: None";
        const margin = 14;
        const pageWidthForText = doc.internal.pageSize.getWidth() - (2 * margin);
        const textLines = doc.splitTextToSize(filterText, pageWidthForText);
        
        let filterY = 22;
        for (let k = 0; k < textLines.length; k++) {
          doc.text(textLines[k], margin, filterY);
          filterY += 4;
        }
        return filterY + 2;
      };

      if (activeTab === 'dashboard') {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#F5F5F5',
          onclone: (clonedDoc) => {
            try {
              // 1. Remove all style tags and links to external CSS that might contain modern CSS
              const styles = clonedDoc.getElementsByTagName('style');
              for (let i = styles.length - 1; i >= 0; i--) {
                styles[i].remove();
              }
              const links = clonedDoc.getElementsByTagName('link');
              for (let i = links.length - 1; i >= 0; i--) {
                if (links[i].rel === 'stylesheet') links[i].remove();
              }

              // 2. Inject a simple baseline CSS for the report components with better sized cards
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
                body { font-family: sans-serif; background: #F5F5F5; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-4 { gap: 1.5rem; }
                .bg-white { background-color: #ffffff; }
                .bg-\\[\\#ffffff\\] { background-color: #ffffff; }
                .p-6 { padding: 2rem !important; }
                .rounded-3xl { border-radius: 2rem; }
                .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                .border-b-4 { border-bottom: 6px solid #C8102E !important; }
                .border-\\[\\#C8102E\\] { border-color: #C8102E; }
                .text-\\[\\#C8102E\\] { color: #C8102E; }
                .text-\\[\\#1f2937\\] { color: #1f2937; }
                .text-\\[\\#6b7280\\] { color: #6b7280; }
                .text-xl { font-size: 2rem !important; line-height: 2.5rem; }
                .text-sm { font-size: 1.25rem !important; line-height: 1.5rem; }
                .text-\\[11px\\] { font-size: 15px !important; }
                .text-\\[10px\\] { font-size: 1.25rem !important; line-height: 1.5rem; }
                .font-black { font-weight: 900; }
                .font-bold { font-weight: 700; }
                .uppercase { text-transform: uppercase; }
                .tracking-widest { letter-spacing: 0.1em; }
                .flex { display: flex; }
                .flex-col { flex-direction: column; }
                .items-center { align-items: center; }
                .justify-center { justify-content: center; }
                .relative { position: relative; }
                .overflow-hidden { overflow: hidden; }
                .absolute { position: absolute; }
                .top-2 { top: 1rem !important; }
                .right-2 { right: 1rem !important; }
                .opacity-10 { opacity: 0.1; }
                .mb-1 { margin-bottom: 0.5rem !important; }
                .mt-1 { margin-top: 0.5rem !important; }
                .text-center { text-align: center; }
                .leading-tight { line-height: 1.2; }
                
                /* Limit to 6 cards for PDF */
                .grid > div:nth-child(n+7) {
                  display: none !important;
                }
              `;
              clonedDoc.head.appendChild(style);

              // 3. Clean up any remaining oklch in inline styles without using innerHTML replacement
              const allElements = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                if (el.style) {
                  const styleStr = el.getAttribute('style') || '';
                  if (styleStr.includes('oklch') || styleStr.includes('color-mix') || styleStr.includes('light-dark')) {
                    const p = '(?:[^()]+|\\([^()]*\\))';
                    const processed = styleStr
                      .replace(new RegExp(`oklch\\s*\\(${p}*\\)`, 'gi'), '#dc2626')
                      .replace(new RegExp(`color-mix\\s*\\(${p}*\\)`, 'gi'), '#dc2626')
                      .replace(new RegExp(`light-dark\\s*\\(${p}*\\)`, 'gi'), '#dc2626');
                    el.setAttribute('style', processed);
                  }
                }
              }
            } catch (e) {
              console.error("Error in html2canvas onclone:", e);
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const startY = addHeader(pdf, `Uster Quantum Expert - Live Dashboard`);
        const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 10, startY, pdfWidth, pdfHeight);
      } else if (activeTab === 'quality') {
        let currentY = addHeader(pdf, `Uster Quantum Expert - Quality Report`);
        
        const formatOneDecimal = (val: string | number | undefined | null) => {
          if (val === undefined || val === null || val === '') return '0.0';
          const num = typeof val === 'number' ? val : parseFloat(val);
          return isNaN(num) ? '0.0' : num.toFixed(1);
        };

        const formatRound = (val: any) => {
          if (val === undefined || val === null || val === '') return '0';
          const num = parseFloat(val);
          return isNaN(num) ? '0' : Math.round(num).toString();
        };

        data.forEach((unitData, index) => {
          if (index > 0) {
            pdf.addPage();
            currentY = addHeader(pdf, `Uster Quantum Expert - Quality Report`);
          }

          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(200, 16, 46);
          const shiftInfo = unitData.shiftNumber && unitData.shiftNumber !== 'All' ? ` - Shift ${unitData.shiftNumber}` : '';
          pdf.text(`${unitData.unit} - ${unitData.shiftStartTime ? formatDate(unitData.shiftStartTime) : 'Current'}${shiftInfo}`, 14, currentY + 5);
          currentY += 10;

          const tableData: any[] = [];
          const reportRows = viewMode === 'article' 
            ? [...(unitData.articles || [])].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber, undefined, { numeric: true, sensitivity: 'base' }))
            : getMachineWiseData(unitData);
          
          reportRows?.forEach((row: any) => {
            tableData.push([
              viewMode === 'article' ? row.articleNumber : row.machineName,
              formatRound(row.Thin50),
              formatRound(row.Thick50),
              formatRound(row.Nep200),
              formatOneDecimal(row.CVAvg),
              formatOneDecimal(row.HAvg),
              formatRound(row.IPI),
              formatRound(row.HSIPI)
            ]);
          });

          tableData.push([
            { content: 'Overall Average', styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatRound(unitData.unitQuality?.Thin50), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatRound(unitData.unitQuality?.Thick50), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatRound(unitData.unitQuality?.Nep200), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatOneDecimal(unitData.unitQuality?.CVAvg), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatOneDecimal(unitData.unitQuality?.HAvg), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatRound(unitData.unitQuality?.IPI), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: formatRound(unitData.unitQuality?.HSIPI), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } }
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: [[viewMode === 'article' ? 'Article' : 'Machine', 'Thin50', 'Thick50', 'Nep200', 'CV%', 'H', 'IPI', 'HS IPI']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [200, 16, 46], textColor: [255, 255, 255], fontSize: 8, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 7, cellPadding: 2, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 30, halign: 'center' } },
            margin: { left: 14, right: 14 }
          });
          currentY = (pdf as any).lastAutoTable.finalY + 10;
        });
      } else if (activeTab === 'cuts') {
        let currentY = addHeader(pdf, `Uster Quantum Expert - Cuts Report`);
        
        data.forEach((unitData, index) => {
          if (index > 0) {
            pdf.addPage();
            currentY = addHeader(pdf, `Uster Quantum Expert - Cuts Report`);
          }

          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(200, 16, 46);
          const shiftInfo = unitData.shiftNumber && unitData.shiftNumber !== 'All' ? ` - Shift ${unitData.shiftNumber}` : '';
          pdf.text(`${unitData.unit} - ${unitData.shiftStartTime ? formatDate(unitData.shiftStartTime) : 'Current'}${shiftInfo}`, 14, currentY + 5);
          currentY += 10;

          const tableData: any[] = [];
          const reportRows = viewMode === 'article' 
            ? [...(unitData.articles || [])].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber, undefined, { numeric: true, sensitivity: 'base' }))
            : getMachineWiseData(unitData);
          
          reportRows?.forEach((row: any) => {
            tableData.push([
              viewMode === 'article' ? row.articleNumber : row.machineName,
              Math.round(Number(row.YarnFaults)),
              Math.round(Number(row.YarnJoints)),
              Math.round(Number(row.YarnBreaks)),
              Math.round(Number(row.NCuts)),
              Math.round(Number(row.SCuts)),
              Math.round(Number(row.LCuts)),
              Math.round(Number(row.TCuts)),
              Math.round(Number(row.FDCuts)),
              Math.round(Number(row.PPCuts))
            ]);
          });

          tableData.push([
            { content: 'Overall Average', styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.YarnFaults)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.YarnJoints)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.YarnBreaks)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.NCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.SCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.LCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.TCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.FDCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: Math.round(Number(unitData.unitCuts?.PPCuts)), styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } }
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: [[viewMode === 'article' ? 'Article' : 'Machine', 'YF', 'YJ', 'YB', 'N', 'S', 'L', 'T', 'FD', 'PP']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [200, 16, 46], textColor: [255, 255, 255], fontSize: 8, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 7, cellPadding: 2, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 30, halign: 'center' } },
            margin: { left: 14, right: 14 }
          });
          currentY = (pdf as any).lastAutoTable.finalY + 10;
        });
      } else if (activeTab === 'alarms') {
        let currentY = addHeader(pdf, `Uster Quantum Expert - Alarms Report`);

        data.forEach((unitData, index) => {
          if (index > 0) {
            pdf.addPage();
            currentY = addHeader(pdf, `Uster Quantum Expert - Alarms Report`);
          }

          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(200, 16, 46);
          const shiftInfo = unitData.shiftNumber && unitData.shiftNumber !== 'All' ? ` - Shift ${unitData.shiftNumber}` : '';
          pdf.text(`${unitData.unit} - ${unitData.shiftStartTime ? formatDate(unitData.shiftStartTime) : 'Current'}${shiftInfo}`, 14, currentY + 5);
          currentY += 10;

          const tableData: any[] = [];
          const reportRows = viewMode === 'article' 
            ? [...(unitData.articles || [])].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber, undefined, { numeric: true, sensitivity: 'base' }))
            : getMachineWiseData(unitData);

          reportRows?.forEach((row: any) => {
            tableData.push([
              viewMode === 'article' ? row.articleNumber : row.machineName,
              row.alarmBreakdown?.NSABlks || 0,
              row.alarmBreakdown?.LABlks || 0,
              row.alarmBreakdown?.TABlks || 0,
              row.alarmBreakdown?.CABlks || 0,
              row.alarmBreakdown?.CCABlks || 0,
              row.alarmBreakdown?.FABlks || 0,
              row.alarmBreakdown?.PPABlks || 0,
              row.alarmBreakdown?.PFABlks || 0,
              row.alarmBreakdown?.CVpABlks || 0,
              row.alarmBreakdown?.HpABlks || 0,
              row.alarmBreakdown?.CMTABlks || 0,
              row.totalAlarms || 0
            ]);
          });

          tableData.push([
            { content: 'Overall Total', styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.NSABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.LABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.TABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.CABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.CCABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.FABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.PPABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.PFABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.CVpABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.HpABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.alarmBreakdown?.CMTABlks || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } },
            { content: unitData.totalAlarms || 0, styles: { fontStyle: 'bold', textColor: [200, 16, 46], halign: 'center' } }
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: [[viewMode === 'article' ? 'Article' : 'Machine', 'NS', 'LA', 'TA', 'CA', 'CCA', 'FA', 'PPA', 'PFA', 'CVpA', 'HpA', 'CMTA', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [200, 16, 46], textColor: [255, 255, 255], fontSize: 7, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 6, cellPadding: 1.5, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 25, halign: 'center' } },
            margin: { left: 14, right: 14 }
          });
          currentY = (pdf as any).lastAutoTable.finalY + 10;
        });
      } else if (activeTab === 'trend' && trendResponse) {
        const currentY = addHeader(pdf, `Uster Quantum Expert - ${PARAMETER_SHORT_NAMES[selectedParameter] || selectedParameter} Trend Report`);
        
        const isShiftReport = trendResponse.reportType === 'shift';
        const allKeys = trendResponse.allKeys || trendResponse.dates || [];
        const baseDates = trendResponse.dates || [];
        
        // Build headers
        let head: any[][] = [];
        if (isShiftReport) {
          // Complex header for shift report
          const firstRow = [{ content: FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFirstColumn)?.label || 'Label', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }];
          const secondRow = [];
          
          baseDates.forEach(date => {
            const shiftsForDate = allKeys.filter(k => k.startsWith(date));
            firstRow.push({ 
              content: formatDate(date), 
              colSpan: shiftsForDate.length, 
              styles: { halign: 'center' } 
            } as any);
            
            shiftsForDate.forEach(key => {
              secondRow.push({ 
                content: `S${key.split('_')[1]}`, 
                styles: { halign: 'center' } 
              });
            });
          });
          
          firstRow.push({ content: '% Diff', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } } as any);
          head = [firstRow, secondRow];
        } else {
          // Simple header for daily report
          const formattedDates = baseDates.map(d => formatDate(d));
          head = [[FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFirstColumn)?.label || 'Label', ...formattedDates, '% Diff']];
        }
        
        const body = trendResponse.labels.map(label => {
          const rowData: any[] = [label];
          allKeys.forEach(key => {
            const dayData = trendResponse.data.find(d => d.date === key);
            rowData.push(dayData ? dayData[label] : '-');
          });

          // Calculate % Diff
          const oldestKey = allKeys[0];
          const latestKey = allKeys[allKeys.length - 1];
          const oldestVal = oldestKey ? trendResponse.data.find(d => d.date === oldestKey)?.[label] : undefined;
          const latestVal = latestKey ? trendResponse.data.find(d => d.date === latestKey)?.[label] : undefined;
          
          let diffPercent = '-';
          if (oldestVal !== undefined && latestVal !== undefined) {
            const ov = Number(oldestVal);
            const lv = Number(latestVal);
            if (ov !== 0 && !isNaN(ov) && !isNaN(lv)) {
              const diff = ((lv - ov) / ov) * 100;
              diffPercent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
            } else if (ov === 0 && lv !== 0) {
              diffPercent = 'New';
            }
          }
          rowData.push(diffPercent);
          return rowData;
        });

        autoTable(pdf, {
          startY: currentY,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [200, 16, 46], textColor: [255, 255, 255], fontSize: 7, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
          bodyStyles: { textColor: [0, 0, 0], fontSize: 6, cellPadding: 1.5, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
          columnStyles: { 0: { cellWidth: orientation === 'l' ? 40 : 30, halign: 'center', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            const lastColIndex = isShiftReport ? allKeys.length + 1 : head[0].length - 1;
            if (data.section === 'body' && data.column.index === lastColIndex) {
              const val = data.cell.raw as string;
              if (val && typeof val === 'string') {
                if (val.startsWith('+')) {
                  data.cell.styles.textColor = [200, 16, 46];
                } else if (val.startsWith('-')) {
                  data.cell.styles.textColor = [22, 163, 74];
                }
              }
            }
          }
        });
      }

      const pdfDataUri = pdf.output("datauristring");
      const anyWindow = window as any;
      if (anyWindow.Android && typeof anyWindow.Android.savePDF === "function") {
        anyWindow.Android.savePDF(pdfDataUri);
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const onlineSubTabs = [
    { id: 'cuts', label: 'Cuts', icon: Scissors },
    { id: 'alarms', label: 'Alarms', icon: Bell },
    { id: 'quality', label: 'Quality', icon: Layers },
    { id: 'trend', label: 'Trend', icon: TrendingUp },
  ] as const;

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F5] min-h-screen">
      <header className="bg-uster-red px-6 pt-4 pb-2 rounded-b-[32px] shadow-lg sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <Home className="text-white" size={20} />
          </button>
          <RestartButton />
          <h2 className="text-white font-black uppercase tracking-tight text-center flex-1">
            {mainTab === 'dashboard' ? 'Live Dashboard' : 'Online Data'}
          </h2>
          <div className="flex space-x-2">
            <button onClick={downloadPDF} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Download className="text-white" size={20} />
            </button>
            <button onClick={handleRefresh} className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="text-white" size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mainTab === 'online' && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              ref={tabsRef}
              className="grid grid-cols-2 gap-2 pb-3 pt-2 mt-1 border-t border-white/10 px-1"
            >
              {onlineSubTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  data-active={activeTab === tab.id}
                  className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-xl transition-all shadow-sm ${
                    activeTab === tab.id 
                      ? 'bg-uster-red-dark text-white font-black' 
                      : 'bg-white text-uster-red font-bold hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={14} />
                  <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="px-6 py-6 pb-24">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col space-y-4 mb-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</h3>
            <div className="flex items-center space-x-4">
              {activeTab !== 'dashboard' && activeTab !== 'trend' && (
                <button onClick={() => setViewMode(prev => prev === 'article' ? 'machine' : 'article')} className="flex items-center space-x-1 text-uster-red group">
                  <Repeat size={12} className={`transition-transform duration-300 ${viewMode === 'machine' ? 'rotate-180' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{viewMode === 'article' ? 'Machine View' : 'Article View'}</span>
                </button>
              )}
              {(selectedDate || selectedShift || selectedUnit || selectedMachine) && (
                <button onClick={resetFilters} className="flex items-center space-x-1 text-uster-red group">
                  <RotateCcw size={12} className="group-hover:rotate-[-45deg] transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Reset</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {activeTab === 'trend' ? (
              <>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Activity size={14} /></div>
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                      <option value="">All Units</option>
                      {availableFilters.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
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
                      className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
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
                      className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
                    >
                      {FIRST_COLUMN_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Settings size={14} /></div>
                    <select 
                      value={selectedParameter} 
                      onChange={(e) => setSelectedParameter(e.target.value)} 
                      className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
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
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Report Type</h4>
                    <div className="flex bg-[#F5F5F5] p-1 rounded-2xl h-[42px]">
                      <button 
                        onClick={() => setSelectedReportType('daily')}
                        className={`flex-1 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          selectedReportType === 'daily' ? 'bg-white text-uster-red shadow-sm' : 'text-gray-400'
                        }`}
                      >
                        Daily
                      </button>
                      <button 
                        onClick={() => setSelectedReportType('shift')}
                        className={`flex-1 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          selectedReportType === 'shift' ? 'bg-white text-uster-red shadow-sm' : 'text-gray-400'
                        }`}
                      >
                        Shift
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Date Filter</h4>
                    <SearchableMultiSelect
                      options={availableFilters.dates}
                      selectedValues={selectedTrendDates}
                      onChange={setSelectedTrendDates}
                      placeholder="Select Dates..."
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">First Column Filter</h4>
                    <SearchableMultiSelect
                      options={getTrendValueOptions()}
                      selectedValues={selectedTrendValues}
                      onChange={setSelectedTrendValues}
                      placeholder={`Select ${FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFirstColumn)?.label || 'Values'}...`}
                    />
                  </div>
                </div>
                <div className="flex space-x-3 items-end">
                  <div className="flex-1 relative">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Filter By</h4>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Settings size={14} /></div>
                      <select 
                        value={selectedFilterColumn} 
                        onChange={(e) => {
                          setSelectedFilterColumn(e.target.value);
                          setSelectedFilterValues([]);
                        }} 
                        className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer"
                      >
                        {FIRST_COLUMN_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1">
                    <SearchableMultiSelect
                      options={getTrendValueOptions(selectedFilterColumn)}
                      selectedValues={selectedFilterValues}
                      onChange={setSelectedFilterValues}
                      placeholder={`Select ${FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFilterColumn)?.label || 'Values'}...`}
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={fetchTrendData}
                    disabled={trendLoading}
                    className="flex-1 bg-uster-red text-white font-black uppercase tracking-widest py-3 rounded-2xl shadow-lg shadow-uster-red/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {trendLoading ? 'Loading...' : 'Show Data'}
                  </button>
                  <button 
                    onClick={() => setHideEmptyLatest(!hideEmptyLatest)}
                    className={`w-12 flex items-center justify-center rounded-2xl transition-all ${
                      hideEmptyLatest ? 'bg-uster-red text-white shadow-lg shadow-uster-red/20' : 'bg-[#F5F5F5] text-gray-400'
                    }`}
                    title={hideEmptyLatest ? "Showing rows with latest data" : "Showing all rows"}
                  >
                    {hideEmptyLatest ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14} /></div>
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                      <option value="">Default Date</option>
                      {availableFilters.dates.map(date => <option key={date} value={date}>{date}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Layers size={14} /></div>
                    <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                      <option value="all">All Shifts</option>
                      {availableFilters.shifts.map(shift => <option key={shift} value={shift}>Shift {shift}</option>)}
                    </select>
                  </div>
                </div>

                {activeTab !== 'dashboard' && (
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Activity size={14} /></div>
                      <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                        <option value="">All Units</option>
                        {availableFilters.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Settings size={14} /></div>
                      <select value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-uster-red/20 transition-all cursor-pointer">
                        <option value="">All Machines</option>
                        {availableFilters.machines.map(machine => <option key={machine} value={machine}>{machine}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div ref={reportRef}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <DashboardView data={data} loading={loading} formatDate={formatDate} />
              </motion.div>
            )}

            {activeTab === 'quality' && (
              <motion.div key="quality" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <QualityView data={data} loading={loading} viewMode={viewMode} expandedArticles={expandedArticles} toggleArticleExpansion={toggleArticleExpansion} formatDate={formatDate} />
              </motion.div>
            )}

            {activeTab === 'cuts' && (
              <motion.div key="cuts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <CutsView data={data} loading={loading} viewMode={viewMode} expandedArticles={expandedArticles} toggleArticleExpansion={toggleArticleExpansion} formatDate={formatDate} />
              </motion.div>
            )}

            {activeTab === 'alarms' && (
              <motion.div key="alarms" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <AlarmsView data={data} loading={loading} viewMode={viewMode} expandedArticles={expandedArticles} toggleArticleExpansion={toggleArticleExpansion} formatDate={formatDate} />
              </motion.div>
            )}

            {activeTab === 'trend' && (
              <motion.div key="trend" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <TrendView 
                  response={trendResponse} 
                  loading={trendLoading} 
                  parameter={PARAMETER_SHORT_NAMES[selectedParameter] || selectedParameter} 
                  hideEmptyLatest={hideEmptyLatest}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveReport;
