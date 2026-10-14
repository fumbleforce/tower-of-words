// Reuse the existing weekly club schedule. There is no seasonal pool closure.
import { weekdayOf } from '../ongoing/calendar.js';
export const poolMeeting = (day, period) => day >= 3 && weekdayOf(day) === 6 && period === 'evening';
