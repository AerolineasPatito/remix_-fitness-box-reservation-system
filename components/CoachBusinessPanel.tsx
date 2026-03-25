import React, { useEffect, useState } from 'react';
import { api, logger } from '../lib/api.ts';
import { Profile } from '../types.ts';

type CoachBusinessTab = 'creator' | 'community' | 'management' | 'cashcut';

interface CoachBusinessPanelProps {
  user: Profile;
}

interface PackageItem {
  id: string;
  nombre: string;
  capacidad: number;
  numero_clases: number;
  vigencia_semanas: number;
  detalles: string;
  precio_base: number;
  estado: string;
}

interface CommunityStudent {
  id: string;
  full_name: string;
  email: string;
  email_verified: number;
  credits_remaining: number;
  total_attended: number;
  warning_low_battery?: boolean;
  days_to_expiry?: number | null;
  current_subscription?: any;
  active_class?: any;
  next_class?: any;
}

interface ClassOption {
  id: string;
  type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonthIso = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().slice(0, 10);
};

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value || 0);

const resolveErrorMessage = (err: any, fallback: string) => {
  const rawMessage = err?.message;
  if (!rawMessage) return fallback;
  try {
    const parsed = JSON.parse(rawMessage);
    return parsed?.error || parsed?.message || fallback;
  } catch {
    return rawMessage || fallback;
  }
};

export const CoachBusinessPanel: React.FC<CoachBusinessPanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<CoachBusinessTab>('creator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [classCatalog, setClassCatalog] = useState<ClassOption[]>([]);
  const [community, setCommunity] = useState<CommunityStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);

  const [packageForm, setPackageForm] = useState({
    id: '',
    nombre: '',
    capacidad: 1,
    numero_clases: 12,
    vigencia_semanas: 4,
    detalles: '',
    precio_base: 0,
    estado: 'active'
  });

  const [studentForm, setStudentForm] = useState({
    full_name: '',
    email_verified: false
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    paquete_id: '',
    metodo_pago: 'transferencia',
    referencia: '',
    monto: ''
  });

  const [manualCreditsForm, setManualCreditsForm] = useState({
    amount: '',
    reason: ''
  });

  const [attendanceForm, setAttendanceForm] = useState({
    class_id: '',
    estado: 'attended'
  });
  const [beneficiaryToAdd, setBeneficiaryToAdd] = useState('');

  const [cashRange, setCashRange] = useState({
    startDate: firstDayOfMonthIso(),
    endDate: todayIso()
  });
  const [cashFilterMode, setCashFilterMode] = useState<'month' | 'range'>('month');
  const [cashYear, setCashYear] = useState<number>(new Date().getFullYear());
  const [cashMonth, setCashMonth] = useState<number>(new Date().getMonth() + 1);
  const [cashAvailableYears, setCashAvailableYears] = useState<number[]>([]);
  const [cashAvailableMonths, setCashAvailableMonths] = useState<number[]>([]);
  const [cashCutData, setCashCutData] = useState<any>(null);

  const loadPackages = async () => {
    const data = await api.coach.getPackages();
    setPackages(Array.isArray(data) ? data : []);
  };

  const loadClassCatalog = async () => {
    const data = await api.getClasses();
    const safeList = Array.isArray(data) ? data : [];
    setClassCatalog(safeList.filter((item: any) => item?.status === 'active'));
  };

  const loadCommunity = async () => {
    const data = await api.coach.getCommunity();
    setCommunity(Array.isArray(data) ? data : []);
  };

  const loadCashCut = async (filters?: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
    const report = await api.coach.getCashCut(filters);
    if (Array.isArray(report?.availableYears)) {
      setCashAvailableYears(report.availableYears);
    }
    if (Array.isArray(report?.availableMonths)) {
      setCashAvailableMonths(report.availableMonths);
    }
    if (report?.selectedYear) setCashYear(Number(report.selectedYear));
    if (report?.selectedMonth) setCashMonth(Number(report.selectedMonth));
    if (report?.range?.startDate && report?.range?.endDate) {
      setCashRange({ startDate: report.range.startDate, endDate: report.range.endDate });
    }
    setCashCutData(report);
  };

  const loadStudentDetail = async (studentId: string) => {
    if (!studentId) {
      setSelectedStudentDetail(null);
      return;
    }
    const detail = await api.coach.getStudentSubscriptions(studentId);
    setSelectedStudentDetail(detail);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          loadPackages(),
          loadClassCatalog(),
          loadCommunity(),
          loadCashCut({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
        ]);
      } catch (err: any) {
        logger.error('Error loading coach business panel', err);
        setError(resolveErrorMessage(err, 'No se pudo cargar el panel'));
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    const selected = community.find((s) => s.id === selectedStudentId);
    if (!selected) {
      setStudentForm({ full_name: '', email_verified: false });
      return;
    }
    setStudentForm({
      full_name: selected.full_name || '',
      email_verified: !!selected.email_verified
    });
    setAttendanceForm({
      class_id: selected.next_class?.id || selected.active_class?.id || '',
      estado: 'attended'
    });
    loadStudentDetail(selected.id).catch((err) => logger.error('Error loading student detail', err));
  }, [selectedStudentId, community]);

  useEffect(() => {
    if (activeTab !== 'cashcut') return;
    if (cashFilterMode !== 'month') return;

    const refreshMonthlyDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadCashCut({ year: cashYear, month: cashMonth });
      } catch (err: any) {
        logger.error('Error refreshing monthly dashboard', err);
        setError(resolveErrorMessage(err, 'No se pudo actualizar el dashboard mensual'));
      } finally {
        setLoading(false);
      }
    };

    refreshMonthlyDashboard();
  }, [activeTab, cashFilterMode, cashYear, cashMonth]);

  useEffect(() => {
    if (cashFilterMode !== 'month') return;
    if (!cashAvailableMonths.length) return;
    if (cashAvailableMonths.includes(cashMonth)) return;
    setCashMonth(cashAvailableMonths[0]);
  }, [cashFilterMode, cashAvailableMonths, cashMonth]);

  const resetPackageForm = () => {
    setPackageForm({
      id: '',
      nombre: '',
      capacidad: 1,
      numero_clases: 12,
      vigencia_semanas: 4,
      detalles: '',
      precio_base: 0,
      estado: 'active'
    });
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const payload = {
        ...packageForm,
        actor_id: user.id,
        capacidad: Number(packageForm.capacidad),
        numero_clases: Number(packageForm.numero_clases),
        vigencia_semanas: Number(packageForm.vigencia_semanas),
        precio_base: Number(packageForm.precio_base)
      };
      if (payload.capacidad > 1 && payload.numero_clases % payload.capacidad !== 0) {
        throw new Error('El total de clases debe ser divisible equitativamente entre la capacidad del paquete.');
      }
      if (packageForm.id) {
        await api.coach.updatePackage(packageForm.id, payload);
      } else {
        await api.coach.createPackage(payload);
      }
      await loadPackages();
      resetPackageForm();
    } catch (err: any) {
      logger.error('Error saving package', err);
      setError(resolveErrorMessage(err, 'No se pudo guardar el paquete'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.coach.deletePackage(id);
      await loadPackages();
      if (packageForm.id === id) resetPackageForm();
    } catch (err: any) {
      logger.error('Error deleting package', err);
      setError(resolveErrorMessage(err, 'No se pudo eliminar el paquete'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.updateStudent(selectedStudentId, studentForm);
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
    } catch (err: any) {
      logger.error('Error updating student', err);
      setError(resolveErrorMessage(err, 'No se pudo actualizar el alumno'));
    } finally {
      setLoading(false);
    }
  };

  const handleSellPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !subscriptionForm.paquete_id) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.createSubscription({
        alumno_id: selectedStudentId,
        paquete_id: subscriptionForm.paquete_id,
        metodo_pago: subscriptionForm.metodo_pago,
        referencia: subscriptionForm.referencia,
        monto: subscriptionForm.monto === '' ? undefined : Number(subscriptionForm.monto),
        actor_id: user.id
      });
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
      setSubscriptionForm({
        paquete_id: '',
        metodo_pago: 'transferencia',
        referencia: '',
        monto: ''
      });
    } catch (err: any) {
      logger.error('Error creating subscription', err);
      setError(resolveErrorMessage(err, 'No se pudo registrar la venta del paquete'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !manualCreditsForm.amount) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.adjustStudentCredits(selectedStudentId, {
        amount: Number(manualCreditsForm.amount),
        reason: manualCreditsForm.reason,
        actor_id: user.id
      });
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
      setManualCreditsForm({ amount: '', reason: '' });
    } catch (err: any) {
      logger.error('Error adjusting credits', err);
      setError(resolveErrorMessage(err, 'No se pudo aplicar el ajuste de créditos'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !attendanceForm.class_id) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.registerAttendance({
        alumno_id: selectedStudentId,
        clase_id: attendanceForm.class_id,
        estado: attendanceForm.estado,
        actor_id: user.id
      });
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
    } catch (err: any) {
      logger.error('Error registering attendance', err);
      setError(resolveErrorMessage(err, 'No se pudo registrar la asistencia'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToClass = async () => {
    if (!selectedStudentId || !attendanceForm.class_id) return;
    try {
      setLoading(true);
      setError(null);
      await api.createReservation(selectedStudentId, attendanceForm.class_id);
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
    } catch (err: any) {
      logger.error('Error assigning student to class', err);
      setError(resolveErrorMessage(err, 'No se pudo asignar al alumno a la clase'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBeneficiary = async (subscriptionId: string) => {
    if (!beneficiaryToAdd) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.addSubscriptionBeneficiary(subscriptionId, { alumno_id: beneficiaryToAdd });
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
      setBeneficiaryToAdd('');
    } catch (err: any) {
      logger.error('Error adding beneficiary', err);
      setError(resolveErrorMessage(err, 'No se pudo agregar el beneficiario'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async (subscriptionId: string, currentFrozen: boolean) => {
    try {
      setLoading(true);
      setError(null);
      await api.coach.toggleSubscriptionFreeze(subscriptionId, currentFrozen ? 'resume' : 'pause');
      await loadCommunity();
      await loadStudentDetail(selectedStudentId);
    } catch (err: any) {
      logger.error('Error toggling freeze', err);
      setError(resolveErrorMessage(err, 'No se pudo actualizar el congelamiento'));
    } finally {
      setLoading(false);
    }
  };

  const handleCashCut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (cashFilterMode === 'range') {
        await loadCashCut({ startDate: cashRange.startDate, endDate: cashRange.endDate });
      } else {
        await loadCashCut({ year: cashYear, month: cashMonth });
      }
    } catch (err: any) {
      logger.error('Error loading cash cut', err);
      setError(resolveErrorMessage(err, 'No se pudo generar el corte de caja'));
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = community.find((s) => s.id === selectedStudentId) || null;
  const studentSubscriptions = Array.isArray(selectedStudentDetail?.subscriptions) ? selectedStudentDetail.subscriptions : [];
  const selectedActiveSubscription = studentSubscriptions.find((sub: any) => sub?.estado === 'active') || null;
  const canManageBeneficiaries = !!(selectedActiveSubscription && Number(selectedActiveSubscription.package_capacity || 1) > 1 && Number(selectedActiveSubscription.es_titular || 0) === 1);
  const selectedSubscriptionBeneficiaries = Array.isArray(selectedActiveSubscription?.beneficiaries) ? selectedActiveSubscription.beneficiaries : [];
  const beneficiaryCandidateStudents = community.filter((student) => {
    if (!selectedStudentId) return false;
    if (student.id === selectedStudentId) return false;
    return !selectedSubscriptionBeneficiaries.some((b: any) => b.alumno_id === student.id && !b.deleted_at);
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white border-2 border-zinc-50 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <h3 className="text-2xl sm:text-4xl font-bebas text-zinc-900 tracking-tighter uppercase italic">Gestión de Paquetes</h3>
            <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Inventario, comunidad, gestión y corte de caja</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-zinc-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('creator')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'creator' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500'}`}>Creador</button>
            <button onClick={() => setActiveTab('community')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'community' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500'}`}>Comunidad</button>
            <button onClick={() => setActiveTab('management')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'management' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500'}`}>Gestión</button>
            <button onClick={() => setActiveTab('cashcut')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTab === 'cashcut' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500'}`}>Corte de Caja</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'creator' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">{packageForm.id ? 'Editar paquete' : 'Crear paquete'}</h4>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Nombre del Paquete</label>
                <input className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Ej. FOCUS WORK" value={packageForm.nombre} onChange={(e) => setPackageForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Capacidad</label>
                  <input type="number" min={1} max={3} className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Capacidad (ej. 1, 2 o 3 personas)" value={packageForm.capacidad} onChange={(e) => setPackageForm((prev) => ({ ...prev, capacidad: Number(e.target.value) }))} required />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Numero de Clases</label>
                  <input type="number" min={1} className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Numero de Clases" value={packageForm.numero_clases} onChange={(e) => setPackageForm((prev) => ({ ...prev, numero_clases: Number(e.target.value) }))} required />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vigencia</label>
                  <input type="number" min={1} className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Vigencia (en semanas)" value={packageForm.vigencia_semanas} onChange={(e) => setPackageForm((prev) => ({ ...prev, vigencia_semanas: Number(e.target.value) }))} required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Precio Base</label>
                <input type="number" min={0} step="0.01" className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Precio Base" value={packageForm.precio_base} onChange={(e) => setPackageForm((prev) => ({ ...prev, precio_base: Number(e.target.value) }))} required />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Detalles y Politicas</label>
            <textarea className="w-full border border-zinc-200 rounded-xl p-3 text-sm" rows={4} placeholder="Detalles/Políticas: condiciones, reposiciones, cancelaciones..." value={packageForm.detalles} onChange={(e) => setPackageForm((prev) => ({ ...prev, detalles: e.target.value }))} />
              </div>
              <select className="w-full border border-zinc-200 rounded-xl p-3 text-sm" value={packageForm.estado} onChange={(e) => setPackageForm((prev) => ({ ...prev, estado: e.target.value }))}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              <div className="flex gap-3">
                <button disabled={loading} className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
                  {packageForm.id ? 'Actualizar' : 'Guardar'}
                </button>
                {packageForm.id && (
                  <button type="button" onClick={resetPackageForm} className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                    Limpiar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">Catalogo de paquetes</h4>
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border border-zinc-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-zinc-900 uppercase tracking-tight">{pkg.nombre}</p>
                      <p className="text-[11px] text-zinc-500">{pkg.numero_clases} clases | {pkg.vigencia_semanas} semanas | cap. {pkg.capacidad}</p>
                      <p className="text-[11px] text-brand font-black">{money(Number(pkg.precio_base || 0))}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPackageForm({ ...pkg, precio_base: Number(pkg.precio_base || 0) })} className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest">Editar</button>
                      <button type="button" onClick={() => handleDeletePackage(pkg.id)} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest">Baja</button>
                    </div>
                  </div>
                </div>
              ))}
              {packages.length === 0 && <p className="text-sm text-zinc-400">Aun no hay paquetes registrados.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 overflow-x-auto">
          <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">Comunidad y estatus en tiempo real</h4>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-zinc-400 uppercase text-[10px] tracking-widest">
                <th className="py-3">Alumno</th>
                <th className="py-3">Verificado</th>
                <th className="py-3">Paquete Actual</th>
                <th className="py-3">Restantes</th>
                <th className="py-3">Clase Activa</th>
                <th className="py-3">Proxima Clase</th>
              </tr>
            </thead>
            <tbody>
              {community.length === 0 ? (
                <tr className="border-t border-zinc-100">
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No hay alumnos para mostrar en comunidad.
                  </td>
                </tr>
              ) : (
                community.map((student) => (
                  <tr key={student.id} className={`border-t ${student.warning_low_battery ? 'border-amber-300 bg-amber-50/40' : 'border-zinc-100'}`}>
                    <td className="py-4">
                      <p className="font-black text-zinc-900">{student.full_name}</p>
                      <p className="text-zinc-500 text-xs">{student.email}</p>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${student.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {student.email_verified ? 'si' : 'no'}
                      </span>
                    </td>
                    <td className="py-4">{student.current_subscription?.package_name || 'Sin paquete'}</td>
                    <td className="py-4">
                      <p className={`font-black ${student.warning_low_battery ? 'text-amber-700' : 'text-brand'}`}>
                        {student.current_subscription?.clases_restantes ?? student.credits_remaining ?? 0}
                      </p>
                      {student.warning_low_battery && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Bateria baja
                          {typeof student.days_to_expiry === 'number' && student.days_to_expiry >= 0 ? ` | vence en ${student.days_to_expiry} dias` : ''}
                        </p>
                      )}
                    </td>
                    <td className="py-4">{student.active_class ? `${student.active_class.type} (${student.active_class.start_time})` : 'Ninguna'}</td>
                    <td className="py-4">{student.next_class ? `${student.next_class.type} (${student.next_class.date} ${student.next_class.start_time})` : 'Ninguna'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'management' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">Gestión individual</h4>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Alumno</label>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full border border-zinc-200 rounded-xl p-3 text-sm">
                  <option value="">Selecciona un alumno</option>
                  {community.map((student) => (
                    <option key={student.id} value={student.id}>{student.full_name} ({student.email})</option>
                  ))}
                </select>
              </div>
              {selectedStudent && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Saldo total</p>
                    <p className="font-black text-brand text-lg">{selectedStudent.credits_remaining}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Asistencias</p>
                    <p className="font-black text-zinc-900 text-lg">{selectedStudent.total_attended}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 space-y-4">
              <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500">Sección 1: Perfil del alumno</h5>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <input className="border border-zinc-200 rounded-xl p-3 text-sm w-full" placeholder="Nombre" value={studentForm.full_name} onChange={(e) => setStudentForm((prev) => ({ ...prev, full_name: e.target.value }))} />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={studentForm.email_verified} onChange={(e) => setStudentForm((prev) => ({ ...prev, email_verified: e.target.checked }))} />
                  Correo verificado
                </label>
                <button disabled={!selectedStudentId || loading} className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">Actualizar perfil</button>
              </form>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 space-y-4">
              <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500">Sección 2: Suscripción actual y beneficiarios</h5>
              {!selectedActiveSubscription && (
                <p className="text-sm text-zinc-500">Este alumno no tiene una suscripción activa.</p>
              )}

              {selectedActiveSubscription && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm">
                    <p className="font-black text-zinc-900">{selectedActiveSubscription.package_name || 'Manual'}</p>
                    <p className="text-zinc-600">Saldo actual: {selectedActiveSubscription.alumno_clases_restantes ?? selectedStudent?.credits_remaining ?? 0} clases</p>
                    <p className="text-zinc-600">Vence: {selectedActiveSubscription.fecha_vencimiento?.slice(0, 10) || 'N/A'}</p>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleToggleFreeze(selectedActiveSubscription.id, Number(selectedActiveSubscription.congelado || 0) === 1)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${Number(selectedActiveSubscription.congelado || 0) === 1 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}
                  >
                    {Number(selectedActiveSubscription.congelado || 0) === 1 ? 'Reanudar paquete' : 'Pausar paquete'}
                  </button>
                </div>
              )}

              {canManageBeneficiaries && (
                <div className="space-y-3 border-t border-zinc-100 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gestión de beneficiarios</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      className="border border-zinc-200 rounded-xl p-3 text-sm md:col-span-2"
                      value={beneficiaryToAdd}
                      onChange={(e) => setBeneficiaryToAdd(e.target.value)}
                    >
                      <option value="">Selecciona alumno para vincular</option>
                      {beneficiaryCandidateStudents.map((student) => (
                        <option key={student.id} value={student.id}>{student.full_name} ({student.email})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!beneficiaryToAdd || loading}
                      onClick={() => handleAddBeneficiary(selectedActiveSubscription!.id)}
                      className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {selectedSubscriptionBeneficiaries.length === 0 && (
                      <p className="text-sm text-zinc-400">Sin beneficiarios vinculados.</p>
                    )}
                    {selectedSubscriptionBeneficiaries.map((beneficiary: any) => (
                      <div key={beneficiary.id} className="text-xs bg-zinc-50 rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-zinc-900">{beneficiary.full_name} {Number(beneficiary.es_titular || 0) === 1 ? '(Titular)' : ''}</p>
                          <p className="text-zinc-500">{beneficiary.clases_restantes}/{beneficiary.clases_asignadas} clases</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${beneficiary.estado === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-200 text-zinc-700'}`}>
                          {beneficiary.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 space-y-4">
              <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500">Sección 3: Operaciones de clase</h5>
              <form onSubmit={handleRegisterAttendance} className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Asistencia / no-show</p>
                <select
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                  value={attendanceForm.class_id}
                  onChange={(e) => setAttendanceForm((prev) => ({ ...prev, class_id: e.target.value }))}
                  required
                >
                  <option value="">Selecciona clase</option>
                  {classCatalog.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.type} | {classItem.date} {classItem.start_time}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedStudentId || !attendanceForm.class_id || loading}
                  onClick={handleAssignToClass}
                  className="px-5 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                >
                  Asignar alumno a clase
                </button>
                <select
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                  value={attendanceForm.estado}
                  onChange={(e) => setAttendanceForm((prev) => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="attended">Asistio</option>
                  <option value="no_show">Ausente (descuenta clase)</option>
                </select>
                <button disabled={!selectedStudentId || loading} className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">Registrar evento</button>
              </form>

              <form onSubmit={handleManualCredits} className="space-y-3 border-t border-zinc-100 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ajuste manual de créditos</p>
                <input className="border border-zinc-200 rounded-xl p-3 text-sm w-full" placeholder="Cantidad (+/-)" value={manualCreditsForm.amount} onChange={(e) => setManualCreditsForm((prev) => ({ ...prev, amount: e.target.value }))} required />
                <input className="border border-zinc-200 rounded-xl p-3 text-sm w-full" placeholder="Motivo" value={manualCreditsForm.reason} onChange={(e) => setManualCreditsForm((prev) => ({ ...prev, reason: e.target.value }))} required />
                <button disabled={!selectedStudentId || loading} className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">Aplicar ajuste</button>
              </form>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 space-y-4">
              <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500">Sección 4: Nueva venta</h5>
              <form onSubmit={handleSellPackage} className="space-y-3">
                <select className="border border-zinc-200 rounded-xl p-3 text-sm w-full" value={subscriptionForm.paquete_id} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, paquete_id: e.target.value }))} required>
                  <option value="">Selecciona paquete</option>
                  {packages.filter((pkg) => pkg.estado === 'active').map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.nombre} - {money(Number(pkg.precio_base || 0))}</option>
                  ))}
                </select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Monto (opcional)" value={subscriptionForm.monto} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, monto: e.target.value }))} />
                  <select className="border border-zinc-200 rounded-xl p-3 text-sm" value={subscriptionForm.metodo_pago} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <input className="border border-zinc-200 rounded-xl p-3 text-sm w-full" placeholder="Referencia" value={subscriptionForm.referencia} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, referencia: e.target.value }))} />
                <button disabled={!selectedStudentId || loading} className="px-5 py-3 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest">Registrar venta</button>
              </form>
            </div>
          </div>

          {selectedStudentDetail && (
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500 mb-3">Historial de suscripciones</h5>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {(selectedStudentDetail.subscriptions || []).length === 0 && (
                      <p className="text-sm text-zinc-400">Sin historial de suscripciones.</p>
                    )}
                    {(selectedStudentDetail.subscriptions || []).map((sub: any) => (
                      <div key={sub.id} className="text-xs bg-zinc-50 rounded-lg p-2">
                        <span className="font-black">{sub.package_name || 'Manual'}</span> | {sub.estado} | {sub.clases_restantes}/{sub.clases_totales}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500 mb-3">Historial de actividad</h5>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {(selectedStudentDetail.activity || []).length === 0 && (
                      <p className="text-sm text-zinc-400">Sin actividad registrada.</p>
                    )}
                    {(selectedStudentDetail.activity || []).map((row: any, index: number) => (
                      <div key={`${row.tipo}_${row.timestamp}_${index}`} className="text-xs bg-zinc-50 rounded-lg p-2">
                        <p className="font-black text-zinc-900 uppercase">{row.tipo === 'attendance' ? 'Asistencia' : 'Ajuste'}</p>
                        <p className="text-zinc-600">
                          {row.evento} | {row.referencia}
                          {row.ajuste != null ? ` | ajuste: ${row.ajuste > 0 ? '+' : ''}${row.ajuste}` : ''}
                        </p>
                        <p className="text-zinc-500">{row.fecha} {row.hora || ''} {row.motivo ? `| ${row.motivo}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cashcut' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <form onSubmit={handleCashCut} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Modo</label>
                  <select
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                    value={cashFilterMode}
                    onChange={(e) => setCashFilterMode(e.target.value as 'month' | 'range')}
                  >
                    <option value="month">Mensual (dinamico)</option>
                    <option value="range">Rango personalizado</option>
                  </select>
                </div>

                {cashFilterMode === 'month' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Ano</label>
                      <select
                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                        value={cashYear}
                        onChange={(e) => setCashYear(Number(e.target.value))}
                      >
                        {(cashAvailableYears.length ? cashAvailableYears : [cashYear]).map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Mes</label>
                      <select
                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                        value={cashMonth}
                        onChange={(e) => setCashMonth(Number(e.target.value))}
                      >
                        {(cashAvailableMonths.length ? cashAvailableMonths : [cashMonth]).map((monthValue) => (
                          <option key={monthValue} value={monthValue}>{monthValue.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button disabled={loading} className="w-full py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">Actualizar dashboard</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fecha inicio</label>
                      <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm" value={cashRange.startDate} onChange={(e) => setCashRange((prev) => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fecha fin</label>
                      <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm" value={cashRange.endDate} onChange={(e) => setCashRange((prev) => ({ ...prev, endDate: e.target.value }))} />
                    </div>
                    <div className="flex items-end">
                      <button disabled={loading} className="w-full py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">Aplicar rango</button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          {cashCutData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Paquetes vendidos</p>
                  <p className="text-4xl font-bebas text-zinc-900">{cashCutData.paquetesVendidos || 0}</p>
                </div>
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ingresos totales</p>
                  <p className="text-4xl font-bebas text-brand">{money(Number(cashCutData.ingresosTotales || 0))}</p>
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500 mb-3">Ventas por paquete</h5>
                <div className="space-y-2">
                  {(cashCutData.porPaquete || []).length === 0 && (
                    <p className="text-sm text-zinc-400">Sin ventas en el periodo seleccionado.</p>
                  )}
                  {(cashCutData.porPaquete || []).map((item: any) => (
                    <div key={`${item.paquete}_${item.ventas}`} className="flex items-center justify-between text-sm border border-zinc-100 rounded-lg p-3">
                      <span className="font-black text-zinc-900">{item.paquete}</span>
                      <span>{item.ventas} ventas | <span className="font-black text-brand">{money(Number(item.ingresos || 0))}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[
                  { key: 'diario', title: 'Desglose diario' },
                  { key: 'semanal', title: 'Desglose semanal' },
                  { key: 'mensual', title: 'Desglose mensual' },
                  { key: 'anual', title: 'Desglose anual' }
                ].map((section) => (
                  <div key={section.key} className="bg-white border border-zinc-100 rounded-2xl p-5">
                    <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500 mb-3">{section.title}</h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(cashCutData.desglose?.[section.key] || []).length === 0 && (
                        <p className="text-sm text-zinc-400">Sin registros para este desglose.</p>
                      )}
                      {(cashCutData.desglose?.[section.key] || []).map((row: any) => (
                        <div key={`${section.key}_${row.periodo}`} className="flex items-center justify-between text-sm border border-zinc-100 rounded-lg p-3">
                          <span className="font-black text-zinc-900">{row.periodo}</span>
                          <span>{row.ventas} ventas | <span className="font-black text-brand">{money(Number(row.ingresos || 0))}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
