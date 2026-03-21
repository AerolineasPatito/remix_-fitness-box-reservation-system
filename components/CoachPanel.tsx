import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClassType, Profile, ClassInstance, AvailabilityState } from '../types.ts';
import { api, logger } from '../lib/api.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { CoachAnalytics } from './CoachAnalytics.tsx';
import { CoachBusinessPanel } from './CoachBusinessPanel.tsx';

interface CoachPanelProps {
  user: Profile;
  instances: ClassInstance[];
  availability: AvailabilityState;
  onRefresh: () => void;
  onRefreshStudents: () => void;
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

export const CoachPanel: React.FC<CoachPanelProps> = ({ user, instances, availability, onRefresh, onRefreshStudents }) => {
  const { addNotification, removeNotification } = useNotifications();
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
  
  const datePickerRef = useRef<HTMLInputElement>(null);
  const startTimePickerRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: ClassType.FUNCTIONAL,
    date: new Date().toISOString().split('T')[0], // Hoy por defecto
    startTime: '07:00',
    endTime: '08:00'
  });

  const normalizeInstances = (data: any[]): ClassInstance[] =>
    (Array.isArray(data) ? data : []).map((d: any) => ({
      ...d,
      startTime: (d.start_time || d.startTime || '').substring(0, 5),
      endTime: (d.end_time || d.endTime || '').substring(0, 5)
    }));

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

  // Add debug for formData changes
  useEffect(() => {
    console.log('FormData changed:', formData);
  }, [formData]);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
  }, [activeTab]);

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

  useEffect(() => {
    if (activeTab !== 'sessions') return;
    if (!selectedYear) return;

    let cancelled = false;
    const loadYearClasses = async () => {
      setYearLoading(true);
      try {
        const data = await api.getClasses(selectedYear);
        if (!cancelled) {
          setYearInstances(normalizeInstances(data || []));
        }
      } catch (err: any) {
        logger.error('Error loading classes by year', err);
        if (!cancelled) {
          setYearInstances([]);
        }
      } finally {
        if (!cancelled) setYearLoading(false);
      }
    };

    loadYearClasses();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedYear]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      if (datePickerRef.current) {
        // SIN RESTRICCIONES - Permitir cualquier fecha
        const fp = flatpickr(datePickerRef.current, { 
          locale: 'es', 
          defaultDate: formData.date, 
          dateFormat: 'Y-m-d',
          onChange: (selectedDates: any[]) => {
            const date = selectedDates[0];
            if (date) {
              const dateStr = date.toISOString().split('T')[0];
              console.log('Date picker changed to:', dateStr);
              setFormData(prev => ({ 
                ...prev, 
                date: dateStr
              }));
            }
          }
        });
        
        // Forzar actualización del valor
        fp.setDate(formData.date);
        console.log('Flatpickr date set to:', formData.date);
      }
      if (startTimePickerRef.current) {
        const timePicker = flatpickr(startTimePickerRef.current, {
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
              
              console.log('Time changed to:', start24);
              setFormData(prev => ({ 
                ...prev, 
                startTime: start24, 
                endTime: end24 
              }));
            }
          }
        });
        
        // Forzar actualización del valor
        timePicker.setDate(formData.startTime);
        console.log('TimePicker set to:', formData.startTime);
      }
    }
  }, [activeTab, formData.date, formData.startTime]);

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

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    // DEBUG LOGS - Verificar fechas y horas (SIN RESTRICCIONES)
    const now = new Date();
    const selectedDateTime = new Date(`${formData.date}T${formData.startTime}`);
    
    console.log('=== DEBUG CREACIÓN DE CLASE (SIN RESTRICCIONES) ===');
    console.log('Fecha y hora actual:', now);
    console.log('Fecha actual (ISO):', now.toISOString());
    console.log('Fecha actual (local):', now.toLocaleString('es-ES'));
    console.log('Form data date:', formData.date);
    console.log('Form data startTime:', formData.startTime);
    console.log('Selected DateTime:', selectedDateTime);
    console.log('Selected DateTime (ISO):', selectedDateTime.toISOString());
    console.log('Selected DateTime (local):', selectedDateTime.toLocaleString('es-ES'));
    
    // SIN VALIDACIONES - Permitir cualquier fecha y hora
    console.log('SIN VALIDACIONES - Creando clase directamente...');
    
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
    
    console.log('Class date formatted:', classDate);
    console.log('Class time formatted:', classTime);
    console.log('Original formData.date:', formData.date);
    
    // Store confirmation notification ID to close it later
    const notificationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setConfirmationNotificationId(notificationId);
    
    console.log('Creating notification with ID:', notificationId);
    console.log('Notification details being sent:', {
      type: formData.type,
      date: classDate,
      time: classTime,
      capacity: 8
    });
    
    addNotification({
      id: notificationId,
      type: 'info',
      title: 'Confirmar Creación de Clase',
      message: `¿Estás seguro de que quieres crear esta clase?`,
      details: {
        type: formData.type,
        date: classDate,
        time: classTime,
        capacity: 8
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
            console.log('=== USUARIO CONFIRMÓ ===');
            console.log('Notification ID to close:', notificationId);
            console.log('Current confirmationNotificationId state:', confirmationNotificationId);
            
            // Intentar cerrar la notificación
            try {
              removeNotification(notificationId);
              console.log('removeNotification called successfully');
              setConfirmationNotificationId(null);
              console.log('confirmationNotificationId set to null');
            } catch (error) {
              console.error('Error closing notification:', error);
            }
            
            createClass();
          },
          variant: 'primary'
        },
        {
          label: 'Cancelar',
          onClick: () => {
            console.log('=== USUARIO CANCELÓ ===');
            console.log('Notification ID to close:', notificationId);
            
            try {
              removeNotification(notificationId);
              setConfirmationNotificationId(null);
              addNotification({
                type: 'info',
                title: 'Creación Cancelada',
                message: 'La creación de la clase ha sido cancelada.',
                duration: 4000
              });
            } catch (error) {
              console.error('Error closing notification:', error);
            }
          },
          variant: 'secondary'
        }
      ]
    });
  };

  const createClass = async () => {
    setLoading(true);
    
    console.log('=== CREANDO CLASE EN SERVIDOR ===');
    console.log('FormData a enviar:', {
      type: formData.type,
      date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      capacity: 8,
      created_by: user.id
    });
    
    try {
      await api.createClass({
        type: formData.type,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        capacity: 8,
        created_by: user.id
      });
      
      console.log('CLASE CREADA EXITOSAMENTE');
      
      // Reset form
      setFormData({
        type: ClassType.FUNCTIONAL,
        date: new Date().toISOString().split('T')[0],
        startTime: '07:00',
        endTime: '08:00'
      });
      
      onRefresh();
      
      addNotification({
        type: 'success',
        title: 'Clase Creada Exitosamente',
        message: `La clase de ${formData.type} ha sido creada y publicada.`,
        details: {
          date: new Date(formData.date).toLocaleDateString('es-ES'),
          time: formData.startTime
        },
        duration: 5000
      });
      
    } catch (err: any) {
      console.error('ERROR CREANDO CLASE:', err);
      logger.error('Error adding class', err);
      addNotification({
        type: 'error',
        title: 'Error al Crear Clase',
        message: 'No se pudo crear la clase. Por favor intenta nuevamente.',
        details: { technical: err.message },
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
      setDeletingId(null);
      onRefresh();
      
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
      await api.updateCredits(studentId, currentCredits + amount);
      onRefreshStudents();
      fetchStudents();
    } catch (err) {
      logger.error('Error actualizando créditos', err);
      alert('Error al actualizar créditos.');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
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

        {/* Content */}
        {/* Content Tabs con Scroll Optimizado */}
        {activeTab === 'sessions' ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Formulario de Creación - Mobile Optimizado */}
            <div className="bg-white border-2 border-zinc-50 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 lg:p-8 shadow-xl">
              <div className="mb-6 sm:mb-8">
                <h3 className="text-2xl sm:text-3xl font-bebas text-zinc-900 tracking-wide uppercase italic">Crear Nueva Clase</h3>
                <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">Programa una nueva sesión</p>
              </div>
              
              <form onSubmit={handleAddClass} className="space-y-4 sm:space-y-6">
                {/* Tipo de Clase - Mobile Grid */}
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Tipo de Entrenamiento</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                    {Object.keys(CLASS_METADATA).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: t as ClassType }))}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                          formData.type === t 
                            ? 'border-brand bg-brand/5 text-brand shadow-lg' 
                            : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
                        }`}
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 mx-auto ${formData.type === t ? CLASS_METADATA[t].color + ' text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          <i className={`fas ${CLASS_METADATA[t].icon} text-xs sm:text-sm`}></i>
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tight block text-center leading-tight">{t.split('_').slice(0, 2).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Fecha y Hora - Mobile Stacked */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Fecha</label>
                    <input ref={datePickerRef} readOnly type="text" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bebas text-zinc-900 text-center outline-none focus:border-brand transition-all" />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Horario</label>
                    <input ref={startTimePickerRef} readOnly type="text" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base font-bold text-zinc-900 text-center outline-none focus:border-brand transition-all" />
                  </div>
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
                  disabled={loading || hasScheduleConflict} 
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

                {!yearLoading && yearInstances.map(inst => (
                  <div key={inst.id} className="bg-white border border-zinc-100 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] hover:border-brand transition-all hover:shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-white ${getClassMeta(inst.type).color} shadow-lg flex-shrink-0`}>
                           <span className="text-[10px] sm:text-xs font-black leading-tight text-center px-1">{formatClassDate(inst.date)}</span>
                        </div>
                        <div className="space-y-1">
                           <h4 className="text-lg sm:text-xl font-black text-zinc-900 uppercase tracking-tighter italic">{inst.type}</h4>
                           <span className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest">{inst.startTime} — {inst.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="text-center">
                          <span className="text-lg sm:text-xl font-black text-brand">{availability[inst.id] || 0}</span>
                          <span className="text-[7px] sm:text-[8px] font-black text-zinc-400 uppercase tracking-widest block">/ 8</span>
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
                ))}
                {!yearLoading && yearInstances.length === 0 && (
                  <div className="p-8 sm:p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl sm:rounded-[2rem]">
                     <i className="fas fa-calendar-times text-3xl sm:text-4xl text-zinc-300 mb-3 sm:mb-4"></i>
                     <p className="font-bebas text-lg sm:text-xl text-zinc-300">No hay clases programadas para {selectedYear}</p>
                     <p className="text-[8px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">Cambia de pestaña de año o crea una clase nueva</p>
                  </div>
                )}
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




