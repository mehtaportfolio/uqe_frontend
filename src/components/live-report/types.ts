export interface MachineCutData {
  machineName: string;
  YarnFaults: string;
  YarnJoints: string;
  YarnBreaks: string;
  NCuts: string;
  SCuts: string;
  LCuts: string;
  TCuts: string;
  FDCuts: string;
  PPCuts: string;
  totalAlarms?: number;
  alarmBreakdown?: Record<string, number>;
}

export interface ArticleCutData {
  articleNumber: string;
  YarnFaults: string;
  YarnJoints: string;
  YarnBreaks: string;
  NCuts: string;
  SCuts: string;
  LCuts: string;
  TCuts: string;
  FDCuts: string;
  PPCuts: string;
  Thin50?: string;
  Thick50?: string;
  Nep200?: string;
  CVAvg?: string;
  HAvg?: string;
  IPI?: string;
  HSIPI?: string;
  totalAlarms?: number;
  alarmBreakdown?: Record<string, number>;
  machines?: MachineCutData[];
}

export interface LiveReportData {
  unit: string;
  shiftStartTime?: string;
  yarnFaults: number;
  totalAlarms: number;
  alarmsPer1000km: number;
  alarmBreakdown?: Record<string, number>;
  totalCuts?: number;
  cutsPer100km?: number;
  unitCuts?: Record<string, string>;
  unitQuality?: Record<string, string>;
  articles?: ArticleCutData[];
}

export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface TrendResponse {
  data: TrendDataPoint[];
  labels: string[];
  dates?: string[];
  drillDownData?: Record<string, {
    labels: string[];
    data: TrendDataPoint[];
  }>;
}
