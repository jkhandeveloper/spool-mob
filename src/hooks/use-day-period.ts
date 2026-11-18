import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { DayPeriod } from '@/lib/types';

/** When each part of the day starts, in local 24-hour time. Must match the API's `dayPeriod`. */
export const DAY_PERIODS: { period: DayPeriod; label: string; starts: string }[] = [
  { period: 'morning', label: 'Morning', starts: '04:00' },
  { period: 'afternoon', label: 'Afternoon', starts: '12:00' },
  { period: 'night', label: 'Night', starts: '18:00' },
];

/** Morning 04:00–11:59, afternoon 12:00–17:59, night 18:00–03:59. */
export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

/**
 * The current part of the day by the phone's clock. It switches on its own at
 * 04:00, 12:00 and 18:00 while a screen is open, and again when the app returns
 * to the foreground (timers are paused in the background).
 */
export function useDayPeriod(): DayPeriod {
  const [period, setPeriod] = useState(() => dayPeriod(new Date().getHours()));

  useEffect(() => {
    const update = () => setPeriod(dayPeriod(new Date().getHours()));
    const timer = setInterval(update, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return period;
}
