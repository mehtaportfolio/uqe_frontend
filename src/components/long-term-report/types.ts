export interface LongTermDataRecord {
  ShiftStartTime: string;
  MillUnit: string;
  ArticleNumber: string;
  ArticleName?: string;
  MachineName: string;
  LotID: string;
  YarnLength: number;
  YarnFaults: number;
  NCuts: number;
  SCuts: number;
  LCuts: number;
  TCuts: number;
  FDCuts: number;
  PPCuts: number;
  CpCuts: number;
  CCpCuts: number;
  CmCuts: number;
  CCmCuts: number;
  Thin50: number;
  Thick50: number;
  Nep200: number;
  Thin40: number;
  Thick35: number;
  Nep140: number;
  CVAvg: number;
  HAvg: number;
  IPRefLength: number;
  B_A1Events?: number;
  [key: string]: string | number | boolean | undefined | null;
}

export interface FilterOption {
  id: string;
  label: string;
}

export const REPORT_COLUMNS = [
  { title: 'YF', field: 'YarnFaults', type: 'perLength' },
  { title: 'N', field: 'NCuts', type: 'perLength' },
  { title: 'S', field: 'SCuts', type: 'perLength' },
  { title: 'L', field: 'LCuts', type: 'perLength' },
  { title: 'T', field: 'TCuts', type: 'perLength' },
  { title: 'FD', field: 'FDCuts', type: 'perLength' },
  { title: 'PP', field: 'PPCuts', type: 'perLength' },
  { title: 'Cp', field: 'CpCuts', type: 'perLength' },
  { title: 'CCp', field: 'CCpCuts', type: 'perLength' },
  { title: 'Cm', field: 'CmCuts', type: 'perLength' },
  { title: 'CCm', field: 'CCmCuts', type: 'perLength' },
  { title: 'CV%', field: 'CVAvg', type: 'simpleAvg' },
  { title: 'H', field: 'HAvg', type: 'simpleAvg' },
  { title: 'A1', field: 'B_A1Events', type: 'perLength' },
  { title: 'IPI', type: 'customTotalIPI' },
  { title: 'HS IPI', type: 'customTotalHSIPI' }
];
