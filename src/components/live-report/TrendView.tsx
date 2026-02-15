import React, { useState } from 'react';
import { TrendingUp, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { type TrendResponse } from './types';

interface TrendViewProps {
  response: TrendResponse | null;
  loading: boolean;
  parameter: string;
  hideEmptyLatest?: boolean;
}

const TrendView: React.FC<TrendViewProps> = ({ response, loading, parameter, hideEmptyLatest }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (label: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year.slice(-2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <Loader2 size={32} className="text-uster-red animate-spin" />
        <p className="text-sm text-gray-500 font-bold">Fetching trend data...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <TrendingUp size={32} className="text-uster-red" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-black uppercase tracking-tight text-gray-800">Quality Trends</h3>
          <p className="text-sm text-gray-500 font-bold mt-1">Select parameters and click Show Data</p>
        </div>
      </div>
    );
  }

  if (!response.data || response.data.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <TrendingUp size={32} className="text-uster-red" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-black uppercase tracking-tight text-gray-800">No Data Found</h3>
          <p className="text-sm text-gray-500 font-bold mt-1">Try a different parameter or first column option</p>
        </div>
      </div>
    );
  }

  const dates = response.dates || Array.from(new Set(response.data.map(d => d.date))).sort();
  const latestDate = dates[dates.length - 1];

  const filteredLabels = response.labels.filter(label => {
    if (!hideEmptyLatest) return true;
    const latestVal = response.data.find(d => d.date === latestDate)?.[label];
    return latestVal !== undefined && latestVal !== null && latestVal !== "0.00" && latestVal !== 0;
  });

  const renderRows = (label: string, idx: number, isSubRow = false, parentLabel?: string) => {
    const dataSet = isSubRow && parentLabel && response.drillDownData ? response.drillDownData[parentLabel].data : response.data;
    
    // Find the oldest available data point for this row
    let oldestVal: any = undefined;
    for (const date of dates) {
      const val = dataSet.find(d => d.date === date)?.[label];
      if (val !== undefined && val !== null) {
        oldestVal = val;
        break;
      }
    }
    
    const latestVal = latestDate ? dataSet.find(d => d.date === latestDate)?.[label] : undefined;
    
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

    const hasDrillDown = !isSubRow && response.drillDownData?.[label] && response.drillDownData[label].labels.length > 0;

    return (
      <React.Fragment key={`${isSubRow ? parentLabel + '-' : ''}${label}`}>
        <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${hasDrillDown ? 'cursor-pointer hover:bg-red-50/30' : ''}`} onClick={() => hasDrillDown && toggleRow(label)}>
          <td className={`px-4 py-3 text-xs font-bold text-gray-700 border-b border-r border-gray-100 sticky left-0 z-10 whitespace-nowrap ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isSubRow ? 'pl-8 text-gray-500 italic' : ''}`}>
            <div className="flex items-center space-x-2">
              {!isSubRow && hasDrillDown && (
                expandedRows[label] ? <ChevronDown size={14} className="text-uster-red" /> : <ChevronRight size={14} className="text-gray-400" />
              )}
              <span>{label}</span>
            </div>
          </td>
          {dates.map(date => {
            const dayData = dataSet.find(d => d.date === date);
            const value = dayData ? dayData[label] : undefined;
            return (
              <td key={date} className={`px-4 py-3 text-xs font-medium border-b border-gray-100 text-center ${isSubRow ? 'text-gray-400' : 'text-gray-600'}`}>
                {value !== undefined ? value : '-'}
              </td>
            );
          })}
          <td className={`px-4 py-3 text-xs font-black border-b border-gray-100 text-center ${
            diffPercent.includes('+') ? 'text-uster-red' : diffPercent.includes('-') ? 'text-green-600' : 'text-gray-600'
          }`}>
            {diffPercent}
          </td>
        </tr>
        {!isSubRow && expandedRows[label] && response.drillDownData?.[label] && (
          response.drillDownData[label].labels.map((mLabel, mIdx) => renderRows(mLabel, mIdx, true, label))
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-uster-red px-6 py-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm">
          {parameter} Trend Report
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-red-50 text-uster-red px-4 py-3 text-xs font-black uppercase tracking-wider border-b border-r border-red-100 text-left sticky left-0 z-10">
                Trend
              </th>
              {dates.map(date => (
                <th key={date} className="bg-red-50 text-uster-red px-4 py-3 text-xs font-black uppercase tracking-wider border-b border-red-100 text-center whitespace-nowrap">
                  {formatDate(date)}
                </th>
              ))}
              <th className="bg-red-50 text-uster-red px-4 py-3 text-xs font-black uppercase tracking-wider border-b border-red-100 text-center whitespace-nowrap">
                % Diff
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLabels.map((label, idx) => renderRows(label, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrendView;
