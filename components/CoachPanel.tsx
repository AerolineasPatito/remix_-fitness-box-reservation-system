import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClassType, Profile, ClassInstance, AvailabilityState } from '../types.ts';
import { api, logger } from '../lib/api.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { CoachAnalytics } from './CoachAnalytics.tsx';
import { CoachBusinessPanel } from './CoachBusinessPanel.tsx';
import { ClassCalendar } from './ClassCalendar.tsx';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';

interface CoachPanelProps {
  user: Profile;
  instances: ClassInstance[];
  availability: AvailabilityState;
  onRefresh: () => Promise<void> | void;
  onRefreshStudents: () => Promise<void> | void;
}

declare var flatpickr: any;

const CLASS_METADATA: Record<ClassType, { icon: string, color: string }> = {
  [ClassType.FUNCTIONAL]: { icon: 'fa-bolt', color: 'bg-amber-500' },
  [ClassType.SCULPT_STRENGTH]: { icon: 'fa-dumbbell', color: 'bg-brand' },
  [ClassType.HIIT_CONDITIONING]: { icon: 'fa-heartbeat', color: 'bg-rose-500' },
  [ClassType.LOWER_BODY_SCULPT]: { icon: 'fa-shoe-prints', color: 'bg-indigo-500' },
  [ClassType.FULL_BODY]: { icon: 'fa-user-check', color: 'bg-emerald-500' }
};

const DEFAULT_CLASS_META = { icon: 'fa-dumbbell', color: 'bg-zinc-500' };
const getClassMeta = (type: string) => (CLASS_METADATA as Record<string, { icon: string; color: string }>)[type] || DEFAULT_CLASS_META;
const formatClassDate = (date: string) => {
  const localDate = new Date(`${date}T00:00:00`);
  return localDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};
const ICON_PICKER_OPTIONS = [
  'fa-dumbbell',
  'fa-bolt',
  'fa-heartbeat',
  'fa-fire',
  'fa-running',
  'fa-bicycle',
  'fa-spa',
  'fa-hand-rock',
  'fa-stopwatch',
  'fa-shoe-prints'
];
const COLOR_PICKER_OPTIONS = [
  { value: 'brand', swatch: 'bg-brand' },
  { value: 'rose', swatch: 'bg-rose-500' },
  { value: 'amber', swatch: 'bg-amber-500' },
  { value: 'emerald', swatch: 'bg-emerald-500' },
  { value: 'indigo', swatch: 'bg-indigo-500' },
  { value: 'cyan', swatch: 'bg-cyan-500' },
  { value: 'purple', swatch: 'bg-purple-500' },
  { value: 'zinc', swatch: 'bg-zinc-800' }
];
const getColorSwatchClass = (theme?: string) => {
  const found = COLOR_PICKER_OPTIONS.find((c) => c.value === theme || c.swatch === theme);
  return found?.swatch || 'bg-zinc-800';
};

export const CoachPanel: React.FC<CoachPanelProps> = ({ user, instances, availability, onRefresh, onRefreshStudents }) => {
  const normalizeIntegerInput = (raw: string, fallback: number, min = 1, max?: number) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min) return min;
    if (typeof max === 'number' && parsed > max) return max;
    return parsed;
  };
  const bumpIntegerInput = (
    value: string,
    fallback: number,
    delta: number,
    setValue: (next: string) => void,
    min = 1,
    max?: number
  ) => {
    const base = normalizeIntegerInput(value, fallback, min, max);
    let next = base + delta;
    if (next < min) next = min;
    if (typeof max === 'number' && next > max) next = max;
    setValue(String(next));
  };

  const { addNotification, removeNotification } = useNotifications();
  const { classTypes: sharedClassTypes, classTypesLoading, refreshClassTypes, refreshAvailability, refreshClasses } = useAppData();
  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'analytics' | 'business'>('sessions');
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmationNotificationId, setConfirmationNotificationId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearLoading, setYearLoading] = useState(false);
  const [yearInstances, setYearInstances] = useState<ClassInstance[]>([]);
  const [calendarYearInstances, setCalendarYearInstances] = useState<ClassInstance[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarClass, setSelectedCalendarClass] = useState<ClassInstance | null>(null);
  const [classTypes, setClassTypes] = useState<Array<{ id: string; name: string; image_url?: string; icon?: string; color_theme?: string; description?: string; duration?: number }>>([]);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [editingClassTypeId, setEditingClassTypeId] = useState<string | null>(null);
  const [classTypeForm, setClassTypeForm] = useState({
    name: '',
    image_url: '',
    icon: 'fa-dumbbell',
    color_theme: 'brand',
    description: '',
    duration: 60
  });
  
  const datePickerRef = useRef<HTMLInputElement>(null);
  const startTimePickerRef = useRef<HTMLInputElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const [formData, setFormData] = useState({
    type: ClassType.FUNCTIONAL,
    classTypeId: '',
    date: new Date().toISOString().split('T')[0], // Hoy por defecto
    startTime: '07:00',
    endTime: '08:00',
    isEvent: false,
    minCapacity: 1,
    maxCapacity: 8
  });
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    enabled: false,
    recurrenceType: 'weekly' as 'daily' | 'weekly' | 'custom',
    weeks: 4,
    daysOfWeek: [] as number[]
  });
  const [classTypeDurationInput, setClassTypeDurationInput] = useState('60');
  const [minCapacityInput, setMinCapacityInput] = useState('1');
  const [maxCapacityInput, setMaxCapacityInput] = useState('8');
  const [weeksInput, setWeeksInput] = useState('4');
  const [classTypeDurationDrafts, setClassTypeDurationDrafts] = useState<Record<string, string>>({});
  const [uploadingClassTypeImage, setUploadingClassTypeImage] = useState(false);
  const [uploadingClassTypeRowId, setUploadingClassTypeRowId] = useState<string | null>(null);

  const normalizeInstances = (data: any[]): ClassInstance[] =>
    (Array.isArray(data) ? data : []).map((d: any) => ({
      ...d,
      startTime: (d.start_time || d.startTime || '').substring(0, 5),
      endTime: (d.end_time || d.endTime || '').substring(0, 5),
      imageUrl: d.image_url || d.imageUrl || '',
      status: d.status,
      real_time_status: d.real_time_status,
      is_event: Number(d.is_event || d.isEvent || 0),
      min_capacity: Number(d.min_capacity || d.minCapacity || 1),
      max_capacity: Number(d.max_capacity || d.maxCapacity || d.capacity || 0),
      enrolled_count: Number(d.enrolled_count || 0),
      enrolled_students: Array.isArray(d.enrolled_students)
        ? d.enrolled_students
        : typeof d.enrolled_students === 'string'
          ? d.enrolled_students.split('||').filter(Boolean)
          : []
    }));

  useEffect(() => {
    const safeRows = Array.isArray(sharedClassTypes) ? sharedClassTypes : [];
    setClassTypes(safeRows as any[]);
    setClassTypeDurationDrafts({});
  }, [sharedClassTypes]);

  useEffect(() => {
    setClassTypeDurationInput(String(classTypeForm.duration || 60));
  }, [classTypeForm.duration]);

  useEffect(() => {
    setMinCapacityInput(String(formData.minCapacity || 1));
  }, [formData.minCapacity]);

  useEffect(() => {
    setMaxCapacityInput(String(formData.maxCapacity || 8));
  }, [formData.maxCapacity]);

  useEffect(() => {
    setWeeksInput(String(recurrenceConfig.weeks || 4));
  }, [recurrenceConfig.weeks]);

  const classTypeImageById = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(classTypes) ? classTypes : []).forEach((row: any) => {
      const id = String(row?.id || '').trim();
      const image = String(row?.image_url || '').trim();
      if (id && image) map.set(id, image);
    });
    return map;
  }, [classTypes]);

  const classTypeImageByName = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(classTypes) ? classTypes : []).forEach((row: any) => {
      const name = String(row?.name || '').trim().toLowerCase();
      const image = String(row?.image_url || '').trim();
      if (name && image) map.set(name, image);
    });
    return map;
  }, [classTypes]);

  const getLiveClassImage = (inst: any) => {
    const classTypeId = String(inst?.class_type_id || inst?.classTypeId || '').trim();
    const classTypeName = String(inst?.type || '').trim().toLowerCase();
    return (
      (classTypeId ? classTypeImageById.get(classTypeId) : '') ||
      (classTypeName ? classTypeImageByName.get(classTypeName) : '') ||
      String(inst?.imageUrl || '').trim() ||
      ''
    );
  };

  // Validación de horario conflictivo en tiempo real
  const hasScheduleConflict = useMemo(() => {
    return instances.some(inst => 
      inst.date === formData.date && 
      inst.startTime === formData.startTime
    );
  }, [instances, formData.date, formData.startTime]);

  const getConflictInfo = useMemo(() => {
    return instances.find(inst => 
      inst.date === formData.date && 
      inst.startTime === formData.startTime
    );
  }, [instances, formData.date, formData.startTime]);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sessions') refreshClassTypes();
  }, [activeTab, refreshClassTypes]);

  useEffect(() => {
    if (!formData.classTypeId && classTypes.length > 0) {
      setFormData((prev) => ({
        ...prev,
        classTypeId: classTypes[0].id,
        type: classTypes[0].name as ClassType
      }));
    }
  }, [classTypes, formData.classTypeId]);

  useEffect(() => {
    const yearsRaw = (instances || [])
      .map((inst) => Number(String(inst.date || '').slice(0, 4)))
      .filter((year) => Number.isFinite(year));
    const years = Array.from(new Set(yearsRaw)) as number[];
    years.sort((a, b) => Number(b) - Number(a));
    const currentYear = new Date().getFullYear();
    setAvailableYears(years.length ? years : [currentYear]);
    setSelectedYear((prev) => {
      const nextYears = years.length ? years : [currentYear];
      if (prev && nextYears.includes(prev)) return prev;
      return nextYears[0];
    });
  }, [instances]);

  const loadYearClasses = async (year: number) => {
    setYearLoading(true);
    try {
      const data = await api.getClasses(year);
      setYearInstances(normalizeInstances(data || []));
    } catch (err: any) {
      logger.error('Error loading classes by year', err);
      setYearInstances([]);
    } finally {
      setYearLoading(false);
    }
  };

  const loadYearCalendarClasses = async (year: number) => {
    setCalendarLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const data = await api.getCalendarClasses({
        startDate,
        endDate,
        viewerId: user.id
      });

      const normalizedCalendar = (Array.isArray(data) ? data : []).map((row: any) => {
        const participants = Array.isArray(row?.participants) ? row.participants : [];
        const participantNames = participants
          .map((p: any) => String(p?.full_name || '').trim())
          .filter(Boolean);
        return {
          ...row,
          startTime: String(row?.start_time || row?.startTime || '').slice(0, 5),
          endTime: String(row?.end_time || row?.endTime || '').slice(0, 5),
          imageUrl: row?.image_url || row?.imageUrl || '',
          min_capacity: Number(row?.min_capacity ?? 1),
          max_capacity: Number(row?.max_capacity ?? row?.capacity ?? 0),
          capacity: Number(row?.capacity ?? row?.max_capacity ?? 0),
          enrolled_count: Number(row?.reservations_count ?? row?.reserved_count ?? participantNames.length ?? 0),
          enrolled_students: participantNames
        } as ClassInstance;
      });

      setCalendarYearInstances(normalizedCalendar);
    } catch (err: any) {
      logger.error('Error loading calendar classes by year', err);
      setCalendarYearInstances([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  const refreshCoachViews = async (options?: { forceYear?: number }) => {
    await Promise.resolve(onRefresh());
    if (activeTab === 'sessions') {
      await Promise.all([refreshClassTypes(), refreshClasses(), refreshAvailability()]);
      const fallbackYear = new Date().getFullYear();
      const yearToLoad = options?.forceYear || selectedYear || fallbackYear;

      setAvailableYears((prev) => {
        const next = Array.from(new Set([...(Array.isArray(prev) ? prev : []), yearToLoad]));
        next.sort((a, b) => b - a);
        return next;
      });
      setSelectedYear((prev) => prev ?? yearToLoad);

      await loadYearClasses(yearToLoad);
      await loadYearCalendarClasses(yearToLoad);
    }
    if (activeTab === 'students') {
      await Promise.resolve(onRefreshStudents());
      await fetchStudents();
    }
  };

  useEffect(() => {
    if (activeTab !== 'sessions') return;
    if (!selectedYear) return;
    loadYearClasses(selectedYear);
    loadYearCalendarClasses(selectedYear);
  }, [activeTab, selectedYear]);

  useEffect(() => {
    if (activeTab !== 'sessions' || !selectedYear) return;
    const interval = setInterval(() => {
      loadYearCalendarClasses(selectedYear);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab, selectedYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    const touchPoints = (navigator as any)?.maxTouchPoints || 0;
    setIsTouchDevice(Boolean(coarsePointer || touchPoints > 0));
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') {
      if (isTouchDevice) return;
      let datePickerInstance: any = null;
      let timePickerInstance: any = null;
      if (datePickerRef.current) {
        // SIN RESTRICCIONES - Permitir cualquier fecha
        datePickerInstance = flatpickr(datePickerRef.current, {
          locale: 'es', 
          defaultDate: formData.date, 
          dateFormat: 'Y-m-d',
          onChange: (selectedDates: any[]) => {
            const date = selectedDates[0];
            if (date) {
              const dateStr = date.toISOString().split('T')[0];
              setFormData(prev => ({ 
                ...prev, 
                date: dateStr
              }));
            }
          }
        });
        
        datePickerInstance.setDate(formData.date);
      }
      if (startTimePickerRef.current) {
        timePickerInstance = flatpickr(startTimePickerRef.current, {
          locale: 'es',
          enableTime: true,
          noCalendar: true,
          dateFormat: 'h:i K', // 12-hour format with AM/PM
          defaultDate: formData.startTime, // Solo el tiempo, sin fecha
          time_24hr: false, // Enable 12-hour format
          onChange: (selectedDates: any[]) => {
            const date = selectedDates[0];
            if (date) {
              // Convert to 24-hour format for storage
              const start24 = date.toTimeString().slice(0, 5);
              const end = new Date(date.getTime() + 60 * 60 * 1000);
              const end24 = end.toTimeString().slice(0, 5);
              
              setFormData(prev => ({ 
                ...prev, 
                startTime: start24, 
                endTime: end24 
              }));
            }
          }
        });
        
        timePickerInstance.setDate(formData.startTime);
      }
      return () => {
        if (datePickerInstance && typeof datePickerInstance.destroy === 'function') {
          datePickerInstance.destroy();
        }
        if (timePickerInstance && typeof timePickerInstance.destroy === 'function') {
          timePickerInstance.destroy();
        }
      };
    }
  }, [activeTab, formData.date, formData.startTime, isTouchDevice]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getStudents();
      setStudents(data.filter(s => s.role === 'student'));
    } catch (err: any) {
      logger.error('Error fetching students', err);
    } finally {
      setLoading(false);
    }
  };

  const validateImageFile = (file: File) => {
    if (!String(file.type || '').startsWith('image/')) {
      addNotification({
        type: 'warning',
        title: 'Archivo inválido',
        message: 'Selecciona una imagen válida (JPG, PNG, WEBP, etc.).',
        duration: 4500
      });
      return false;
    }
    if (file.size > 8 * 1024 * 1024) {
      addNotification({
        type: 'warning',
        title: 'Archivo demasiado grande',
        message: 'La imagen no puede superar 8 MB.',
        duration: 4500
      });
      return false;
    }
    return true;
  };

  const handleClassTypeImageUpload = async (file: File) => {
    if (!validateImageFile(file)) return;
    setUploadingClassTypeImage(true);
    try {
      const uploaded: any = await api.uploadImage(file);
      const secureUrl = String(uploaded?.secure_url || '').trim();
      if (!secureUrl) throw new Error('No pudimos obtener la URL segura de la imagen.');
      setClassTypeForm((prev) => ({ ...prev, image_url: secureUrl }));
      addNotification({
        type: 'success',
        title: 'Imagen cargada',
        message: 'La imagen se subió correctamente.',
        duration: 2500
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error al subir imagen',
        message: getFriendlyErrorMessage(err, 'No pudimos subir la imagen. Intenta de nuevo.'),
        duration: 6000
      });
    } finally {
      setUploadingClassTypeImage(false);
    }
  };

  const handleClassTypeRowImageUpload = async (classTypeId: string, file: File) => {
    if (!validateImageFile(file)) return;
    setUploadingClassTypeRowId(classTypeId);
    try {
      const uploaded: any = await api.uploadImage(file);
      const secureUrl = String(uploaded?.secure_url || '').trim();
      if (!secureUrl) throw new Error('No pudimos obtener la URL segura de la imagen.');
      setClassTypes((prev) => prev.map((x) => (x.id === classTypeId ? { ...x, image_url: secureUrl } : x)));
      addNotification({
        type: 'success',
        title: 'Imagen cargada',
        message: 'La imagen se subió correctamente.',
        duration: 2500
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error al subir imagen',
        message: getFriendlyErrorMessage(err, 'No pudimos subir la imagen. Intenta de nuevo.'),
        duration: 6000
      });
    } finally {
      setUploadingClassTypeRowId(null);
    }
  };

  const handleCreateClassType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTypeForm.name.trim()) return;
    try {
      const normalizedDuration = normalizeIntegerInput(classTypeDurationInput, Number(classTypeForm.duration || 60), 15);
      await api.createClassType({
        name: classTypeForm.name.trim(),
        image_url: classTypeForm.image_url.trim() || null,
        icon: classTypeForm.icon.trim() || null,
        color_theme: classTypeForm.color_theme.trim() || null,
        description: classTypeForm.description.trim() || null,
        duration: normalizedDuration
      });
      setClassTypeForm({ name: '', image_url: '', icon: 'fa-dumbbell', color_theme: 'brand', description: '', duration: 60 });
      setClassTypeDurationInput('60');
      await Promise.all([refreshClassTypes(), refreshClasses()]);
    } catch (err: any) {
      logger.error('Error creating class type', err);
    }
  };

  const handleUpdateClassType = async (id: string) => {
    const row = classTypes.find((t) => t.id === id);
    if (!row) return;
    try {
      const durationDraft = classTypeDurationDrafts[id];
      const normalizedDuration = normalizeIntegerInput(durationDraft ?? String(row.duration || 60), Number(row.duration || 60), 15);
      const payload = { ...row, duration: normalizedDuration };
      await api.updateClassType(id, payload);
      setClassTypes((prev) => prev.map((x) => (x.id === id ? { ...x, duration: normalizedDuration } : x)));
      setClassTypeDurationDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingClassTypeId(null);
      await Promise.all([refreshClassTypes(), refreshClasses()]);
    } catch (err: any) {
      logger.error('Error updating class type', err);
    }
  };

  const handleDeleteClassType = async (id: string) => {
    try {
      await api.deleteClassType(id);
      if (formData.classTypeId === id) {
        setFormData((prev) => ({ ...prev, classTypeId: '' }));
      }
      await Promise.all([refreshClassTypes(), refreshClasses()]);
    } catch (err: any) {
      logger.error('Error deleting class type', err);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedMinCapacity = normalizeIntegerInput(minCapacityInput, Number(formData.minCapacity || 1), 1);
    const normalizedMaxCapacity = normalizeIntegerInput(maxCapacityInput, Number(formData.maxCapacity || 8), normalizedMinCapacity);
    const normalizedWeeks = normalizeIntegerInput(weeksInput, Number(recurrenceConfig.weeks || 4), 1, 24);

    if (
      normalizedMinCapacity !== Number(formData.minCapacity) ||
      normalizedMaxCapacity !== Number(formData.maxCapacity)
    ) {
      setFormData((prev) => ({
        ...prev,
        minCapacity: normalizedMinCapacity,
        maxCapacity: normalizedMaxCapacity
      }));
    }
    if (normalizedWeeks !== Number(recurrenceConfig.weeks)) {
      setRecurrenceConfig((prev) => ({ ...prev, weeks: normalizedWeeks }));
    }

    if (normalizedMinCapacity < 1 || normalizedMaxCapacity < 1 || normalizedMinCapacity > normalizedMaxCapacity) {
      addNotification({
        type: 'warning',
        title: 'Capacidades inválidas',
        message: 'El mínimo debe ser mayor a 0 y no puede ser mayor al máximo.',
        duration: 5000
      });
      return;
    }
    
    // VALIDACIÓN DE HORARIOS CONFLICTIVOS
    const conflictingClass = instances.find(inst => 
      inst.date === formData.date && 
      inst.startTime === formData.startTime
    );
    
    if (conflictingClass) {
      addNotification({
        type: 'error',
        title: '⚠️ Conflicto de Horario',
        message: `Ya existe una clase de ${conflictingClass.type} programada para ${formData.startTime} - ${formData.endTime}`,
        details: {
          fecha: new Date(formData.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          hora: `${formData.startTime} - ${formData.endTime}`,
          clase_existente: conflictingClass.type,
          nueva_clase: formData.type
        },
        duration: 6000
      });
      return;
    }
    
    // Show confirmation notification
    const classDate = new Date(formData.date + 'T00:00:00').toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const classTime = new Date(`${formData.date}T${formData.startTime}`).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Store confirmation notification ID to close it later
    const notificationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setConfirmationNotificationId(notificationId);
    
    addNotification({
      id: notificationId,
      type: 'info',
      title: 'Confirmar Creación de Clase',
      message: `¿Estás seguro de que quieres crear esta clase?`,
      details: {
        clase: formData.type,
        fecha: classDate,
        horario: `${classTime} (${formData.startTime} - ${formData.endTime})`,
        minimo_de_alumnos: normalizedMinCapacity,
        maximo_de_alumnos: normalizedMaxCapacity,
        tipo_de_recurrencia: recurrenceConfig.enabled
          ? (recurrenceConfig.recurrenceType === 'daily'
              ? 'Diaria'
              : recurrenceConfig.recurrenceType === 'weekly'
                ? 'Semanal'
                : 'Personalizada')
          : '',
        duracion_de_la_programacion_semanas: recurrenceConfig.enabled ? normalizedWeeks : '',
        dias_de_repeticion: recurrenceConfig.enabled
          ? (recurrenceConfig.recurrenceType === 'daily'
              ? 'Todos los días'
              : recurrenceConfig.daysOfWeek.length > 0
                ? recurrenceConfig.daysOfWeek
                    .sort((a, b) => a - b)
                    .map((d) => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d])
                    .join(', ')
                : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(`${formData.date}T00:00:00`).getDay()])
          : ''
      },
      suggestions: [
        'Verifica que la fecha y hora sean correctas',
        'Asegúrate de tener disponibilidad para impartir la clase'
      ],
      duration: 0, // No auto-dismiss
      actions: [
        {
          label: 'Confirmar y Crear',
          onClick: () => {
            removeNotification(notificationId);
            setConfirmationNotificationId(null);
            createClass();
          },
          variant: 'primary'
        },
        {
          label: 'Cancelar',
          onClick: () => {
            removeNotification(notificationId);
            setConfirmationNotificationId(null);
            addNotification({
              type: 'info',
              title: 'Creación cancelada',
              message: 'No se guardaron cambios en la cartelera.',
              duration: 4000
            });
          },
          variant: 'secondary'
        }
      ]
    });
  };

  const createClass = async () => {
    setLoading(true);
    const normalizedMinCapacity = normalizeIntegerInput(minCapacityInput, Number(formData.minCapacity || 1), 1);
    const normalizedMaxCapacity = normalizeIntegerInput(maxCapacityInput, Number(formData.maxCapacity || 8), normalizedMinCapacity);
    const normalizedWeeks = normalizeIntegerInput(weeksInput, Number(recurrenceConfig.weeks || 4), 1, 24);

    try {
      if (recurrenceConfig.enabled) {
        await api.createRecurringClasses({
          class_type_id: formData.classTypeId,
          start_date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          is_event: formData.isEvent ? 1 : 0,
          min_capacity: normalizedMinCapacity,
          max_capacity: normalizedMaxCapacity,
          created_by: user.id,
          recurrence_type: recurrenceConfig.recurrenceType,
          weeks: normalizedWeeks,
          days_of_week: recurrenceConfig.recurrenceType === 'custom'
            ? recurrenceConfig.daysOfWeek
            : recurrenceConfig.recurrenceType === 'weekly'
              ? (recurrenceConfig.daysOfWeek.length ? recurrenceConfig.daysOfWeek : [new Date(`${formData.date}T00:00:00`).getDay()])
              : []
        });
      } else {
        await api.createClass({
          type: formData.type,
          class_type_id: formData.classTypeId,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          is_event: formData.isEvent ? 1 : 0,
          min_capacity: normalizedMinCapacity,
          max_capacity: normalizedMaxCapacity,
          capacity: normalizedMaxCapacity,
          created_by: user.id
        });
      }
      
      // Reset form
      setFormData({
        type: ClassType.FUNCTIONAL,
        classTypeId: classTypes[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        startTime: '07:00',
        endTime: '08:00',
        isEvent: false,
        minCapacity: 1,
        maxCapacity: 8
      });
      setRecurrenceConfig({
        enabled: false,
        recurrenceType: 'weekly',
        weeks: 4,
        daysOfWeek: []
      });
      setMinCapacityInput('1');
      setMaxCapacityInput('8');
      setWeeksInput('4');
      
      const createdYear = Number(String(formData.date || '').slice(0, 4)) || new Date().getFullYear();
      await refreshCoachViews({ forceYear: createdYear });
      
      addNotification({
        type: 'success',
        title: 'Clase Creada Exitosamente',
        message: recurrenceConfig.enabled
          ? `Se publicó la programación recurrente de ${formData.type}.`
          : `La clase de ${formData.type} ha sido creada y publicada.`,
        details: {
          date: new Date(formData.date).toLocaleDateString('es-ES'),
          time: formData.startTime
        },
        duration: 5000
      });
      
    } catch (err: any) {
      logger.error('Error adding class', err);
      addNotification({
        type: 'error',
        title: 'No pudimos crear la clase',
        message: getFriendlyErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClass = async () => {
    if (!deletingId) return;
    try {
      await api.cancelClass(deletingId, user.id);
      const removedId = deletingId;
      setDeletingId(null);
      const canceledClass = yearInstances.find((inst) => inst.id === deletingId) || instances.find((inst) => inst.id === deletingId);
      const canceledYear = Number(String(canceledClass?.date || '').slice(0, 4)) || selectedYear || new Date().getFullYear();
      await refreshCoachViews({ forceYear: canceledYear });
      setYearInstances((prev) => prev.filter((inst) => inst.id !== removedId));
      
      addNotification({
        type: 'success',
        title: 'Clase Cancelada',
        message: 'La clase ha sido cancelada exitosamente.',
        duration: 5000
      });
    } catch (err: any) {
      logger.error('Error canceling class', err);
      addNotification({
        type: 'error',
        title: 'Error al Cancelar Clase',
        message: 'No se pudo cancelar la clase. Por favor intenta nuevamente.',
        duration: 6000
      });
    }
  };

  const updateCredits = async (studentId: string, currentCredits: number, amount: number) => {
    setUpdatingStudentId(`${studentId}_${amount}`);
    try {
      await api.coach.adjustStudentCredits(studentId, { amount, reason: 'Ajuste manual' });
      await Promise.resolve(onRefreshStudents());
      await fetchStudents();
    } catch (err) {
      logger.error('Error actualizando créditos', err);
      addNotification({
        type: 'error',
        title: 'No pudimos actualizar créditos',
        message: getFriendlyErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
        duration: 4500
      });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px]">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-white border-b border-zinc-100 p-4 sm:p-6 lg:p-8 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-none">COACH <span className="text-brand">PANEL</span></h2>
              <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">Gestión de clases y comunidad</p>
            </div>
            {/* Mobile Tab Selector - Mejorado */}
            <div className="lg:hidden">
              <div className="grid grid-cols-4 gap-2 bg-zinc-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('sessions')} 
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'sessions' 
                      ? 'bg-white text-brand shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Cartelera
                </button>
                <button 
                  onClick={() => setActiveTab('students')} 
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'students' 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Comunidad
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')} 
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'analytics' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Datos
                </button>
                <button 
                  onClick={() => setActiveTab('business')} 
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'business' 
                      ? 'bg-brand text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Negocio
                </button>
              </div>
            </div>
            {/* Desktop Tab Navigation */}
            <div className="hidden lg:flex bg-white p-2 rounded-[2rem] border border-zinc-200 shadow-sm">
              <button onClick={() => setActiveTab('sessions')} className={`px-6 sm:px-8 lg:px-12 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sessions' ? 'bg-white text-brand shadow-xl' : 'text-zinc-400 hover:text-zinc-600'}`}>Cartelera</button>
              <button onClick={() => setActiveTab('students')} className={`px-6 sm:px-8 lg:px-12 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:text-zinc-600'}`}>Comunidad</button>
              <button onClick={() => setActiveTab('analytics')} className={`px-6 sm:px-8 lg:px-12 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-xl' : 'text-zinc-400 hover:text-zinc-600'}`}>Analiticas</button>
              <button onClick={() => setActiveTab('business')} className={`px-6 sm:px-8 lg:px-12 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'business' ? 'bg-brand text-white shadow-xl' : 'text-zinc-400 hover:text-zinc-600'}`}>Negocio</button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area con Scroll Independiente */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Cancel Confirmation Modal */}
        {deletingId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-md" onClick={() => setDeletingId(null)}></div>
            <div className="relative bg-white w-full max-w-md sm:max-w-xl rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in">
              <div className="bg-amber-500 p-6 sm:p-10 text-white flex flex-col items-center text-center">
                <i className="fas fa-exclamation-triangle text-3xl sm:text-4xl mb-4 sm:mb-6"></i>
                <h3 className="text-2xl sm:text-4xl font-bebas tracking-wide uppercase italic">¿Cancelar Clase?</h3>
                <p className="mt-2 text-sm opacity-90">La clase se marcará como cancelada</p>
              </div>
              <div className="p-6 sm:p-12 flex space-x-3 sm:space-x-4">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-4 sm:py-5 bg-zinc-100 text-zinc-400 font-black rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-widest">No, Volver</button>
                <button onClick={handleCancelClass} className="flex-1 py-4 sm:py-5 bg-amber-600 text-white font-black rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200">Sí, Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {selectedCalendarClass && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-zinc-900/75"
              onClick={() => setSelectedCalendarClass(null)}
            />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl border border-zinc-100 p-6 sm:p-8 shadow-2xl">
              <h3 className="text-3xl font-bebas tracking-wide uppercase italic text-zinc-900">Detalle de Clase</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-600">
                <p><span className="font-black text-zinc-900">Clase:</span> {selectedCalendarClass.type}</p>
                <p><span className="font-black text-zinc-900">Fecha:</span> {new Date(`${selectedCalendarClass.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p><span className="font-black text-zinc-900">Horario:</span> {selectedCalendarClass.startTime} - {selectedCalendarClass.endTime}</p>
                <p><span className="font-black text-zinc-900">Cupo:</span> {Number(availability[selectedCalendarClass.id] || selectedCalendarClass.enrolled_count || 0)}/{Number(selectedCalendarClass.max_capacity || selectedCalendarClass.capacity || 0)}</p>
                <p><span className="font-black text-zinc-900">Mínimo requerido:</span> {Number(selectedCalendarClass.min_capacity || 1)}</p>
                <p><span className="font-black text-zinc-900">Tipo:</span> {Number((selectedCalendarClass as any).is_event || 0) === 1 ? 'Evento gratis' : 'Clase regular'}</p>
                <p><span className="font-black text-zinc-900">Estado:</span> {selectedCalendarClass.status || selectedCalendarClass.real_time_status || 'scheduled'}</p>
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Alumnos inscritos</p>
                {(selectedCalendarClass.enrolled_students || []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedCalendarClass.enrolled_students || []).map((studentName, idx) => (
                      <span key={`${studentName}_${idx}`} className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold">
                        {studentName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">Aún no hay alumnos inscritos para esta clase.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCalendarClass(null)}
                className="mt-6 w-full py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {showTypeManager && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-zinc-900/80" onClick={() => setShowTypeManager(false)}></div>
            <div className="relative bg-white w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bebas tracking-wide uppercase italic">Gestionar Tipos de Entrenamiento</h3>
                <button
                  type="button"
                  onClick={() => setShowTypeManager(false)}
                  className="w-9 h-9 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleCreateClassType} className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={classTypeForm.name}
                      onChange={(e) => setClassTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del tipo"
                      className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm"
                    />
                    <label className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm flex items-center justify-between gap-3 cursor-pointer">
                      <span className="text-zinc-600 font-semibold text-xs sm:text-sm">
                        {uploadingClassTypeImage
                          ? 'Subiendo imagen...'
                          : classTypeForm.image_url
                            ? 'Imagen seleccionada'
                            : 'Subir imagen'}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-white border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        Archivo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingClassTypeImage}
                        onChange={async (e) => {
                          const inputEl = e.currentTarget;
                          const file = e.target.files?.[0];
                          if (file) await handleClassTypeImageUpload(file);
                          inputEl.value = '';
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Icono</p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {ICON_PICKER_OPTIONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setClassTypeForm((prev) => ({ ...prev, icon: iconName }))}
                          className={`h-10 rounded-lg border flex items-center justify-center transition-all ${
                            classTypeForm.icon === iconName
                              ? 'border-brand bg-brand/10 text-brand shadow-md'
                              : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                          }`}
                          title={iconName}
                        >
                          <i className={`fas ${iconName}`}></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Color</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {COLOR_PICKER_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setClassTypeForm((prev) => ({ ...prev, color_theme: color.value }))}
                          className={`w-8 h-8 rounded-full ${color.swatch} ${
                            classTypeForm.color_theme === color.value ? 'ring-2 ring-offset-2 ring-zinc-900' : 'ring-1 ring-zinc-200'
                          } flex items-center justify-center`}
                          title={color.value}
                        >
                          {classTypeForm.color_theme === color.value && <i className="fas fa-check text-[10px] text-white"></i>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={classTypeForm.description}
                    onChange={(e) => setClassTypeForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción de la clase"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm min-h-[80px]"
                  />

                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Duración</label>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 text-zinc-500 flex items-center justify-center">
                        <i className="fas fa-clock"></i>
                      </div>
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(classTypeDurationInput, Number(classTypeForm.duration || 60), -1, setClassTypeDurationInput, 15)}
                        className="ml-3 w-11 min-h-[44px] rounded-lg border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Reducir duración"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={15}
                        step={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={classTypeDurationInput}
                        onChange={(e) => setClassTypeDurationInput(e.target.value)}
                        onBlur={() => {
                          const normalized = normalizeIntegerInput(classTypeDurationInput, Number(classTypeForm.duration || 60), 15);
                          setClassTypeForm((prev) => ({ ...prev, duration: normalized }));
                          setClassTypeDurationInput(String(normalized));
                        }}
                        className="ml-2 flex-1 bg-white border border-zinc-200 rounded-lg p-2 text-sm font-semibold min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(classTypeDurationInput, Number(classTypeForm.duration || 60), 1, setClassTypeDurationInput, 15)}
                        className="ml-2 w-11 min-h-[44px] rounded-lg border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Aumentar duración"
                      >
                        +
                      </button>
                      <span className="ml-3 text-xs font-black uppercase tracking-widest text-zinc-500">Minutos</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingClassTypeImage}
                    className="w-full bg-zinc-900 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-60"
                  >
                    {uploadingClassTypeImage ? 'Subiendo Imagen...' : 'Guardar Tipo'}
                  </button>
                </form>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 h-fit">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Previsualización</p>
                  <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    {classTypeForm.image_url ? (
                      <img
                        src={classTypeForm.image_url}
                        alt={classTypeForm.name || 'preview'}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div className="w-full h-28 bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <i className="fas fa-image text-2xl"></i>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${getColorSwatchClass(classTypeForm.color_theme)} text-white flex items-center justify-center`}>
                          <i className={`fas ${classTypeForm.icon || 'fa-dumbbell'}`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 uppercase leading-tight">
                            {classTypeForm.name || 'Nombre de clase'}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                            {Number(classTypeForm.duration || 60)} Minutos
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {classTypeForm.description || 'Descripción de la clase para que el coach visualice el resultado final.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-auto">
                {classTypes.map((row) => (
                  <div key={row.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-zinc-100 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      {row.image_url ? (
                        <img src={row.image_url} alt={row.name} className="w-12 h-12 rounded-lg object-cover border border-zinc-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                          <i className={`fas ${row.icon || 'fa-dumbbell'} text-zinc-500`}></i>
                        </div>
                      )}
                      <div>
                        <input
                          value={row.name}
                          disabled={editingClassTypeId !== row.id}
                          onChange={(e) => setClassTypes((prev) => prev.map((x) => x.id === row.id ? { ...x, name: e.target.value } : x))}
                          className={`text-sm font-bold rounded px-2 py-1 ${editingClassTypeId === row.id ? 'bg-zinc-50 border border-zinc-200' : 'bg-transparent'}`}
                        />
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400">{row.color_theme || 'default'}</p>
                        {editingClassTypeId === row.id && (
                          <div className="mt-2 space-y-3">
                            <label className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-2 min-h-[44px] flex items-center justify-between gap-2 cursor-pointer">
                              <span className="font-semibold text-zinc-600">
                                {uploadingClassTypeRowId === row.id
                                  ? 'Subiendo imagen...'
                                  : row.image_url
                                    ? 'Imagen cargada'
                                    : 'Subir imagen'}
                              </span>
                              <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                Archivo
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingClassTypeRowId === row.id}
                                onChange={async (e) => {
                                  const inputEl = e.currentTarget;
                                  const file = e.target.files?.[0];
                                  if (file) await handleClassTypeRowImageUpload(row.id, file);
                                  inputEl.value = '';
                                }}
                                className="sr-only"
                              />
                            </label>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Icono</p>
                              <div className="grid grid-cols-5 gap-1">
                                {ICON_PICKER_OPTIONS.map((iconName) => (
                                  <button
                                    key={`${row.id}_${iconName}`}
                                    type="button"
                                    onClick={() => setClassTypes((prev) => prev.map((x) => x.id === row.id ? { ...x, icon: iconName } : x))}
                                    className={`h-8 rounded border flex items-center justify-center ${
                                      (row.icon || 'fa-dumbbell') === iconName
                                        ? 'border-brand bg-brand/10 text-brand'
                                        : 'border-zinc-200 bg-white text-zinc-500'
                                    }`}
                                  >
                                    <i className={`fas ${iconName} text-xs`}></i>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Color</p>
                              <div className="flex flex-wrap gap-2">
                                {COLOR_PICKER_OPTIONS.map((color) => (
                                  <button
                                    key={`${row.id}_${color.value}`}
                                    type="button"
                                    onClick={() => setClassTypes((prev) => prev.map((x) => x.id === row.id ? { ...x, color_theme: color.value } : x))}
                                    className={`w-6 h-6 rounded-full ${color.swatch} ${
                                      (row.color_theme || 'brand') === color.value ? 'ring-2 ring-offset-2 ring-zinc-900' : 'ring-1 ring-zinc-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <input
                              value={row.description || ''}
                              onChange={(e) => setClassTypes((prev) => prev.map((x) => x.id === row.id ? { ...x, description: e.target.value } : x))}
                              placeholder="Descripción"
                              className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1 min-h-[44px]"
                            />
                            <input
                              type="number"
                              min={15}
                              step={1}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={classTypeDurationDrafts[row.id] ?? String(row.duration || 60)}
                              onChange={(e) => setClassTypeDurationDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                              onBlur={() => {
                                const normalized = normalizeIntegerInput(
                                  classTypeDurationDrafts[row.id] ?? String(row.duration || 60),
                                  Number(row.duration || 60),
                                  15
                                );
                                setClassTypeDurationDrafts((prev) => ({ ...prev, [row.id]: String(normalized) }));
                                setClassTypes((prev) => prev.map((x) => x.id === row.id ? { ...x, duration: normalized } : x));
                              }}
                              placeholder="Duración"
                              className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {editingClassTypeId === row.id ? (
                        <button
                          type="button"
                          disabled={uploadingClassTypeRowId === row.id}
                          onClick={() => handleUpdateClassType(row.id)}
                          className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-brand text-white disabled:opacity-60"
                        >
                          {uploadingClassTypeRowId === row.id ? 'Subiendo...' : 'Guardar'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setClassTypeDurationDrafts((prev) => ({ ...prev, [row.id]: String(row.duration || 60) }));
                            setEditingClassTypeId(row.id);
                          }}
                          className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-700"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteClassType(row.id)}
                        className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {classTypes.length === 0 && <p className="text-sm text-zinc-400">No hay tipos registrados.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {/* Content Tabs con Scroll Optimizado */}
        {activeTab === 'sessions' ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Formulario de Creación - Mobile Optimizado */}
            <div className="bg-white border-2 border-zinc-50 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 lg:p-8 shadow-xl">
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl sm:text-3xl font-bebas text-zinc-900 tracking-wide uppercase italic">Crear Nueva Clase</h3>
                  <button
                    type="button"
                    onClick={() => setShowTypeManager(true)}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl bg-zinc-900 text-white hover:bg-brand transition-all"
                  >
                    Gestionar Tipos
                  </button>
                </div>
                <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">Programa una nueva sesión</p>
              </div>
              
              <form onSubmit={handleAddClass} className="space-y-4 sm:space-y-6">
                {/* Tipo de Clase - Mobile Grid */}
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Tipo de Entrenamiento</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                    {classTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, classTypeId: t.id, type: t.name as ClassType }))}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                          formData.classTypeId === t.id
                            ? 'border-brand bg-brand/5 text-brand shadow-lg' 
                            : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
                        }`}
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 mx-auto ${formData.classTypeId === t.id ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          <i className={`fas ${t.icon || 'fa-dumbbell'} text-xs sm:text-sm`}></i>
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tight block text-center leading-tight">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  {classTypesLoading && <p className="text-[9px] text-zinc-400 mt-2">Cargando tipos...</p>}
                </div>
                
                {/* Fecha y Hora - Mobile Stacked */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Fecha</label>
                    {isTouchDevice ? (
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all"
                      />
                    ) : (
                      <input ref={datePickerRef} readOnly type="text" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bebas text-zinc-900 text-center outline-none focus:border-brand transition-all" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Horario</label>
                    {isTouchDevice ? (
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => {
                          const start = e.target.value;
                          const [hours, minutes] = start.split(':').map(Number);
                          const endDate = new Date();
                          endDate.setHours(hours || 0, minutes || 0, 0, 0);
                          endDate.setMinutes(endDate.getMinutes() + 60);
                          const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                          setFormData((prev) => ({ ...prev, startTime: start, endTime: end }));
                        }}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all"
                      />
                    ) : (
                      <input ref={startTimePickerRef} readOnly type="text" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Mínimo de Alumnos</label>
                    <div className="flex items-stretch gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(minCapacityInput, Number(formData.minCapacity || 1), -1, setMinCapacityInput, 1, Number(formData.maxCapacity || 8))}
                        className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Reducir minimo de alumnos"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        max={formData.maxCapacity}
                        value={minCapacityInput}
                        onChange={(e) => setMinCapacityInput(e.target.value)}
                        onBlur={() => {
                          const maxCapacity = Number(formData.maxCapacity || 8);
                          const normalized = normalizeIntegerInput(minCapacityInput, Number(formData.minCapacity || 1), 1, maxCapacity);
                          const adjusted = Math.min(normalized, maxCapacity);
                          setFormData(prev => ({ ...prev, minCapacity: adjusted }));
                          setMinCapacityInput(String(adjusted));
                        }}
                        className="flex-1 min-w-0 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(minCapacityInput, Number(formData.minCapacity || 1), 1, setMinCapacityInput, 1, Number(formData.maxCapacity || 8))}
                        className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Aumentar minimo de alumnos"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Máximo de Alumnos</label>
                    <div className="flex items-stretch gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(maxCapacityInput, Number(formData.maxCapacity || 8), -1, setMaxCapacityInput, Number(formData.minCapacity || 1))}
                        className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Reducir maximo de alumnos"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={maxCapacityInput}
                        onChange={(e) => setMaxCapacityInput(e.target.value)}
                        onBlur={() => {
                          const minCapacity = Number(formData.minCapacity || 1);
                          const normalized = normalizeIntegerInput(maxCapacityInput, Number(formData.maxCapacity || 8), minCapacity);
                          const adjusted = Math.max(normalized, minCapacity);
                          setFormData(prev => ({ ...prev, maxCapacity: adjusted }));
                          setMaxCapacityInput(String(adjusted));
                        }}
                        className="flex-1 min-w-0 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => bumpIntegerInput(maxCapacityInput, Number(formData.maxCapacity || 8), 1, setMaxCapacityInput, Number(formData.minCapacity || 1))}
                        className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                        aria-label="Aumentar maximo de alumnos"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isEvent)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isEvent: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-zinc-900"
                  />
                  <span className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-800">Clase tipo evento (gratis)</span>
                    <span className="block text-xs text-zinc-500">Permite reserva sin créditos y no aplica descuento/reembolso de créditos.</span>
                  </span>
                </label>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:p-5 space-y-4">
                  <label className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-700">
                    <input
                      type="checkbox"
                      checked={recurrenceConfig.enabled}
                      onChange={(e) => setRecurrenceConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-zinc-900"
                    />
                    Programación recurrente
                  </label>

                  {recurrenceConfig.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo de recurrencia</label>
                          <select
                            value={recurrenceConfig.recurrenceType}
                            onChange={(e) => setRecurrenceConfig((prev) => ({ ...prev, recurrenceType: e.target.value as any }))}
                            className="w-full border border-zinc-200 rounded-xl p-3 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-900"
                          >
                            <option value="weekly">Semanal</option>
                            <option value="daily">Diaria</option>
                            <option value="custom">Personalizada</option>
                          </select>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Duración de la programación (semanas)</label>
                          <div className="flex items-stretch gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => bumpIntegerInput(weeksInput, Number(recurrenceConfig.weeks || 4), -1, setWeeksInput, 1, 24)}
                              className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                              aria-label="Reducir semanas"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              step={1}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={weeksInput}
                              onChange={(e) => setWeeksInput(e.target.value)}
                              onBlur={() => {
                                const normalized = normalizeIntegerInput(weeksInput, Number(recurrenceConfig.weeks || 4), 1, 24);
                                setRecurrenceConfig((prev) => ({ ...prev, weeks: normalized }));
                                setWeeksInput(String(normalized));
                              }}
                              className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-900 min-h-[44px]"
                              placeholder="Ejemplo: 4"
                            />
                            <button
                              type="button"
                              onClick={() => bumpIntegerInput(weeksInput, Number(recurrenceConfig.weeks || 4), 1, setWeeksInput, 1, 24)}
                              className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                              aria-label="Aumentar semanas"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-[10px] font-semibold text-zinc-500">Define cuántas semanas estará activa esta recurrencia.</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Días de repetición</p>
                          {recurrenceConfig.recurrenceType === 'daily' && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Modo diario activo</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((label, idx) => {
                            const selected = recurrenceConfig.daysOfWeek.includes(idx);
                            const disabled = recurrenceConfig.recurrenceType === 'daily';
                            return (
                              <button
                                key={label}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  setRecurrenceConfig((prev) => ({
                                    ...prev,
                                    daysOfWeek: prev.daysOfWeek.includes(idx)
                                      ? prev.daysOfWeek.filter((d) => d !== idx)
                                      : [...prev.daysOfWeek, idx]
                                  }));
                                }}
                                className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  selected
                                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          En recurrencia semanal se toma por defecto el día seleccionado en la fecha inicial, si no marcas días manualmente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advertencia de Conflicto de Horario */}
                {hasScheduleConflict && getConflictInfo && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in fade-in duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-exclamation-triangle text-white text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-wider mb-1">Conflicto de Horario</h4>
                        <p className="text-xs text-rose-700 font-medium leading-relaxed">
                          Ya existe una clase de <span className="font-black text-rose-900">{getConflictInfo.type}</span> programada para las <span className="font-black text-rose-900">{getConflictInfo.startTime}</span>
                        </p>
                        <p className="text-[10px] text-rose-600 mt-2">
                          Selecciona otro horario o fecha para continuar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <button 
                  disabled={loading || hasScheduleConflict || !formData.classTypeId} 
                  className={`w-full py-4 sm:py-6 font-black rounded-xl sm:rounded-[2rem] text-[9px] sm:text-[12px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all ${
                    hasScheduleConflict 
                      ? 'bg-rose-100 text-rose-300 cursor-not-allowed' 
                      : 'bg-zinc-900 hover:bg-brand text-white'
                  }`}
                >
                  {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 
                   hasScheduleConflict ? '⚠️ Horario Ocupado' : '🚀 Publicar Clase'}
                </button>
              </form>
            </div>

            {/* Lista de Clases - Mobile Optimizado */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl sm:text-2xl font-bebas text-zinc-900 tracking-wide uppercase italic">Clases Activas</h3>
                  <span className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-lg">
                    {yearInstances.length} clases
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        selectedYear === year
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {yearLoading && (
                  <div className="text-center py-10">
                    <i className="fas fa-circle-notch text-2xl text-brand animate-spin"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-3">Cargando clases del año {selectedYear}</p>
                  </div>
                )}

                {!yearLoading && yearInstances.map(inst => {
                  const liveImage = getLiveClassImage(inst);
                  return (
                  <div key={inst.id} className="bg-white border border-zinc-100 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] hover:border-brand transition-all hover:shadow-lg">
                    {liveImage && (
                      <img
                        src={liveImage}
                        alt={inst.type}
                        className="w-full h-32 sm:h-40 object-cover rounded-xl mb-4 border border-zinc-100"
                      />
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-white ${getClassMeta(inst.type).color} shadow-lg flex-shrink-0`}>
                           <span className="text-[10px] sm:text-xs font-black leading-tight text-center px-1">{formatClassDate(inst.date)}</span>
                        </div>
                        <div className="space-y-1">
                           <h4 className="text-lg sm:text-xl font-black text-zinc-900 uppercase tracking-tighter italic">{inst.type}</h4>
                           {Number((inst as any).is_event || 0) === 1 && (
                             <span className="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-[8px] font-black uppercase tracking-widest text-cyan-700">
                               Evento gratis
                             </span>
                           )}
                           <span className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest">{inst.startTime} — {inst.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="text-center">
                          <span className="text-lg sm:text-xl font-black text-brand">{availability[inst.id] || 0}</span>
                          <span className="text-[7px] sm:text-[8px] font-black text-zinc-400 uppercase tracking-widest block">/ {Number((inst as any).max_capacity || inst.capacity || 8)}</span>
                        </div>
                        <button 
                          onClick={() => setDeletingId(inst.id)} 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-50 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 border border-zinc-100 transition-all flex-shrink-0" 
                          aria-label="Cancelar clase"
                        >
                          <i className="fas fa-times text-sm sm:text-base"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
                {!yearLoading && yearInstances.length === 0 && (
                  <div className="p-8 sm:p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl sm:rounded-[2rem]">
                     <i className="fas fa-calendar-times text-3xl sm:text-4xl text-zinc-300 mb-3 sm:mb-4"></i>
                     <p className="font-bebas text-lg sm:text-xl text-zinc-300">No hay clases programadas para {selectedYear}</p>
                     <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">Cambia de pestaña de año o crea una clase nueva</p>
                  </div>
                )}
              </div>

              <div className="pt-3">
                <h3 className="text-xl sm:text-2xl font-bebas text-zinc-900 tracking-wide uppercase italic mb-3">Calendario de Clases</h3>
                <ClassCalendar
                  classes={calendarYearInstances}
                  availability={availability}
                  mode="coach"
                  loading={calendarLoading}
                  onOpenCoachDetail={(classItem) => setSelectedCalendarClass(classItem)}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'students' ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Header de Estudiantes */}
            <div className="bg-white border-2 border-zinc-50 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bebas text-zinc-900 tracking-wide uppercase italic">Comunidad</h3>
                  <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Gestión de atletas</p>
                </div>
                <div className="bg-zinc-100 px-4 py-2 rounded-xl">
                  <span className="text-lg sm:text-xl font-black text-brand">{students.length}</span>
                  <span className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-center">Atletas</span>
                </div>
              </div>
            </div>
            
            {/* Lista de Estudiantes - Mobile Optimizado */}
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <i className="fas fa-circle-notch text-3xl text-brand animate-spin mb-4"></i>
                  <p className="text-zinc-400 font-black uppercase tracking-widest">Cargando atletas...</p>
                </div>
              ) : (
                <>
                  {students.map(student => (
                    <div key={student.id} className="bg-white border border-zinc-100 rounded-xl sm:rounded-[2rem] p-4 sm:p-6 hover:border-brand transition-all hover:shadow-lg">
                      {/* Mobile Layout */}
                      <div className="flex flex-col sm:hidden space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bebas text-2xl italic flex-shrink-0">
                            {student.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 uppercase tracking-tight italic truncate">{student.full_name}</p>
                            <p className="text-[8px] text-zinc-400 font-bold tracking-widest uppercase truncate">{student.email}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center bg-zinc-50 rounded-lg p-3">
                            <span className="text-xl font-bebas text-zinc-900 italic leading-none block">{student.credits_remaining || 0}</span>
                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Créditos</p>
                          </div>
                          <div className="text-center bg-zinc-50 rounded-lg p-3">
                            <span className="text-xl font-bebas text-zinc-400 italic leading-none block">{student.total_attended || 0}</span>
                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Asistencias</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button 
                            disabled={updatingStudentId !== null}
                            onClick={() => updateCredits(student.id, student.credits_remaining, 1)} 
                            className="flex-1 py-3 bg-white border border-zinc-200 rounded-lg text-[8px] font-black uppercase tracking-widest hover:border-brand transition-all disabled:opacity-50"
                          >
                            {updatingStudentId === `${student.id}_1` ? <i className="fas fa-circle-notch fa-spin"></i> : '+1 Crédito'}
                          </button>
                          <button 
                            disabled={updatingStudentId !== null}
                            onClick={() => updateCredits(student.id, student.credits_remaining, 10)} 
                            className="flex-1 py-3 bg-zinc-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-50"
                          >
                            {updatingStudentId === `${student.id}_10` ? <i className="fas fa-circle-notch fa-spin"></i> : '+10 Pack'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Desktop Layout */}
                      <div className="hidden sm:grid grid-cols-5 items-center gap-4">
                        <div className="col-span-2 flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bebas text-3xl italic flex-shrink-0">
                            {student.full_name?.charAt(0)}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="text-base font-black text-zinc-900 uppercase tracking-tight italic truncate">{student.full_name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase truncate">{student.email}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-3xl font-bebas text-zinc-900 italic leading-none">{student.credits_remaining || 0}</span>
                          <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mt-1">Créditos</p>
                        </div>
                        <div className="text-center">
                          <span className="text-3xl font-bebas text-zinc-400 italic leading-none">{student.total_attended || 0}</span>
                          <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mt-1">Asistencias</p>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button 
                            disabled={updatingStudentId !== null}
                            onClick={() => updateCredits(student.id, student.credits_remaining, 1)} 
                            className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-brand transition-all disabled:opacity-50 min-w-[60px]"
                          >
                            {updatingStudentId === `${student.id}_1` ? <i className="fas fa-circle-notch fa-spin"></i> : '+1'}
                          </button>
                          <button 
                            disabled={updatingStudentId !== null}
                            onClick={() => updateCredits(student.id, student.credits_remaining, 10)} 
                            className="px-4 py-3 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-50 min-w-[100px]"
                          >
                            {updatingStudentId === `${student.id}_10` ? <i className="fas fa-circle-notch fa-spin"></i> : '+10 Pack'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {students.length === 0 && !loading && (
                    <div className="bg-white border-2 border-dashed border-zinc-200 rounded-xl sm:rounded-[2rem] p-8 sm:p-12 text-center">
                      <i className="fas fa-users text-4xl text-zinc-300 mb-4"></i>
                      <p className="font-bebas text-xl sm:text-2xl text-zinc-300 uppercase tracking-widest">Aún no hay atletas registrados</p>
                      <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">Los atletas aparecerán aquí cuando se registren</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <CoachAnalytics />
        ) : activeTab === 'business' ? (
          <CoachBusinessPanel user={user} />
        ) : null}
      </div>
    </div>
  );
};




