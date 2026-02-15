import React, { useState, useRef, useEffect } from 'react';
import { Search, Layers, X, Check, RotateCcw, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type LongTermDataRecord, REPORT_COLUMNS } from './types';

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
        className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-gray-700 cursor-pointer flex justify-between items-center min-h-[42px]"
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

interface SearchTabProps {
  data: LongTermDataRecord[];
  onLoadData: (startDate: string, endDate: string) => void;
  onSearchLot: (lotIds: string) => void;
  onSearchArticle: (articles: string) => void;
  onReset: () => void;
  fetchUniqueArticles: (query: string) => Promise<string[]>;
  loading: boolean;
}

const SearchTab: React.FC<SearchTabProps> = ({ 
  data, 
  onLoadData, 
  onSearchLot, 
  onSearchArticle, 
  onReset, 
  fetchUniqueArticles,
  loading 
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lotInput, setLotInput] = useState('');
  const [articleInput, setArticleInput] = useState('');
  const [articleSuggestions, setArticleSuggestions] = useState<string[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [groupBy, setGroupBy] = useState('MillUnit');
  const [reportType, setReportType] = useState('daily');
  const [filterField, setFilterField] = useState('');
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(REPORT_COLUMNS.map(c => c.title));

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setLotInput('');
    setArticleInput('');
    setArticleSuggestions([]);
    setSelectedArticles([]);
    setGroupBy('MillUnit');
    setReportType('daily');
    setFilterField('');
    setSelectedFilterValues([]);
    onReset();
  };

  const handleArticleSearch = async () => {
    if (!articleInput.trim()) return;
    setSuggestionsLoading(true);
    const suggestions = await fetchUniqueArticles(articleInput);
    setArticleSuggestions(suggestions);
    setSuggestionsLoading(false);
  };

  const handleApplyArticles = () => {
    if (selectedArticles.length > 0) {
      onSearchArticle(selectedArticles.join(','));
    }
  };

  const filterOptions = [
    { id: 'MillUnit', label: 'Mill Unit' },
    { id: 'ArticleName', label: 'Article Name' },
    { id: 'ArticleNumber', label: 'Article Number' },
    { id: 'MachineName', label: 'Machine No' },
    { id: 'LotID', label: 'Lot ID' },
  ];

  const groupByOptions = [
    ...filterOptions,
    { id: 'ShiftStartTime', label: 'Date' },
  ];

  const getUniqueFilterValues = () => {
    if (!filterField || data.length === 0) return [];
    const values = data.map(r => String(r[filterField] || 'N/A'));
    return Array.from(new Set(values)).sort();
  };

  const filteredData = data.filter(r => {
    if (!filterField || selectedFilterValues.length === 0) return true;
    return selectedFilterValues.includes(String(r[filterField] || 'N/A'));
  });

  const groupData = () => {
    interface GroupAcc {
      totalLength: number;
      refLen: number;
      totalIPI: number;
      totalHSIPI: number;
      sums: Record<string, number>;
      counts: Record<string, number>;
    }
    const groups: Record<string, GroupAcc> = {};
    
    filteredData.forEach(r => {
      let key = String(r[groupBy] || 'N/A');
      if (groupBy === 'ShiftStartTime') {
        const date = new Date(String(r.ShiftStartTime));
        if (reportType === 'daily') key = date.toLocaleDateString();
        else if (reportType === 'weekly') {
          const d = date.getDate();
          const month = date.getMonth() + 1;
          const week = d <= 7 ? 'W1' : d <= 14 ? 'W2' : d <= 21 ? 'W3' : d <= 28 ? 'W4' : 'W5';
          key = `${month}-${week}`;
        } else if (reportType === 'monthly') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      if (!groups[key]) {
        groups[key] = {
          totalLength: 0,
          refLen: 0,
          totalIPI: 0,
          totalHSIPI: 0,
          sums: {},
          counts: {}
        };
      }

      const valLen = r.YarnLength;
      groups[key].totalLength += typeof valLen === 'number' ? valLen : 0;
      const valRef = r.IPRefLength;
      groups[key].refLen += typeof valRef === 'number' ? valRef : 0;
      
      const t50 = r.Thin50;
      const th50 = r.Thick50;
      const n200 = r.Nep200;
      groups[key].totalIPI += (typeof t50 === 'number' ? t50 : 0) + 
                              (typeof th50 === 'number' ? th50 : 0) + 
                              (typeof n200 === 'number' ? n200 : 0);
      
      const t40 = r.Thin40;
      const th35 = r.Thick35;
      const n140 = r.Nep140;
      groups[key].totalHSIPI += (typeof t40 === 'number' ? t40 : 0) + 
                                (typeof th35 === 'number' ? th35 : 0) + 
                                (typeof n140 === 'number' ? n140 : 0);

      REPORT_COLUMNS.forEach(col => {
        if (col.field) {
          const val = r[col.field];
          if (typeof val === 'number') {
            if (col.type === 'perLength') {
              groups[key].sums[col.field] = (groups[key].sums[col.field] || 0) + val;
            } else if (col.type === 'simpleAvg') {
              groups[key].sums[col.field] = (groups[key].sums[col.field] || 0) + val;
              groups[key].counts[col.field] = (groups[key].counts[col.field] || 0) + 1;
            }
          }
        }
      });
    });

    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (groupBy === 'ShiftStartTime') {
          // Date sorting
          if (reportType === 'daily') {
            const partsA = a.split('/');
            const partsB = b.split('/');
            if (partsA.length === 3 && partsB.length === 3) {
              const [da, ma, ya] = partsA.map(Number);
              const [db, mb, yb] = partsB.map(Number);
              return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
            }
          }
          if (reportType === 'monthly') {
            return a.localeCompare(b); // YYYY-MM sorts correctly
          }
          if (reportType === 'weekly') {
            const [ma, wa] = a.split('-');
            const [mb, wb] = b.split('-');
            if (ma !== mb) return Number(ma) - Number(mb);
            return wa.localeCompare(wb);
          }
        }
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      })
      .map(([key, acc]) => {
      const row: Record<string, string> = { groupKey: key };
      REPORT_COLUMNS.forEach(col => {
        if (col.type === 'customTotalIPI') {
          row[col.title] = acc.refLen > 0 ? (acc.totalIPI / acc.refLen).toFixed(0) : 'N/A';
        } else if (col.type === 'customTotalHSIPI') {
          row[col.title] = acc.refLen > 0 ? (acc.totalHSIPI / acc.refLen).toFixed(0) : 'N/A';
        } else if (col.type === 'perLength' && col.field) {
          const sum = acc.sums[col.field] || 0;
          row[col.title] = acc.totalLength > 0 ? ((sum / acc.totalLength) * 100).toFixed(0) : 'N/A';
        } else if (col.type === 'simpleAvg' && col.field) {
          const sum = acc.sums[col.field] || 0;
          const count = acc.counts[col.field] || 0;
          row[col.title] = count > 0 ? (sum / count).toFixed(2) : 'N/A';
        }
      });
      return row;
    });
  };

  const exportExcel = () => {
    if (groupedRows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(groupedRows.map(row => {
      const exportRow: Record<string, string> = { [groupByOptions.find(o => o.id === groupBy)?.label || 'Group']: row.groupKey };
      visibleColumns.forEach(col => {
        exportRow[col] = row[col];
      });
      return exportRow;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Search_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    if (groupedRows.length === 0) return;
    const doc = new jsPDF('landscape');
    const groupLabel = groupByOptions.find(o => o.id === groupBy)?.label || 'Group';
    
    doc.setFontSize(16);
    doc.setTextColor(192, 0, 0);
    doc.text(`Search Report - ${groupLabel}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const headers = [[groupLabel, ...visibleColumns]];
    const body = groupedRows.map(row => [
      row.groupKey,
      ...visibleColumns.map(col => row[col])
    ]);

    autoTable(doc, {
      startY: 30,
      head: headers,
      body: body,
      headStyles: { fillColor: [200, 16, 46] },
      styles: { fontSize: 8, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } }
    });

    doc.save(`Search_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const groupedRows = groupData();

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-black space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-uster-red focus:ring-2 focus:ring-uster-red"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-uster-red focus:ring-2 focus:ring-uster-red"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onLoadData(startDate, endDate)}
            disabled={loading || !startDate || !endDate}
            className="flex-1 bg-uster-red text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-red-200 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Data'}
          </button>
          <button 
            onClick={handleReset}
            className="bg-gray-100 p-3 rounded-xl text-gray-600 active:scale-95 transition-transform"
            title="Reset Filters"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Lot IDs (comma separated)"
              value={lotInput}
              onChange={(e) => setLotInput(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-uster-red pr-10"
            />
            {lotInput && (
              <button 
                onClick={() => setLotInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-uster-red"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={() => onSearchLot(lotInput)}
            className="bg-gray-100 p-3 rounded-xl text-gray-600 active:scale-95 transition-transform"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Type Article Number..."
              value={articleInput}
              onChange={(e) => setArticleInput(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-uster-red pr-10"
            />
            {articleInput && (
              <button 
                onClick={() => { setArticleInput(''); setArticleSuggestions([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-uster-red"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={handleArticleSearch}
            disabled={suggestionsLoading}
            className="bg-gray-100 p-3 rounded-xl text-gray-600 active:scale-95 transition-transform disabled:opacity-50"
          >
            {suggestionsLoading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
          </button>
        </div>

        {articleSuggestions.length > 0 && (
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <SearchableMultiSelect
                options={articleSuggestions}
                selectedValues={selectedArticles}
                onChange={setSelectedArticles}
                placeholder="Select Articles..."
              />
            </div>
            <button 
              onClick={handleApplyArticles}
              disabled={selectedArticles.length === 0}
              className="bg-uster-red text-white px-4 py-3 rounded-xl font-bold text-xs shadow-md shadow-red-200 active:scale-95 transition-transform disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Table Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-black space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">First Column</label>
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-uster-red"
            >
              {groupByOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filter By</label>
            <select 
              value={filterField}
              onChange={(e) => { setFilterField(e.target.value); setSelectedFilterValues([]); }}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-uster-red"
            >
              <option value="">No Filter</option>
              {filterOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {groupBy === 'ShiftStartTime' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-uster-red"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {filterField && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filter Values</label>
            <SearchableMultiSelect
              options={getUniqueFilterValues()}
              selectedValues={selectedFilterValues}
              onChange={setSelectedFilterValues}
              placeholder={`Select ${filterOptions.find(o => o.id === filterField)?.label}...`}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={() => setShowColumnConfig(!showColumnConfig)}
            className="flex-1 flex items-center justify-center space-x-2 bg-gray-50 py-3 rounded-xl text-gray-600 font-bold text-xs border border-gray-800"
          >
            <Layers size={16} />
            <span>Columns Visibility</span>
          </button>
          <div className="flex gap-1">
            <button 
              onClick={exportPDF}
              disabled={groupedRows.length === 0}
              className="w-12 h-12 flex items-center justify-center bg-uster-red rounded-xl text-white shadow-sm disabled:opacity-50"
              title="Export PDF"
            >
              <FileText size={20} />
            </button>
            <button 
              onClick={exportExcel}
              disabled={groupedRows.length === 0}
              className="w-12 h-12 flex items-center justify-center bg-green-600 rounded-xl text-white shadow-md shadow-green-200 disabled:opacity-50"
              title="Export Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Column Config Modal */}
      <AnimatePresence>
        {showColumnConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-uster-red">
                <h3 className="text-white font-black uppercase text-sm">Visible Columns</h3>
                <button onClick={() => setShowColumnConfig(false)} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto grid grid-cols-2 gap-3">
                {REPORT_COLUMNS.map(col => (
                  <button
                    key={col.title}
                    onClick={() => {
                      if (visibleColumns.includes(col.title)) {
                        setVisibleColumns(visibleColumns.filter(c => c !== col.title));
                      } else {
                        setVisibleColumns([...visibleColumns, col.title]);
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      visibleColumns.includes(col.title)
                        ? 'bg-red-50 border-red-200 text-uster-red'
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-bold">{col.title}</span>
                    {visibleColumns.includes(col.title) && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="p-6 bg-gray-50">
                <button 
                  onClick={() => setShowColumnConfig(false)}
                  className="w-full bg-uster-red text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-red-200"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-uster-red">
                <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider sticky left-0 bg-uster-red z-10 border-b border-uster-red-dark">
                  {groupByOptions.find(o => o.id === groupBy)?.label}
                </th>
                {REPORT_COLUMNS.filter(c => visibleColumns.includes(c.title)).map(col => (
                  <th key={col.title} className="p-3 text-[10px] font-black text-white uppercase tracking-wider text-center border-b border-uster-red-dark">
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-10 text-center text-gray-400 text-xs font-bold">
                    No data available. Load data to see results.
                  </td>
                </tr>
              ) : (
                groupedRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`p-3 text-xs font-bold text-gray-700 sticky left-0 z-10 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {row.groupKey}
                    </td>
                    {REPORT_COLUMNS.filter(c => visibleColumns.includes(c.title)).map(col => (
                      <td key={col.title} className="p-3 text-xs font-medium text-gray-600 text-center border-b border-gray-100">
                        {row[col.title]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SearchTab;
