import { useState, useEffect } from 'react';

export type ClassStatus = 'scheduled' | 'in_progress' | 'finished';

export interface RealTimeClassInfo {
  status: ClassStatus;
  timeUntilStart?: number; // in milliseconds
  timeUntilEnd?: number; // in milliseconds
  timeSinceStart?: number; // in milliseconds
  timeSinceEnd?: number; // in milliseconds
  progress?: number; // percentage 0-100
}

export const useRealTimeClassStatus = (classDate: string, startTime: string, endTime: string) => {
  const [realTimeInfo, setRealTimeInfo] = useState<RealTimeClassInfo>({
    status: 'scheduled'
  });

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const classStart = new Date(`${classDate}T${startTime}`);
      const classEnd = new Date(`${classDate}T${endTime}`);

      let status: ClassStatus = 'scheduled';
      let timeUntilStart: number | undefined;
      let timeUntilEnd: number | undefined;
      let timeSinceStart: number | undefined;
      let timeSinceEnd: number | undefined;
      let progress: number | undefined;

      if (now < classStart) {
        status = 'scheduled';
        timeUntilStart = classStart.getTime() - now.getTime();
      } else if (now >= classStart && now < classEnd) {
        status = 'in_progress';
        timeSinceStart = now.getTime() - classStart.getTime();
        timeUntilEnd = classEnd.getTime() - now.getTime();
        progress = (timeSinceStart / (classEnd.getTime() - classStart.getTime())) * 100;
      } else {
        status = 'finished';
        timeSinceEnd = now.getTime() - classEnd.getTime();
      }

      setRealTimeInfo({
        status,
        timeUntilStart,
        timeUntilEnd,
        timeSinceStart,
        timeSinceEnd,
        progress
      });
    };

    // Update immediately
    updateStatus();

    // Update every second for real-time feel
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [classDate, startTime, endTime]);

  return realTimeInfo;
};

export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return 'Ahora';

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatTimeSince = (milliseconds: number): string => {
  if (milliseconds <= 0) return 'Ahora';

  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
};
