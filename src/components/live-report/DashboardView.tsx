import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { type LiveReportData } from './types';

interface DashboardViewProps {
  data: LiveReportData[];
  loading: boolean;
  formatDate: (dateString: string) => string;
}

const DashboardView: React.FC<DashboardViewProps> = ({ data, loading, formatDate }) => {
  const formatOneDecimal = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return '0.0';
    const num = parseFloat(val.toString());
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

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
        <Activity size={48} className="text-gray-400 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-500">No Data Available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.map((item, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          key={item.unit}
          className="bg-[#ffffff] p-6 rounded-3xl shadow-md border-b-4 border-[#C8102E] flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 opacity-10">
            <Activity size={40} className="text-[#C8102E]" />
          </div>
          <p className="text-[11px] font-black text-[#C8102E] uppercase tracking-widest mb-1 text-center leading-tight">
            {item.unit} ( {item.shiftStartTime ? formatDate(item.shiftStartTime) : ''} )

          </p>
          <p className="text-xl font-black text-[#1f2937]">
            YF : {formatOneDecimal(item.yarnFaults)}
          </p>
          <p className="text-sm font-bold text-[#C8102E] mt-1">
            Alarms : {formatOneDecimal(item.totalAlarms)}
          </p>
          <p className="text-[10px] font-bold text-[#6b7280] mt-1">
            Alarms/1000km : {formatOneDecimal(item.alarmsPer1000km)}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardView;
