import type { ScheduleBlock } from './synthetic';

/**
 * Sample neighbourhoods used to seed the demo database.
 * Coordinates are approximate public centroids. Outage history is generated;
 * nothing here is a live feed, and the rest of Barq does not special-case these ids.
 */
export type Place = {
  id: string;
  countryCode: string;
  countryNameEn: string;
  countryNameAr: string;
  cityId: string;
  cityNameEn: string;
  cityNameAr: string;
  nameEn: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  timezone: string;
  stress: number;
  schedule?: ScheduleBlock;
};

const daily = [0, 1, 2, 3, 4, 5, 6];
const weekdays = [1, 2, 3, 4, 5];

export const PLACES: Place[] = [
  place('ly-tri-and', 'LY', 'Libya', 'ليبيا', 'ly-tri', 'Tripoli', 'طرابلس', 'Hay Al-Andalus', 'حي الأندلس', 32.8758, 13.1525, 'Africa/Tripoli', 1.15),
  place('ly-tri-taj', 'LY', 'Libya', 'ليبيا', 'ly-tri', 'Tripoli', 'طرابلس', 'Tajura', 'تاجوراء', 32.8819, 13.3506, 'Africa/Tripoli', 1.25, { dow: daily, startHour: 18, endHour: 22 }),
  place('ly-tri-jan', 'LY', 'Libya', 'ليبيا', 'ly-tri', 'Tripoli', 'طرابلس', 'Janzour', 'جنزور', 32.8178, 13.0176, 'Africa/Tripoli', 1.05),
  place('ly-tri-abu', 'LY', 'Libya', 'ليبيا', 'ly-tri', 'Tripoli', 'طرابلس', 'Abu Salim', 'أبو سليم', 32.8417, 13.1814, 'Africa/Tripoli', 1.3),
  place('lb-bey-ham', 'LB', 'Lebanon', 'لبنان', 'lb-bey', 'Beirut', 'بيروت', 'Hamra', 'الحمرا', 33.8961, 35.4806, 'Asia/Beirut', 1.2, { dow: weekdays, startHour: 10, endHour: 14 }),
  place('lb-bey-ach', 'LB', 'Lebanon', 'لبنان', 'lb-bey', 'Beirut', 'بيروت', 'Achrafieh', 'الأشرفية', 33.8886, 35.5194, 'Asia/Beirut', 1.05),
  place('lb-bey-dah', 'LB', 'Lebanon', 'لبنان', 'lb-bey', 'Beirut', 'بيروت', 'Dahieh', 'الضاحية', 33.8528, 35.5081, 'Asia/Beirut', 1.35),
  place('ng-los-ike', 'NG', 'Nigeria', 'نيجيريا', 'ng-los', 'Lagos', 'لاغوس', 'Ikeja', 'إيكيجا', 6.6018, 3.3515, 'Africa/Lagos', 1.2, { dow: [1, 3, 5], startHour: 8, endHour: 12 }),
  place('ng-los-vic', 'NG', 'Nigeria', 'نيجيريا', 'ng-los', 'Lagos', 'لاغوس', 'Victoria Island', 'جزيرة فيكتوريا', 6.4281, 3.4219, 'Africa/Lagos', 0.95),
  place('ng-los-sur', 'NG', 'Nigeria', 'نيجيريا', 'ng-los', 'Lagos', 'لاغوس', 'Surulere', 'سوروليري', 6.4961, 3.3547, 'Africa/Lagos', 1.15),
  place('pk-khi-cli', 'PK', 'Pakistan', 'باكستان', 'pk-khi', 'Karachi', 'كراتشي', 'Clifton', 'كليفتون', 24.8138, 67.0299, 'Asia/Karachi', 1.1),
  place('pk-khi-gul', 'PK', 'Pakistan', 'باكستان', 'pk-khi', 'Karachi', 'كراتشي', 'Gulshan-e-Iqbal', 'غلشان إقبال', 24.92, 67.092, 'Asia/Karachi', 1.25),
  place('pk-khi-sad', 'PK', 'Pakistan', 'باكستان', 'pk-khi', 'Karachi', 'كراتشي', 'Saddar', 'صدر', 24.858, 67.01, 'Asia/Karachi', 1.3, { dow: daily, startHour: 14, endHour: 18 }),
  place('za-jnb-sow', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-jnb', 'Johannesburg', 'جوهانسبرغ', 'Soweto', 'سويتو', -26.2678, 27.8585, 'Africa/Johannesburg', 1.2, { dow: weekdays, startHour: 16, endHour: 20 }),
  place('za-jnb-san', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-jnb', 'Johannesburg', 'جوهانسبرغ', 'Sandton', 'ساندتون', -26.1076, 28.0567, 'Africa/Johannesburg', 0.9),
  place('za-jnb-ale', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-jnb', 'Johannesburg', 'جوهانسبرغ', 'Alexandra', 'ألكسندرا', -26.1036, 28.1006, 'Africa/Johannesburg', 1.28),
  place('za-cpt-woo', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-cpt', 'Cape Town', 'كيب تاون', 'Woodstock', 'وودستوك', -33.9272, 18.447, 'Africa/Johannesburg', 0.95),
  place('za-cpt-kha', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-cpt', 'Cape Town', 'كيب تاون', 'Khayelitsha', 'خايليتشا', -34.0403, 18.6775, 'Africa/Johannesburg', 1.32),
  place('za-cpt-obs', 'ZA', 'South Africa', 'جنوب أفريقيا', 'za-cpt', 'Cape Town', 'كيب تاون', 'Observatory', 'أوبزرفاتوري', -33.9375, 18.4681, 'Africa/Johannesburg', 1.0),
  place('iq-bgw-kar', 'IQ', 'Iraq', 'العراق', 'iq-bgw', 'Baghdad', 'بغداد', 'Karrada', 'الكرادة', 33.303, 44.421, 'Asia/Baghdad', 1.1),
  place('iq-bgw-sdr', 'IQ', 'Iraq', 'العراق', 'iq-bgw', 'Baghdad', 'بغداد', 'Sadr City', 'مدينة الصدر', 33.385, 44.465, 'Asia/Baghdad', 1.34, { dow: daily, startHour: 6, endHour: 10 }),
  place('iq-bgw-man', 'IQ', 'Iraq', 'العراق', 'iq-bgw', 'Baghdad', 'بغداد', 'Mansour', 'المنصور', 33.315, 44.335, 'Asia/Baghdad', 1.0),
  place('ye-sah-old', 'YE', 'Yemen', 'اليمن', 'ye-sah', "Sana'a", 'صنعاء', 'Old City', 'صنعاء القديمة', 15.3529, 44.2066, 'Asia/Aden', 1.36, { dow: daily, startHour: 14, endHour: 18 }),
  place('ye-sah-had', 'YE', 'Yemen', 'اليمن', 'ye-sah', "Sana'a", 'صنعاء', 'Haddah', 'حدة', 15.312, 44.192, 'Asia/Aden', 1.22),
  place('ye-sah-sab', 'YE', 'Yemen', 'اليمن', 'ye-sah', "Sana'a", 'صنعاء', 'Al-Sabeen', 'السبعين', 15.318, 44.228, 'Asia/Aden', 1.3),
];

function place(
  id: string,
  countryCode: string,
  countryNameEn: string,
  countryNameAr: string,
  cityId: string,
  cityNameEn: string,
  cityNameAr: string,
  nameEn: string,
  nameAr: string,
  latitude: number,
  longitude: number,
  timezone: string,
  stress: number,
  schedule?: ScheduleBlock,
): Place {
  return {
    id,
    countryCode,
    countryNameEn,
    countryNameAr,
    cityId,
    cityNameEn,
    cityNameAr,
    nameEn,
    nameAr,
    latitude,
    longitude,
    timezone,
    stress,
    schedule,
  };
}

export const PUBLISHED_EVAL = {
  days: 80,
  testDays: 14,
  seed: 20261010,
  /** Fixed clock so the published benchmark does not drift from day to day. */
  now: '2026-06-15T12:00:00.000Z',
} as const;
