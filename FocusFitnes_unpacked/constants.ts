
import { ClassType, ClassSlot } from './types';

export const MAX_CAPACITY = 8;

export const WEEKLY_SCHEDULE: ClassSlot[] = [
  // Lunes
  { id: 'mon-1', type: ClassType.FUNCTIONAL, day: 'Lunes', startTime: '07:00', endTime: '08:00', capacity: MAX_CAPACITY },
  { id: 'mon-2', type: ClassType.FUNCTIONAL, day: 'Lunes', startTime: '18:00', endTime: '19:00', capacity: MAX_CAPACITY },
  
  // Martes
  { id: 'tue-1', type: ClassType.SCULPT_STRENGTH, day: 'Martes', startTime: '07:00', endTime: '08:00', capacity: MAX_CAPACITY },
  { id: 'tue-2', type: ClassType.SCULPT_STRENGTH, day: 'Martes', startTime: '18:00', endTime: '19:00', capacity: MAX_CAPACITY },
  
  // Miércoles
  { id: 'wed-1', type: ClassType.HIIT_CONDITIONING, day: 'Miércoles', startTime: '07:00', endTime: '08:00', capacity: MAX_CAPACITY },
  { id: 'wed-2', type: ClassType.HIIT_CONDITIONING, day: 'Miércoles', startTime: '18:00', endTime: '19:00', capacity: MAX_CAPACITY },
  
  // Jueves
  { id: 'thu-1', type: ClassType.LOWER_BODY_SCULPT, day: 'Jueves', startTime: '07:00', endTime: '08:00', capacity: MAX_CAPACITY },
  { id: 'thu-2', type: ClassType.SCULPT_STRENGTH, day: 'Jueves', startTime: '18:00', endTime: '19:00', capacity: MAX_CAPACITY },
  
  // Viernes
  { id: 'fri-1', type: ClassType.FULL_BODY, day: 'Viernes', startTime: '07:00', endTime: '08:00', capacity: MAX_CAPACITY },
  { id: 'fri-2', type: ClassType.FULL_BODY, day: 'Viernes', startTime: '18:00', endTime: '19:00', capacity: MAX_CAPACITY }
];

export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
