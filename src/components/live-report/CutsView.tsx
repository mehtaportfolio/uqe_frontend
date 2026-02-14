import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, ChevronRight } from 'lucide-react';
import { type LiveReportData } from './types';
import { getMachineWiseData } from './utils';

interface CutsViewProps {
  data: LiveReportData[];
  loading: boolean;
  viewMode: 'article' | 'machine';
  expandedArticles: Record<string, boolean>;
  toggleArticleExpansion: (unit: string, id: string) => void;
  formatDate: (dateString: string) => string;
}

const CutsView: React.FC<CutsViewProps> = ({ 
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
        <div className="w-8 h-8 border-4 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Scissors size={48} className="text-gray-400 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-500">No Data Available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="min-w-full">
        {data.map((unitData) => (
          <div key={unitData.unit} className="mb-8 last:mb-0">
            <div className="bg-red-50 px-6 py-3 border-y border-red-100">
              <h4 className="font-black text-red-600 uppercase tracking-widest text-xs">
                {unitData.unit} - {unitData.shiftStartTime ? formatDate(unitData.shiftStartTime) : 'Current'}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">{viewMode === 'article' ? 'Article' : 'Machine'}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">YF</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">N</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">S</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">L</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">T</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">FD</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">PP</th>
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
                          <td colSpan={10} className="px-4 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                            No Article Data
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {rows.map((row: any, artIdx: number) => (
                          <React.Fragment key={artIdx}>
                            <tr 
                              onClick={() => toggleArticleExpansion(unitData.unit, viewMode === 'article' ? row.articleNumber : row.machineName)}
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-4 text-xs font-bold text-gray-800 flex items-center space-x-2">
                                <div className={`transition-transform duration-200 ${expandedArticles[`${unitData.unit}-${viewMode === 'article' ? row.articleNumber : row.machineName}`] ? 'rotate-90' : ''}`}>
                                  <ChevronRight size={14} className="text-red-600" />
                                </div>
                                <span>{viewMode === 'article' ? row.articleNumber : row.displayMachineName}</span>
                              </td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.YarnFaults))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.NCuts))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.SCuts))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.LCuts))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.TCuts))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.FDCuts))}</td>
                              <td className="px-4 py-4 text-xs font-black text-gray-900 text-center">{Math.round(Number(row.PPCuts))}</td>
                            </tr>
                            <AnimatePresence>
                              {expandedArticles[`${unitData.unit}-${viewMode === 'article' ? row.articleNumber : row.machineName}`] && (viewMode === 'article' ? row.machines : row.articles) && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <td colSpan={10} className="px-0 py-0 bg-gray-50/30">
                                    <div className="overflow-hidden border-l-4 border-red-600/20">
                                      <table className="w-full">
                                        <tbody className="divide-y divide-gray-100">
                                          {[...(viewMode === 'article' ? row.machines : row.articles)].sort((a, b) => {
                                            const valA = viewMode === 'article' ? a.machineName : a.articleNumber;
                                            const valB = viewMode === 'article' ? b.machineName : b.articleNumber;
                                            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                                          }).map((sub: any, subIdx: number) => (
                                            <tr key={subIdx} className="bg-white/50">
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-500 pl-10 italic">{viewMode === 'article' ? sub.machineName.slice(-2) : sub.articleNumber}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.YarnFaults))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.NCuts))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.SCuts))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.LCuts))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.TCuts))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.FDCuts))}</td>
                                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 text-center">{Math.round(Number(sub.PPCuts))}</td>
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
                        {/* Overall Average Row */}
                        <tr className="bg-red-50 font-black">
                          <td className="px-4 py-4 text-xs text-red-600">Overall Average</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.YarnFaults))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.NCuts))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.SCuts))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.LCuts))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.TCuts))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.FDCuts))}</td>
                          <td className="px-4 py-4 text-xs text-red-600 text-center">{Math.round(Number(unitData.unitCuts?.PPCuts))}</td>
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

export default CutsView;
