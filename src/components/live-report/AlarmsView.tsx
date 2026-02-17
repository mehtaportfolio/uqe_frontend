import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { type LiveReportData } from './types';
import { getMachineWiseData } from './utils';

interface AlarmsViewProps {
  data: LiveReportData[];
  loading: boolean;
  viewMode: 'article' | 'machine';
  expandedArticles: Record<string, boolean>;
  toggleArticleExpansion: (unit: string, id: string) => void;
  formatDate: (dateString: string) => string;
}

const AlarmsView: React.FC<AlarmsViewProps> = ({ 
  data, 
  loading, 
  viewMode, 
  expandedArticles, 
  toggleArticleExpansion, 
  formatDate 
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Bell size={48} className="text-gray-400 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-500">No Data Available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="min-w-full">
        {data.map((unitData) => (
          <div key={unitData.unit} className="mb-8 last:mb-0">
            <div className="bg-red-50 px-6 py-3 border-y border-red-100 flex justify-between items-center">
              <h4 className="font-black text-uster-red uppercase tracking-widest text-xs">
                {unitData.unit} - {unitData.shiftStartTime ? formatDate(unitData.shiftStartTime) : 'Current'}{unitData.shiftNumber && unitData.shiftNumber !== 'All' ? ` - Shift ${unitData.shiftNumber}` : ''}
              </h4>
              <div className="text-right">
                <span className="text-xs font-black text-uster-red">{unitData.totalAlarms || 0} Total</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">{viewMode === 'article' ? 'Article' : 'Machine'}</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">NS</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">LA</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">TA</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">CA</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">CC</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">FA</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">PP</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">PF</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">CV</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">HA</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">CMT</th>
                    <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-uster-red text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const rows = viewMode === 'article' 
                      ? [...(unitData.articles || [])].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber, undefined, { numeric: true, sensitivity: 'base' }))
                      : getMachineWiseData(unitData);

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                            No Data Available
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {rows.map((row: unknown, artIdx: number) => (
                          <React.Fragment key={artIdx}>
                            <tr 
                              onClick={() => toggleArticleExpansion(unitData.unit, viewMode === 'article' ? (row as any).articleNumber : (row as any).machineName)}
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-4 text-xs font-bold text-gray-800 flex items-center space-x-2">
                                <div className={`transition-transform duration-200 ${expandedArticles[`${unitData.unit}-${viewMode === 'article' ? (row as any).articleNumber : (row as any).machineName}`] ? 'rotate-90' : ''}`}>
                                  <ChevronRight size={14} className="text-uster-red" />
                                </div>
                                <span>{viewMode === 'article' ? (row as any).articleNumber : (row as any).displayMachineName}</span>
                              </td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.NSABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.LABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.TABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.CABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.CCABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.FABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.PPABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.PFABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.CVpABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.HpABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-gray-900 text-center">{(row as any).alarmBreakdown?.CMTABlks || 0}</td>
                              <td className="px-2 py-4 text-xs font-black text-uster-red text-center bg-red-50/30">{(row as any).totalAlarms || 0}</td>
                            </tr>
                            <AnimatePresence>
                              {expandedArticles[`${unitData.unit}-${viewMode === 'article' ? (row as any).articleNumber : (row as any).machineName}`] && (viewMode === 'article' ? (row as any).machines : (row as any).articles) && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <td colSpan={13} className="px-0 py-0 bg-gray-50/30">
                                    <div className="overflow-hidden border-l-4 border-uster-red/20">
                                      <table className="w-full">
                                        <tbody className="divide-y divide-gray-100">
                                          {[...(viewMode === 'article' ? (row as any).machines : (row as any).articles)].sort((a, b) => {
                                            const valA = viewMode === 'article' ? a.machineName : a.articleNumber;
                                            const valB = viewMode === 'article' ? b.machineName : b.articleNumber;
                                            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                                          }).map((sub: unknown, subIdx: number) => (
                                            <tr key={subIdx} className="bg-white/50">
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-500 pl-10 italic">{viewMode === 'article' ? (sub as any).machineName.slice(-2) : (sub as any).articleNumber}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.NSABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.LABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.TABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.CABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.CCABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.FABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.PPABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.PFABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.CVpABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.HpABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-bold text-gray-600 text-center">{(sub as any).alarmBreakdown?.CMTABlks || 0}</td>
                                              <td className="px-2 py-3 text-[10px] font-black text-uster-red/60 text-center bg-red-50/10">{(sub as any).totalAlarms || 0}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        ))}
                        {/* Overall Total Row */}
                        <tr className="bg-red-50 font-black">
                          <td className="px-4 py-4 text-xs text-uster-red">Overall Total</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.NSABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.LABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.TABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.CABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.CCABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.FABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.PPABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.PFABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.CVpABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.HpABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center">{unitData.alarmBreakdown?.CMTABlks || 0}</td>
                          <td className="px-2 py-4 text-xs text-uster-red text-center bg-red-100/50">{unitData.totalAlarms || 0}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlarmsView;
