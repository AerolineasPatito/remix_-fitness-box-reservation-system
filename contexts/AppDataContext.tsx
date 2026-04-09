import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, logger } from '../lib/api.ts';
import { AvailabilityState, ClassInstance } from '../types.ts';

type ClassTypeItem = {
  id: string;
  name: string;
  image_url?: string;
  icon?: string;
  color_theme?: string;
  description?: string;
  sort_order?: number;
  duration?: number;
  is_active?: number;
};

type PackageItem = {
  id: string;
  nombre: string;
  capacidad: number;
  numero_clases: number;
  vigencia_semanas: number;
  detalles?: string;
  precio_base: number;
  estado: string;
};

type SystemSettings = {
  cancellation_limit_hours: number;
  cancellation_cutoff_morning: string;
  cancellation_deadline_evening: string;
};

type HighlightItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  sort_order?: number;
};

type AppDataContextType = {
  classTypes: ClassTypeItem[];
  classes: ClassInstance[];
  availability: AvailabilityState;
  packages: PackageItem[];
  highlights: HighlightItem[];
  systemSettings: SystemSettings;
  classTypesLoading: boolean;
  classesLoading: boolean;
  availabilityLoading: boolean;
  packagesLoading: boolean;
  highlightsLoading: boolean;
  settingsLoading: boolean;
  refreshClassTypes: () => Promise<void>;
  refreshClasses: () => Promise<void>;
  refreshAvailability: () => Promise<void>;
  refreshPackages: () => Promise<void>;
  refreshHighlights: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const defaultSettings: SystemSettings = {
  cancellation_limit_hours: 8,
  cancellation_cutoff_morning: '08:00',
  cancellation_deadline_evening: '22:00'
};

const normalizeClasses = (rows: any[]): ClassInstance[] =>
  (Array.isArray(rows) ? rows : []).map((d: any) => ({
    ...d,
    date: String(d.date || ''),
    startTime: String(d.start_time || d.startTime || '').substring(0, 5),
    endTime: String(d.end_time || d.endTime || '').substring(0, 5),
    imageUrl: d.image_url || d.imageUrl || '',
    is_event: Number(d.is_event || d.isEvent || 0),
    status: d.status || 'active',
    min_capacity: Number(d.min_capacity || d.minCapacity || 1),
    max_capacity: Number(d.max_capacity || d.maxCapacity || d.capacity || 0),
    capacity: Number(d.capacity || d.max_capacity || d.maxCapacity || 0),
    enrolled_count: Number(d.enrolled_count || d.reserved_count || 0),
    enrolled_students: Array.isArray(d.enrolled_students)
      ? d.enrolled_students
      : Array.isArray(d.roster)
        ? d.roster.map((p: any) => String(p?.full_name || '').trim()).filter(Boolean)
        : typeof d.enrolled_students === 'string'
          ? d.enrolled_students.split('||').filter(Boolean)
          : []
  }));

interface AppDataProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  role?: string;
  pollIntervalMs?: number;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children, enabled = true, role, pollIntervalMs = 30000 }) => {
  const [classTypes, setClassTypes] = useState<ClassTypeItem[]>([]);
  const [classes, setClasses] = useState<ClassInstance[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({});
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSettings);

  const [classTypesLoading, setClassTypesLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const refreshClassTypes = useCallback(async () => {
    if (!enabled) return;
    setClassTypesLoading(true);
    try {
      const rows = await api.getClassTypes();
      setClassTypes(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      logger.error('Error refreshing class types', error);
    } finally {
      setClassTypesLoading(false);
    }
  }, [enabled]);

  const refreshClasses = useCallback(async () => {
    if (!enabled) return;
    setClassesLoading(true);
    try {
      const rows = await api.getClasses();
      setClasses(normalizeClasses(rows || []));
    } catch (error: any) {
      logger.error('Error refreshing classes', error);
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, [enabled]);

  const refreshAvailability = useCallback(async () => {
    if (!enabled) return;
    setAvailabilityLoading(true);
    try {
      const rows = await api.getAvailability();
      setAvailability(rows || {});
    } catch (error: any) {
      logger.error('Error refreshing availability', error);
      setAvailability({});
    } finally {
      setAvailabilityLoading(false);
    }
  }, [enabled]);

  const refreshPackages = useCallback(async () => {
    if (!enabled) return;
    if (role !== 'coach' && role !== 'admin') {
      setPackages([]);
      return;
    }
    setPackagesLoading(true);
    try {
      const rows = await api.coach.getPackages();
      setPackages(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      logger.error('Error refreshing packages', error);
      setPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  }, [enabled, role]);

  const refreshHighlights = useCallback(async () => {
    if (!enabled) return;
    setHighlightsLoading(true);
    try {
      const rows = await api.getActiveHighlights();
      setHighlights(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      logger.error('Error refreshing highlights', error);
      setHighlights([]);
    } finally {
      setHighlightsLoading(false);
    }
  }, [enabled]);

  const refreshSettings = useCallback(async () => {
    if (!enabled) return;
    setSettingsLoading(true);
    try {
      const settings = await api.getPublicSettings();
      setSystemSettings({
        cancellation_limit_hours: Number(settings?.cancellation_limit_hours || defaultSettings.cancellation_limit_hours),
        cancellation_cutoff_morning: String(settings?.cancellation_cutoff_morning || defaultSettings.cancellation_cutoff_morning),
        cancellation_deadline_evening: String(settings?.cancellation_deadline_evening || defaultSettings.cancellation_deadline_evening)
      });
    } catch (error: any) {
      logger.error('Error refreshing settings', error);
      setSystemSettings(defaultSettings);
    } finally {
      setSettingsLoading(false);
    }
  }, [enabled]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshClassTypes(),
      refreshClasses(),
      refreshAvailability(),
      refreshPackages(),
      refreshHighlights(),
      refreshSettings()
    ]);
  }, [refreshAvailability, refreshClassTypes, refreshClasses, refreshPackages, refreshHighlights, refreshSettings]);

  useEffect(() => {
    if (!enabled) return;
    refreshAll();
  }, [enabled, refreshAll]);

  useEffect(() => {
    if (!enabled) return;
    refreshPackages();
  }, [enabled, refreshPackages, role]);

  useEffect(() => {
    if (!enabled) return;

    let timer: any = null;
    const runPolling = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const tasks: Array<Promise<void>> = [
        refreshClassTypes(),
        refreshClasses(),
        refreshAvailability(),
        refreshHighlights(),
        refreshSettings()
      ];
      if (role === 'coach' || role === 'admin') {
        tasks.push(refreshPackages());
      }
      await Promise.all(tasks);
    };

    const startPolling = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(runPolling, pollIntervalMs);
    };

    startPolling();

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        runPolling();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [enabled, pollIntervalMs, refreshAvailability, refreshClassTypes, refreshClasses, refreshPackages, refreshHighlights, refreshSettings, role]);

  const value = useMemo(
    () => ({
      classTypes,
      classes,
      availability,
      packages,
      highlights,
      systemSettings,
      classTypesLoading,
      classesLoading,
      availabilityLoading,
      packagesLoading,
      highlightsLoading,
      settingsLoading,
      refreshClassTypes,
      refreshClasses,
      refreshAvailability,
      refreshPackages,
      refreshHighlights,
      refreshSettings,
      refreshAll
    }),
    [
      classTypes,
      classes,
      availability,
      packages,
      highlights,
      systemSettings,
      classTypesLoading,
      classesLoading,
      availabilityLoading,
      packagesLoading,
      highlightsLoading,
      settingsLoading,
      refreshClassTypes,
      refreshClasses,
      refreshAvailability,
      refreshPackages,
      refreshHighlights,
      refreshSettings,
      refreshAll
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};
