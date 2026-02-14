import React, { useState, useCallback } from 'react';
import { RefreshCw, BarChart3, Search, Download, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchTab from './long-term-report/SearchTab';
import TrendTab from './long-term-report/TrendTab';
import RestartButton from './RestartButton';
import type { LongTermDataRecord } from './long-term-report/types';
import type { TrendResponse } from './live-report/types';

interface LongTermReportProps {
  onBack: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL;

const PARAMETER_SHORT_NAMES: Record<string, string> = {
  YarnFaults: 'YF', NCuts: 'N', SCuts: 'S', LCuts: 'L', TCuts: 'T', FDCuts: 'FD', PPCuts: 'PP',
  CpCuts: 'Cp', CmCuts: 'Cm', CCpCuts: 'CCp', CCmCuts: 'CCm', JpCuts: 'Jp', JmCuts: 'Jm', PFCuts: 'PF',
  YarnJoints: 'YJ', YarnBreaks: 'YB', B_A1Events: 'A1', B_A2Events: 'A2', B_B1Events: 'B1', B_B2Events: 'B2',
  CVAvg: 'CV%', HAvg: 'H', NSABlks: 'NS', LABlks: 'LA', TABlks: 'TA', CABlks: 'CA', CCABlks: 'CCA',
  FABlks: 'FA', PPABlks: 'PPA', PFABlks: 'PFA', CVpABlks: 'CVpA', HpABlks: 'HpA', CMTABlks: 'CMTA',
  YABlks: 'YA', IPI: 'IPI', HSIPI: 'HS IPI'
};

const FIRST_COLUMN_OPTIONS = [
  { id: 'unit', label: 'Unit' },
  { id: 'articlename', label: 'Article Name' },
  { id: 'articlenumber', label: 'Article Number' },
  { id: 'lotid', label: 'Lot ID' },
  { id: 'machinename', label: 'Machine Name' },
];

const LongTermReport: React.FC<LongTermReportProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'trend'>('search');
  const [data, setData] = useState<LongTermDataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendResponse, setTrendResponse] = useState<TrendResponse | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<string>('CVAvg');
  const [selectedFirstColumn, setSelectedFirstColumn] = useState<string>('unit');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    lotId: '',
    articles: ''
  });

  const downloadPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const fileName = `LongTerm_${activeTab}_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;

      const addHeader = (doc: jsPDF, title: string) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(227, 6, 19);
        doc.text(title, 14, 15);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        const filterParts = [];
        if (filters.startDate) filterParts.push(`Start: ${filters.startDate}`);
        if (filters.endDate) filterParts.push(`End: ${filters.endDate}`);
        if (filters.lotId) filterParts.push(`Lot: ${filters.lotId}`);
        if (filters.articles) filterParts.push(`Articles: ${filters.articles}`);
        
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

      if (activeTab === 'search') {
        const currentY = addHeader(pdf, `Uster Quantum Expert - Long Term Search Report`);
        
        const head = [['Mill Unit', 'Machine', 'Article', 'Lot ID', 'Start Time', 'Yarn Length']];
        const body = data.map(r => [
          r.MillUnit,
          r.MachineName,
          r.ArticleNumber,
          r.LotID,
          new Date(r.ShiftStartTime).toLocaleString(),
          Math.round(Number(r.YarnLength))
        ]);

        autoTable(pdf, {
          startY: currentY,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [227, 6, 19], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
          bodyStyles: { textColor: [0, 0, 0], fontSize: 7, cellPadding: 2, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
          margin: { left: 14, right: 14 }
        });
      } else if (activeTab === 'trend' && trendResponse) {
        const currentY = addHeader(pdf, `Uster Quantum Expert - ${PARAMETER_SHORT_NAMES[selectedParameter] || selectedParameter} Trend Report`);
        
        const dates = trendResponse.dates || [];
        const formattedDates = dates.map((d: string) => {
          try {
            const [year, month, day] = d.split('-');
            return `${day}-${month}-${year.slice(-2)}`;
          } catch (e) {
            return d;
          }
        });

        const firstColLabel = FIRST_COLUMN_OPTIONS.find(o => o.id === selectedFirstColumn)?.label || 'Label';
        const head = [[firstColLabel, ...formattedDates, '% Diff']];
        
        const body = trendResponse.labels.map((label: string) => {
          const rowData: (string | number)[] = [label];
          dates.forEach((date: string) => {
            const dayData = trendResponse.data.find((d: any) => d.date === date);
            rowData.push(dayData ? dayData[label] : '-');
          });

          // Find the oldest available data point for this row
          let oldestVal: any = undefined;
          for (const date of dates) {
            const val = trendResponse.data.find((d: any) => d.date === date)?.[label];
            if (val !== undefined && val !== null) {
              oldestVal = val;
              break;
            }
          }
          
          const latestDate = dates[dates.length - 1];
          const latestVal = latestDate ? trendResponse.data.find((d: any) => d.date === latestDate)?.[label] : undefined;
          
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
          headStyles: { fillColor: [227, 6, 19], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
          bodyStyles: { textColor: [0, 0, 0], fontSize: 7, cellPadding: 2, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
          columnStyles: { 0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 }
        });
      }

      const anyWindow = window as any;
      if (anyWindow.Android && anyWindow.Android.savePDF) {
        const pdfDataUri = pdf.output('datauristring');
        anyWindow.Android.savePDF(pdfDataUri);
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const fetchData = useCallback(async (currentFilters: typeof filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
      if (currentFilters.lotId) params.append('lotId', currentFilters.lotId);
      if (currentFilters.articles) params.append('articles', currentFilters.articles);

      const response = await fetch(`${API_BASE}/long-term/data?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching long term data:", error);
      alert("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadData = (startDate: string, endDate: string) => {
    const newFilters = { ...filters, startDate, endDate };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const handleSearchLot = (lotIds: string) => {
    const newFilters = { ...filters, lotId: lotIds };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const handleSearchArticle = (articles: string) => {
    const newFilters = { ...filters, articles: articles };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const fetchUniqueArticles = useCallback(async (query: string) => {
    try {
      const response = await fetch(`${API_BASE}/long-term/unique-article-numbers?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return await response.json();
    } catch (error) {
      console.error("Error fetching unique articles:", error);
      return [];
    }
  }, []);

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      lotId: '',
      articles: ''
    });
    setData([]);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans text-gray-900 select-none pb-24">
      {/* Header */}
      <header className="bg-red-600 px-6 pt-4 pb-4 rounded-b-[40px] shadow-lg sticky top-0 z-[100]">
        <div className="flex justify-between items-center mb-4">
          <motion.button 
            onClick={onBack}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
          >
            <Home className="text-white" size={20} />
          </motion.button>
          <RestartButton />
          <h1 className="text-xl font-black text-white uppercase tracking">Long Term</h1>
          <div className="flex space-x-3">
            <motion.button 
              onClick={downloadPDF}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
            >
              <Download className="text-white" size={20} />
            </motion.button>
            <motion.button 
              whileTap={{ rotate: 180 }}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md"
            >
              <RefreshCw className="text-white" size={20} />
            </motion.button>
          </div>
        </div>
        <div className="text-white text-center">
          <p className="text-red-100 text-xs font-bold uppercase tracking-widest opacity-80">Quantum Analysis</p>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="px-6 -mt-0">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-white flex">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
              activeTab === 'search' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'
            }`}
          >
            <Search size={18} />
            <span className="text-xs font-black uppercase">Search</span>
          </button>
          <button 
            onClick={() => setActiveTab('trend')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
              activeTab === 'trend' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'
            }`}
          >
            <BarChart3 size={18} />
            <span className="text-xs font-black uppercase">Trend</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 pt-6 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'search' ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SearchTab 
                data={data} 
                loading={loading}
                onLoadData={handleLoadData}
                onSearchLot={handleSearchLot}
                onSearchArticle={handleSearchArticle}
                onReset={handleReset}
                fetchUniqueArticles={fetchUniqueArticles}
              />
            </motion.div>
          ) : (
            <motion.div
              key="trend"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TrendTab 
                data={data} 
                onLoadData={handleLoadData}
                loading={loading}
                onTrendResponseChange={setTrendResponse}
                onParameterChange={setSelectedParameter}
                onFirstColumnChange={setSelectedFirstColumn}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default LongTermReport;
