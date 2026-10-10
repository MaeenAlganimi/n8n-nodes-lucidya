export type DashboardArea = {
  id: string;
  countryCode: string;
  country: string;
  city: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'confirmed' | 'unconfirmed' | 'on';
  synthetic: boolean;
  distinctReporters: number;
  startedAt: string | null;
  probability: number;
  baseline: number;
  hoursToday: number;
  hoursWeek: number;
};

export type ReportChoice = {
  id: string;
  countryCode: string;
  country: string;
  cityId: string;
  city: string;
  name: string;
};
