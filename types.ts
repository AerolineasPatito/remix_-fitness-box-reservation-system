

export enum ClassType {
  FUNCTIONAL = 'Entrenamiento Funcional',
  SCULPT_STRENGTH = 'Sculpt and Strength',
  HIIT_CONDITIONING = 'HIIT Conditioning',
  LOWER_BODY_SCULPT = 'Sculpt Lower Body',
  FULL_BODY = 'Full Body'
}

export type UserRole = 'coach' | 'student';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  whatsapp_phone?: string;
  policy_accepted_at?: string | null;
  role: UserRole;
  credits_remaining: number;
  total_attended: number;
}

export interface ClassInstance {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  capacity: number;
  imageUrl?: string;
  class_type_id?: string;
  is_event?: number | boolean;
  status?: string;
  real_time_status?: string;
  min_capacity?: number;
  max_capacity?: number;
  enrolled_count?: number;
  enrolled_students?: string[];
}

export interface ClassCategory {
  id: string;
  name: string;
  image_url?: string;
  icon?: string;
  color_theme?: string;
  description?: string;
  duration?: number;
  is_active?: number;
}

// Represents a template for a weekly recurring class session
export interface ClassSlot {
  id: string;
  type: ClassType;
  day: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface Reservation {
  id: string;
  classInstanceId: string;
  studentId: string;
  status: 'active' | 'attended' | 'cancelled';
}

export interface AvailabilityState {
  [instanceId: string]: number; // count of occupied spots
}
