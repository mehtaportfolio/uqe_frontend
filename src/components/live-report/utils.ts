import { type LiveReportData } from './types';

export const getMachineWiseData = (unitData: LiveReportData) => {
  const machineMap: Record<string, {
    machineName: string;
    displayMachineName: string;
    YarnFaults: number;
    YarnJoints: number;
    YarnBreaks: number;
    NCuts: number;
    SCuts: number;
    LCuts: number;
    TCuts: number;
    FDCuts: number;
    PPCuts: number;
    totalAlarms: number;
    alarmBreakdown: Record<string, number>;
    articles: any[];
  }> = {};
  
  unitData.articles?.forEach(art => {
    art.machines?.forEach(mach => {
      const displayMachineName = mach.machineName.slice(-2);
      if (!machineMap[mach.machineName]) {
        machineMap[mach.machineName] = {
          machineName: mach.machineName,
          displayMachineName: displayMachineName,
          YarnFaults: 0,
          YarnJoints: 0,
          YarnBreaks: 0,
          NCuts: 0,
          SCuts: 0,
          LCuts: 0,
          TCuts: 0,
          FDCuts: 0,
          PPCuts: 0,
          totalAlarms: 0,
          alarmBreakdown: {},
          articles: []
        };
      }
      
      const m = machineMap[mach.machineName];
      m.YarnFaults += Number(mach.YarnFaults) || 0;
      m.YarnJoints += Number(mach.YarnJoints) || 0;
      m.YarnBreaks += Number(mach.YarnBreaks) || 0;
      m.NCuts += Number(mach.NCuts) || 0;
      m.SCuts += Number(mach.SCuts) || 0;
      m.LCuts += Number(mach.LCuts) || 0;
      m.TCuts += Number(mach.TCuts) || 0;
      m.FDCuts += Number(mach.FDCuts) || 0;
      m.PPCuts += Number(mach.PPCuts) || 0;
      m.totalAlarms += mach.totalAlarms || 0;
      
      if (mach.alarmBreakdown) {
        Object.entries(mach.alarmBreakdown).forEach(([key, val]) => {
          m.alarmBreakdown[key] = (m.alarmBreakdown[key] || 0) + (val as number);
        });
      }
      
      m.articles.push({
        ...art,
        ...mach,
        articleNumber: art.articleNumber,
        displayMachineName: displayMachineName,
        machines: []
      });
    });
  });
  
  return Object.values(machineMap).sort((a, b) => 
    a.machineName.localeCompare(b.machineName, undefined, { numeric: true, sensitivity: 'base' })
  );
};
