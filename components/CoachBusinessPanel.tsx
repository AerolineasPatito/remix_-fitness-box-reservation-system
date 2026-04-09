import React, { useEffect, useRef, useState } from 'react';
import { api, logger } from '../lib/api.ts';
import { Profile } from '../types.ts';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { emitStudentStateChanged } from '../lib/studentStateSync.ts';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';
import { slugifyClassType } from '../lib/routeHelpers.ts';

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
  whatsapp_phone?: string;
  email_verified: number;
  credits_remaining: number;
  total_attended: number;
  notified_by_email?: boolean;
  last_cancellation_notified_at?: string | null;
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

interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  is_default_cancellation: number;
}

interface HighlightItem {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  sort_order?: number;
  is_active?: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonthIso = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().slice(0, 10);
};

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value || 0);

const WHATSAPP_VARIABLES = [
  '{{nombre_alumno}}',
  '{{email_alumno}}',
  '{{whatsapp_alumno}}',
  '{{paquete_actual}}',
  '{{creditos_restantes}}',
  '{{fecha_vencimiento_paquete}}',
  '{{dias_para_vencer}}',
  '{{clase_activa}}',
  '{{proxima_clase}}',
  '{{fecha_cancelacion}}',
  '{{email_verificado}}',
  '{{nombre_negocio}}'
];

const resolveErrorMessage = (err: any, fallback: string) => getFriendlyErrorMessage(err, fallback);
const normalizeIntegerInput = (raw: string, fallback: number, min = 0, max?: number) => {
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
  min = 0,
  max?: number
) => {
  const base = normalizeIntegerInput(value, fallback, min, max);
  let next = base + delta;
  if (next < min) next = min;
  if (typeof max === 'number' && next > max) next = max;
  setValue(String(next));
};

export const CoachBusinessPanel: React.FC<CoachBusinessPanelProps> = ({ user }) => {
  const {
    classTypes: sharedClassTypes,
    packages: sharedPackages,
    classes: sharedClasses,
    refreshPackages,
    refreshClasses,
    refreshAvailability,
    refreshHighlights
  } = useAppData();
  const [activeTab, setActiveTab] = useState<CoachBusinessTab>('creator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [classCatalog, setClassCatalog] = useState<ClassOption[]>([]);
  const [community, setCommunity] = useState<CommunityStudent[]>([]);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateSelectionByStudent, setTemplateSelectionByStudent] = useState<Record<string, string>>({});
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    body: '',
    is_default_cancellation: false
  });
  const templateTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');

  const [packageForm, setPackageForm] = useState({
    id: '',
    nombre: '',
    capacidad: '1',
    numero_clases: '12',
    vigencia_semanas: '4',
    detalles: '',
    precio_base: '0',
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
    monto: '',
    reuse_active_subscription: false
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
  const [activityFilterType, setActivityFilterType] = useState('all');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');

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
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [highlightForm, setHighlightForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    image_url: '',
    cta_label: '',
    cta_mode: 'internal' as 'internal' | 'external',
    cta_internal_url: '/',
    cta_external_url: '',
    start_at: '',
    end_at: '',
    sort_order: '0',
    is_active: true
  });
  const [uploadingHighlightImage, setUploadingHighlightImage] = useState(false);
  const sortedHighlights = React.useMemo(
    () =>
      [...(Array.isArray(highlights) ? highlights : [])].sort(
        (a: any, b: any) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
      ),
    [highlights]
  );
  const internalRouteOptions = React.useMemo(() => {
    const items: Array<{ label: string; value: string }> = [{ label: 'Inicio', value: '/' }];
    const names = Array.from(
      new Set(
        (Array.isArray(sharedClassTypes) ? sharedClassTypes : [])
          .map((row: any) => String(row?.name || '').trim())
          .filter(Boolean)
      )
    );
    names.forEach((name) => {
      items.push({
        label: `Clase: ${name}`,
        value: `/schedule/${slugifyClassType(name)}`
      });
    });
    return items;
  }, [sharedClassTypes]);

  useEffect(() => {
    setPackages(Array.isArray(sharedPackages) ? sharedPackages : []);
  }, [sharedPackages]);

  useEffect(() => {
    const safeList = Array.isArray(sharedClasses) ? sharedClasses : [];
    setClassCatalog(safeList.filter((item: any) => item?.status === 'active'));
  }, [sharedClasses]);

  const loadCommunity = async () => {
    const data = await api.coach.getCommunity();
    setCommunity(Array.isArray(data) ? data : []);
  };

  const loadWhatsAppTemplates = async () => {
    const data = await api.coach.getWhatsAppTemplates();
    setWhatsAppTemplates(Array.isArray(data) ? data : []);
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
      setSelectedSubscriptionId('');
      return;
    }
    const [detail, historyResponse] = await Promise.all([
      api.coach.getStudentSubscriptions(studentId),
      api.coach.getStudentHistory(studentId)
    ]);
    const subscriptions = Array.isArray(detail?.subscriptions) ? detail.subscriptions : [];
    const subscriptionsWithBeneficiaries = await Promise.all(
      subscriptions.map(async (subscription: any) => {
        try {
          const beneficiaries = await api.coach.getSubscriptionBeneficiaries(subscription.id);
          return { ...subscription, beneficiaries: Array.isArray(beneficiaries) ? beneficiaries : [] };
        } catch {
          return { ...subscription, beneficiaries: [] };
        }
      })
    );
    const defaultSubscription =
      subscriptionsWithBeneficiaries.find((sub: any) => sub?.estado === 'active') ||
      subscriptionsWithBeneficiaries[0] ||
      null;
    setSelectedSubscriptionId(defaultSubscription?.id || '');
    setSelectedStudentDetail({
      ...(detail || {}),
      subscriptions: subscriptionsWithBeneficiaries,
      activity: Array.isArray(historyResponse?.history) ? historyResponse.history : []
    });
  };

  const refreshCommunityView = async (
    studentId: string,
    options?: {
      includeClasses?: boolean;
      includePackages?: boolean;
      includeCashCut?: boolean;
      includeStudentSync?: boolean;
    }
  ) => {
    if (!studentId) return;
    await loadCommunity();
    if (options?.includeClasses) {
      await Promise.all([refreshClasses(), refreshAvailability()]);
    }
    if (options?.includePackages) {
      await refreshPackages();
    }
    await loadStudentDetail(studentId);
    if (options?.includeCashCut) {
      if (cashFilterMode === 'range') {
        await loadCashCut({ startDate: cashRange.startDate, endDate: cashRange.endDate });
      } else {
        await loadCashCut({ year: cashYear, month: cashMonth });
      }
    }
    if (options?.includeStudentSync !== false) {
      emitStudentStateChanged(studentId);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          refreshPackages(),
          refreshClasses(),
          refreshHighlights(),
          loadCoachHighlights(),
          loadCommunity(),
          loadWhatsAppTemplates(),
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
  }, [refreshClasses, refreshPackages, refreshHighlights]);

  useEffect(() => {
    if (!community.length || !whatsAppTemplates.length) return;
    const defaultTemplate = whatsAppTemplates.find((t) => Number(t.is_default_cancellation || 0) === 1) || whatsAppTemplates[0];
    setTemplateSelectionByStudent((prev) => {
      const next = { ...prev };
      community.forEach((student) => {
        if (!next[student.id]) next[student.id] = defaultTemplate.id;
      });
      return next;
    });
  }, [community, whatsAppTemplates]);

  useEffect(() => {
    const selected = community.find((s) => s.id === selectedStudentId);
    if (!selected) {
      setStudentForm({ full_name: '', email_verified: false });
      setSelectedSubscriptionId('');
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
      capacidad: '1',
      numero_clases: '12',
      vigencia_semanas: '4',
      detalles: '',
      precio_base: '0',
      estado: 'active'
    });
  };

  const resetHighlightForm = () => {
    setHighlightForm({
      id: '',
      title: '',
      subtitle: '',
      image_url: '',
      cta_label: '',
      cta_mode: 'internal',
      cta_internal_url: '/',
      cta_external_url: '',
      start_at: '',
      end_at: '',
      sort_order: '0',
      is_active: true
    });
  };

  const mapHighlightToForm = (item: any) => ({
    ...(String(item?.cta_url || '').trim().startsWith('/')
      ? { cta_mode: 'internal' as const, cta_internal_url: String(item?.cta_url || '').trim() || '/', cta_external_url: '' }
      : { cta_mode: 'external' as const, cta_internal_url: '/', cta_external_url: String(item?.cta_url || '').trim() }),
    id: String(item?.id || ''),
    title: String(item?.title || ''),
    subtitle: String(item?.subtitle || ''),
    image_url: String(item?.image_url || ''),
    cta_label: String(item?.cta_label || ''),
    start_at: item?.start_at ? String(item.start_at).slice(0, 16) : '',
    end_at: item?.end_at ? String(item.end_at).slice(0, 16) : '',
    sort_order: String(Number(item?.sort_order || 0)),
    is_active: Number(item?.is_active ?? 1) === 1
  });

  const loadCoachHighlights = async () => {
    const rows = await api.coach.getHighlights();
    setHighlights(Array.isArray(rows) ? rows : []);
  };

  const handleHighlightImageUpload = async (file: File) => {
    const isImage = String(file?.type || '').startsWith('image/');
    if (!isImage) {
      setError('Selecciona una imagen válida para el highlight.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('La imagen del highlight no puede superar 8 MB.');
      return;
    }
    try {
      setUploadingHighlightImage(true);
      setError(null);
      const uploaded: any = await api.uploadImage(file);
      const secureUrl = String(uploaded?.secure_url || '').trim();
      if (!secureUrl) throw new Error('No pudimos obtener la URL de la imagen.');
      setHighlightForm((prev) => ({ ...prev, image_url: secureUrl }));
    } catch (err: any) {
      logger.error('Error uploading highlight image', err);
      setError(resolveErrorMessage(err, 'No pudimos subir la imagen del highlight.'));
    } finally {
      setUploadingHighlightImage(false);
    }
  };

  const handleSaveHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const title = String(highlightForm.title || '').trim();
      if (!title) throw new Error('El título del highlight es obligatorio.');
      const startAt = highlightForm.start_at ? new Date(highlightForm.start_at).toISOString() : null;
      const endAt = highlightForm.end_at ? new Date(highlightForm.end_at).toISOString() : null;
      if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
        throw new Error('La fecha final no puede ser menor a la fecha inicial.');
      }
      const resolvedCtaUrl =
        highlightForm.cta_mode === 'internal'
          ? String(highlightForm.cta_internal_url || '').trim()
          : String(highlightForm.cta_external_url || '').trim();
      if (highlightForm.cta_mode === 'external' && resolvedCtaUrl) {
        const isValidExternal = /^https?:\/\//i.test(resolvedCtaUrl);
        if (!isValidExternal) throw new Error('La URL externa debe iniciar con http:// o https://');
      }
      const payload = {
        title,
        subtitle: String(highlightForm.subtitle || '').trim() || null,
        image_url: String(highlightForm.image_url || '').trim() || null,
        cta_label: String(highlightForm.cta_label || '').trim() || null,
        cta_url: resolvedCtaUrl || null,
        start_at: startAt,
        end_at: endAt,
        sort_order: highlightForm.id
          ? normalizeIntegerInput(highlightForm.sort_order, 0, 0)
          : ((sortedHighlights.length
              ? Math.max(...sortedHighlights.map((x: any) => Number(x?.sort_order || 0)))
              : 0) + 1),
        is_active: highlightForm.is_active ? 1 : 0,
        actor_id: user.id
      };
      if (highlightForm.id) {
        await api.coach.updateHighlight(highlightForm.id, payload);
      } else {
        await api.coach.createHighlight(payload);
      }
      await Promise.all([loadCoachHighlights(), refreshHighlights()]);
      resetHighlightForm();
    } catch (err: any) {
      logger.error('Error saving highlight', err);
      const explicitMessage = String(err?.message || '').trim();
      setError(explicitMessage || resolveErrorMessage(err, 'No se pudo guardar el highlight.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.coach.deleteHighlight(id);
      await Promise.all([loadCoachHighlights(), refreshHighlights()]);
      if (highlightForm.id === id) resetHighlightForm();
    } catch (err: any) {
      logger.error('Error deleting highlight', err);
      setError(resolveErrorMessage(err, 'No se pudo eliminar el highlight.'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHighlight = async (item: HighlightItem) => {
    try {
      setLoading(true);
      setError(null);
      await api.coach.toggleHighlight(item.id, {
        is_active: Number(item.is_active || 0) === 1 ? 0 : 1,
        actor_id: user.id
      });
      await Promise.all([loadCoachHighlights(), refreshHighlights()]);
    } catch (err: any) {
      logger.error('Error toggling highlight', err);
      setError(resolveErrorMessage(err, 'No se pudo actualizar el estado del highlight.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMoveHighlight = async (id: string, direction: 'up' | 'down') => {
    try {
      const list = [...sortedHighlights];
      const index = list.findIndex((x: any) => String(x?.id || '') === id);
      if (index < 0) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return;
      const current = list[index] as any;
      const target = list[targetIndex] as any;
      const currentOrder = Number(current?.sort_order || 0);
      const targetOrder = Number(target?.sort_order || 0);

      await Promise.all([
        api.coach.updateHighlight(String(current.id), {
          title: current.title,
          subtitle: current.subtitle || null,
          image_url: current.image_url || null,
          cta_label: current.cta_label || null,
          cta_url: current.cta_url || null,
          start_at: current.start_at || null,
          end_at: current.end_at || null,
          sort_order: targetOrder,
          is_active: Number(current.is_active || 0),
          actor_id: user.id
        }),
        api.coach.updateHighlight(String(target.id), {
          title: target.title,
          subtitle: target.subtitle || null,
          image_url: target.image_url || null,
          cta_label: target.cta_label || null,
          cta_url: target.cta_url || null,
          start_at: target.start_at || null,
          end_at: target.end_at || null,
          sort_order: currentOrder,
          is_active: Number(target.is_active || 0),
          actor_id: user.id
        })
      ]);

      await Promise.all([loadCoachHighlights(), refreshHighlights()]);
    } catch (err: any) {
      logger.error('Error moving highlight order', err);
      setError(resolveErrorMessage(err, 'No se pudo actualizar el orden del highlight.'));
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const capacidad = Number.parseInt(packageForm.capacidad || '1', 10);
      const numeroClases = Number.parseInt(packageForm.numero_clases || '12', 10);
      const vigenciaSemanas = Number.parseInt(packageForm.vigencia_semanas || '4', 10);
      const precioBase = Number.parseFloat(packageForm.precio_base || '0');
      const payload = {
        ...packageForm,
        actor_id: user.id,
        capacidad: Number.isFinite(capacidad) ? capacidad : 1,
        numero_clases: Number.isFinite(numeroClases) ? numeroClases : 12,
        vigencia_semanas: Number.isFinite(vigenciaSemanas) ? vigenciaSemanas : 4,
        precio_base: Number.isFinite(precioBase) ? precioBase : 0
      };
      if (payload.capacidad > 1 && payload.numero_clases % payload.capacidad !== 0) {
        throw new Error('El total de clases debe ser divisible equitativamente entre la capacidad del paquete.');
      }
      if (packageForm.id) {
        await api.coach.updatePackage(packageForm.id, payload);
      } else {
        await api.coach.createPackage(payload);
      }
      await refreshPackages();
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
      await refreshPackages();
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
      await refreshCommunityView(selectedStudentId);
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
        reuse_active_subscription: Boolean(subscriptionForm.reuse_active_subscription),
        actor_id: user.id
      });
      await refreshCommunityView(selectedStudentId, { includePackages: true, includeCashCut: true });
      setSubscriptionForm({
        paquete_id: '',
        metodo_pago: 'transferencia',
        referencia: '',
        monto: '',
        reuse_active_subscription: false
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
      await refreshCommunityView(selectedStudentId);
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
      await refreshCommunityView(selectedStudentId, { includeClasses: true });
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
      await refreshCommunityView(selectedStudentId, { includeClasses: true });
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
      await refreshCommunityView(selectedStudentId);
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
      await refreshCommunityView(selectedStudentId);
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

  const normalizePhoneForWa = (phone?: string) => String(phone || '').replace(/[^\d]/g, '');

  const buildWhatsAppMessage = (templateBody: string, student: CommunityStudent) => {
    const formatClassLabel = (classRow: any) => {
      if (!classRow) return 'Sin clase';
      const dateLabel = classRow.date ? new Date(`${classRow.date}T00:00:00`).toLocaleDateString('es-MX') : '';
      const timeLabel = classRow.start_time ? String(classRow.start_time).slice(0, 5) : '';
      return `${classRow.type || 'Clase'}${dateLabel ? ` - ${dateLabel}` : ''}${timeLabel ? ` ${timeLabel}` : ''}`.trim();
    };
    const activeClass = student.active_class;
    const nextClass = student.next_class;
    const expiryRaw = student.current_subscription?.fecha_vencimiento;
    const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
    const expiryLabel = expiryDate && !Number.isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleDateString('es-MX')
      : 'Sin vencimiento';
    const nowLabel = new Date().toLocaleString('es-MX');
    const replacements: Record<string, string> = {
      nombre: student.full_name || '',
      correo: student.email || '',
      paquete: student.current_subscription?.package_name || 'Sin paquete activo',
      clases_restantes: String(student.current_subscription?.clases_restantes ?? student.credits_remaining ?? 0),
      clase: nextClass?.type || 'tu próxima clase',
      fecha: nextClass?.date || '',
      hora_inicio: String(nextClass?.start_time || '').slice(0, 5),
      hora_fin: String(nextClass?.end_time || '').slice(0, 5)
    };
    return templateBody.replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? '');
  };

  const buildWhatsAppMessageWithTokens = (templateBody: string, student: CommunityStudent) => {
    const formatClassLabel = (classRow: any) => {
      if (!classRow) return 'Sin clase';
      const dateLabel = classRow.date ? new Date(`${classRow.date}T00:00:00`).toLocaleDateString('es-MX') : '';
      const timeLabel = classRow.start_time ? String(classRow.start_time).slice(0, 5) : '';
      return `${classRow.type || 'Clase'}${dateLabel ? ` - ${dateLabel}` : ''}${timeLabel ? ` ${timeLabel}` : ''}`.trim();
    };
    const activeClass = student.active_class;
    const nextClass = student.next_class;
    const expiryRaw = student.current_subscription?.fecha_vencimiento;
    const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
    const expiryLabel = expiryDate && !Number.isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleDateString('es-MX')
      : 'Sin vencimiento';
    const nowLabel = new Date().toLocaleString('es-MX');
    const replacements: Record<string, string> = {
      nombre_alumno: student.full_name || '',
      email_alumno: student.email || '',
      whatsapp_alumno: student.whatsapp_phone || '',
      paquete_actual: student.current_subscription?.package_name || 'Sin paquete activo',
      creditos_restantes: String(student.current_subscription?.clases_restantes ?? student.credits_remaining ?? 0),
      fecha_vencimiento_paquete: expiryLabel,
      dias_para_vencer: typeof student.days_to_expiry === 'number' ? String(student.days_to_expiry) : 'N/A',
      clase_activa: formatClassLabel(activeClass),
      proxima_clase: formatClassLabel(nextClass),
      fecha_cancelacion: nowLabel,
      email_verificado: Number(student.email_verified || 0) === 1 ? 'Sí' : 'No',
      nombre_negocio: 'Focus Fitness',
      nombre: student.full_name || '',
      correo: student.email || '',
      paquete: student.current_subscription?.package_name || 'Sin paquete activo',
      clases_restantes: String(student.current_subscription?.clases_restantes ?? student.credits_remaining ?? 0),
      clase: formatClassLabel(nextClass),
      fecha: nextClass?.date || '',
      hora_inicio: String(nextClass?.start_time || '').slice(0, 5),
      hora_fin: String(nextClass?.end_time || '').slice(0, 5)
    };
    const withDouble = templateBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => replacements[key] ?? '');
    return withDouble.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => replacements[key] ?? '');
  };

  const insertVariableInTemplate = (variableToken: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) {
      setTemplateForm((prev) => ({ ...prev, body: `${prev.body}${variableToken}` }));
      return;
    }
    const start = textarea.selectionStart ?? templateForm.body.length;
    const end = textarea.selectionEnd ?? templateForm.body.length;
    const nextBody = `${templateForm.body.slice(0, start)}${variableToken}${templateForm.body.slice(end)}`;
    setTemplateForm((prev) => ({ ...prev, body: nextBody }));
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + variableToken.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const openWhatsAppForStudent = (student: CommunityStudent) => {
    const selectedTemplateId = templateSelectionByStudent[student.id];
    const template = whatsAppTemplates.find((tpl) => tpl.id === selectedTemplateId) || whatsAppTemplates[0];
    if (!template) return;
    const phone = normalizePhoneForWa(student.whatsapp_phone);
    if (!phone) {
      setError(`El alumno ${student.full_name} no tiene número de WhatsApp registrado.`);
      return;
    }
    const message = buildWhatsAppMessageWithTokens(template.body, student);
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.body.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const payload = {
        name: templateForm.name.trim(),
        body: templateForm.body.trim(),
        is_default_cancellation: templateForm.is_default_cancellation ? 1 : 0,
        actor_id: user.id
      };
      if (templateForm.id) {
        await api.coach.updateWhatsAppTemplate(templateForm.id, payload);
      } else {
        await api.coach.createWhatsAppTemplate(payload);
      }
      await loadWhatsAppTemplates();
      setTemplateForm({ id: '', name: '', body: '', is_default_cancellation: false });
    } catch (err: any) {
      logger.error('Error saving WhatsApp template', err);
      setError(resolveErrorMessage(err, 'No se pudo guardar la plantilla de WhatsApp'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignSubscription = async () => {
    if (!selectedStudentId || !selectedActiveSubscription?.id) return;
    const confirmed = window.confirm(
      '¿Seguro que quieres desasignar este paquete? Esta acción desactiva el acceso del alumno seleccionado.'
    );
    if (!confirmed) return;
    try {
      setLoading(true);
      setError(null);
      await api.coach.unassignSubscription(selectedActiveSubscription.id, {
        alumno_id: selectedStudentId,
        actor_id: user.id
      });
      await refreshCommunityView(selectedStudentId, { includePackages: true, includeCashCut: true });
    } catch (err: any) {
      logger.error('Error unassigning subscription', err);
      setError(resolveErrorMessage(err, 'No se pudo desasignar el paquete'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.coach.deleteWhatsAppTemplate(templateId);
      await loadWhatsAppTemplates();
      if (templateForm.id === templateId) {
        setTemplateForm({ id: '', name: '', body: '', is_default_cancellation: false });
      }
    } catch (err: any) {
      logger.error('Error deleting WhatsApp template', err);
      setError(resolveErrorMessage(err, 'No se pudo eliminar la plantilla de WhatsApp'));
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = community.find((s) => s.id === selectedStudentId) || null;
  const studentSubscriptions = Array.isArray(selectedStudentDetail?.subscriptions) ? selectedStudentDetail.subscriptions : [];
  const selectedActiveSubscription =
    studentSubscriptions.find((sub: any) => sub?.id === selectedSubscriptionId) ||
    studentSubscriptions.find((sub: any) => sub?.estado === 'active') ||
    null;
  const activityRows = Array.isArray(selectedStudentDetail?.activity) ? selectedStudentDetail.activity : [];
  const filteredActivityRows = activityRows.filter((row: any) => {
    const rowType = String(row?.tipo || '').trim();
    if (activityFilterType !== 'all' && rowType !== activityFilterType) return false;

    if (!activityDateFrom && !activityDateTo) return true;
    const ts = row?.timestamp ? new Date(row.timestamp) : null;
    if (!ts || Number.isNaN(ts.getTime())) return false;

    if (activityDateFrom) {
      const from = new Date(`${activityDateFrom}T00:00:00`);
      if (ts < from) return false;
    }
    if (activityDateTo) {
      const to = new Date(`${activityDateTo}T23:59:59`);
      if (ts > to) return false;
    }
    return true;
  });
  const canManageBeneficiaries = !!(selectedActiveSubscription && Number(selectedActiveSubscription.package_capacity || 1) > 1 && Number(selectedActiveSubscription.es_titular || 0) === 1);
  const selectedSubscriptionBeneficiaries = Array.isArray(selectedActiveSubscription?.beneficiaries) ? selectedActiveSubscription.beneficiaries : [];
  const beneficiaryCandidateStudents = community.filter((student) => {
    if (!selectedStudentId) return false;
    if (student.id === selectedStudentId) return false;
    return !selectedSubscriptionBeneficiaries.some((b: any) => b.alumno_id === student.id && !b.deleted_at);
  });

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px]">
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">{packageForm.id ? 'Editar paquete' : 'Crear paquete'}</h4>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Nombre del Paquete</label>
                <input className="w-full border border-zinc-200 rounded-xl p-3 text-sm" placeholder="Ej. FOCUS WORK" value={packageForm.nombre} onChange={(e) => setPackageForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Capacidad</label>
                  <div className="flex items-stretch gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.capacidad,
                          Number.parseInt(packageForm.capacidad || '1', 10) || 1,
                          -1,
                          (next) => setPackageForm((prev) => ({ ...prev, capacidad: next })),
                          1,
                          3
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Reducir capacidad"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step={1}
                      min={1}
                      max={3}
                      className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm text-center min-h-[44px]"
                      placeholder="Capacidad"
                      value={packageForm.capacidad}
                      onChange={(e) => setPackageForm((prev) => ({ ...prev, capacidad: e.target.value }))}
                      onBlur={() => {
                        const normalized = Math.min(3, Math.max(1, Number.parseInt(packageForm.capacidad || '1', 10) || 1));
                        setPackageForm((prev) => ({ ...prev, capacidad: String(normalized) }));
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.capacidad,
                          Number.parseInt(packageForm.capacidad || '1', 10) || 1,
                          1,
                          (next) => setPackageForm((prev) => ({ ...prev, capacidad: next })),
                          1,
                          3
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Aumentar capacidad"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Numero de Clases</label>
                  <div className="flex items-stretch gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.numero_clases,
                          Number.parseInt(packageForm.numero_clases || '1', 10) || 1,
                          -1,
                          (next) => setPackageForm((prev) => ({ ...prev, numero_clases: next })),
                          1
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Reducir numero de clases"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step={1}
                      min={1}
                      className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm text-center min-h-[44px]"
                      placeholder="Clases"
                      value={packageForm.numero_clases}
                      onChange={(e) => setPackageForm((prev) => ({ ...prev, numero_clases: e.target.value }))}
                      onBlur={() => {
                        const normalized = Math.max(1, Number.parseInt(packageForm.numero_clases || '1', 10) || 1);
                        setPackageForm((prev) => ({ ...prev, numero_clases: String(normalized) }));
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.numero_clases,
                          Number.parseInt(packageForm.numero_clases || '1', 10) || 1,
                          1,
                          (next) => setPackageForm((prev) => ({ ...prev, numero_clases: next })),
                          1
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Aumentar numero de clases"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vigencia</label>
                  <div className="flex items-stretch gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.vigencia_semanas,
                          Number.parseInt(packageForm.vigencia_semanas || '1', 10) || 1,
                          -1,
                          (next) => setPackageForm((prev) => ({ ...prev, vigencia_semanas: next })),
                          1
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Reducir vigencia"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step={1}
                      min={1}
                      className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm text-center min-h-[44px]"
                      placeholder="Semanas"
                      value={packageForm.vigencia_semanas}
                      onChange={(e) => setPackageForm((prev) => ({ ...prev, vigencia_semanas: e.target.value }))}
                      onBlur={() => {
                        const normalized = Math.max(1, Number.parseInt(packageForm.vigencia_semanas || '1', 10) || 1);
                        setPackageForm((prev) => ({ ...prev, vigencia_semanas: String(normalized) }));
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        bumpIntegerInput(
                          packageForm.vigencia_semanas,
                          Number.parseInt(packageForm.vigencia_semanas || '1', 10) || 1,
                          1,
                          (next) => setPackageForm((prev) => ({ ...prev, vigencia_semanas: next })),
                          1
                        )
                      }
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Aumentar vigencia"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Precio Base</label>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  min={0}
                  step="0.01"
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                  placeholder="Precio Base"
                  value={packageForm.precio_base}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, precio_base: e.target.value }))}
                  onBlur={() => {
                    const parsed = Number.parseFloat(packageForm.precio_base || '0');
                    const normalized = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                    setPackageForm((prev) => ({ ...prev, precio_base: String(normalized) }));
                  }}
                  required
                />
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
                      <button
                        type="button"
                        onClick={() =>
                          setPackageForm({
                            ...pkg,
                            capacidad: String(pkg.capacidad ?? 1),
                            numero_clases: String(pkg.numero_clases ?? 12),
                            vigencia_semanas: String(pkg.vigencia_semanas ?? 4),
                            precio_base: String(Number(pkg.precio_base || 0))
                          })
                        }
                        className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                      >
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDeletePackage(pkg.id)} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest">Baja</button>
                    </div>
                  </div>
                </div>
              ))}
              {packages.length === 0 && <p className="text-sm text-zinc-400">Aun no hay paquetes registrados.</p>}
            </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
              <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">
                {highlightForm.id ? 'Editar highlight' : 'Nuevo highlight promocional'}
              </h4>
              <form onSubmit={handleSaveHighlight} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Título</label>
                  <input
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                    value={highlightForm.title}
                    onChange={(e) => setHighlightForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej. Reto de mayo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Subtítulo</label>
                  <textarea
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                    rows={3}
                    value={highlightForm.subtitle}
                    onChange={(e) => setHighlightForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Texto breve para explicar la promoción."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">CTA label</label>
                    <input
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.cta_label}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, cta_label: e.target.value }))}
                      placeholder="Ej. Reservar ahora"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Tipo de CTA</label>
                    <select
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.cta_mode}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, cta_mode: e.target.value as 'internal' | 'external' }))}
                    >
                      <option value="internal">Interno (app)</option>
                      <option value="external">Externo (URL)</option>
                    </select>
                  </div>
                </div>
                {highlightForm.cta_mode === 'internal' ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Ruta interna</label>
                    <select
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.cta_internal_url}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, cta_internal_url: e.target.value }))}
                    >
                      {internalRouteOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">URL externa</label>
                    <input
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.cta_external_url}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, cta_external_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vigencia inicio</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.start_at}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, start_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vigencia fin</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]"
                      value={highlightForm.end_at}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, end_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Orden</label>
                    <div className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px] bg-zinc-50 text-zinc-600">
                      {highlightForm.id
                        ? `Posición actual: #${sortedHighlights.findIndex((x: any) => x.id === highlightForm.id) + 1 || 1}`
                        : 'Se ubicará al final. Luego puedes moverlo con Subir/Bajar.'}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-700 min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={highlightForm.is_active}
                      onChange={(e) => setHighlightForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span className="font-semibold">Activo</span>
                  </label>
                </div>
                <label className="flex items-center justify-between gap-3 border border-zinc-200 rounded-xl px-3 py-3 cursor-pointer min-h-[44px]">
                  <span className="text-xs font-semibold text-zinc-600">
                    {uploadingHighlightImage ? 'Subiendo imagen...' : highlightForm.image_url ? 'Imagen cargada' : 'Subir imagen'}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-600">Archivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingHighlightImage}
                    className="sr-only"
                    onChange={async (e) => {
                      const inputEl = e.currentTarget;
                      const file = e.target.files?.[0];
                      if (file) await handleHighlightImageUpload(file);
                      inputEl.value = '';
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button disabled={loading || uploadingHighlightImage} className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest min-h-[44px]">
                    {highlightForm.id ? 'Actualizar highlight' : 'Guardar highlight'}
                  </button>
                  {highlightForm.id && (
                    <button
                      type="button"
                      onClick={resetHighlightForm}
                      className="px-5 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest min-h-[44px]"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 space-y-4">
              <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900">Preview y listado de highlights</h4>
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-900 text-white">
                {highlightForm.image_url ? (
                  <img src={highlightForm.image_url} alt={highlightForm.title || 'preview'} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <i className="fas fa-image text-3xl"></i>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <p className="text-lg font-black uppercase tracking-tight">{highlightForm.title || 'Título del highlight'}</p>
                  <p className="text-sm text-zinc-300">{highlightForm.subtitle || 'Subtítulo del highlight.'}</p>
                  <button type="button" className="px-4 py-2 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest min-h-[44px]">
                    {highlightForm.cta_label || 'Call to action'}
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {sortedHighlights.length === 0 && <p className="text-sm text-zinc-400">Aún no hay highlights registrados.</p>}
                {sortedHighlights.map((item, idx) => (
                  <div key={item.id} className="border border-zinc-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-zinc-900 uppercase tracking-tight">#{idx + 1} · {item.title}</p>
                      <button
                        type="button"
                        onClick={() => handleToggleHighlight(item)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest min-h-[44px] ${
                          Number(item.is_active || 0) === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {Number(item.is_active || 0) === 1 ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                    {item.image_url && (
                      <img src={String(item.image_url)} alt={item.title} className="w-full h-28 object-cover rounded-xl border border-zinc-200" />
                    )}
                    <p className="text-xs text-zinc-500">{item.subtitle || 'Sin subtítulo'}</p>
                    <p className="text-[10px] text-zinc-500">
                      Orden: {Number(item.sort_order || 0)} | Vigencia: {item.start_at ? new Date(item.start_at).toLocaleDateString('es-MX') : 'Sin inicio'} - {item.end_at ? new Date(item.end_at).toLocaleDateString('es-MX') : 'Sin fin'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveHighlight(item.id, 'up')}
                        disabled={idx === 0}
                        className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest min-h-[44px] disabled:opacity-40"
                      >
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHighlight(item.id, 'down')}
                        disabled={idx === sortedHighlights.length - 1}
                        className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest min-h-[44px] disabled:opacity-40"
                      >
                        Bajar
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightForm(mapHighlightToForm(item))}
                        className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest min-h-[44px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(item.id)}
                        className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest min-h-[44px]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6">
            <h4 className="text-2xl font-bebas uppercase tracking-wide text-zinc-900 mb-4">Seguimiento por WhatsApp</h4>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <form onSubmit={handleSaveTemplate} className="space-y-3">
                <input
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                  placeholder="Nombre de plantilla"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
                <textarea
                  ref={templateTextareaRef}
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[110px]"
                  placeholder="Mensaje con variables dinámicas, por ejemplo: Hola {{nombre_alumno}}, tu próxima clase es {{proxima_clase}}."
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))}
                  required
                />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Variables disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {WHATSAPP_VARIABLES.map((variableToken) => (
                      <button
                        key={variableToken}
                        type="button"
                        onClick={() => insertVariableInTemplate(variableToken)}
                        className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-black tracking-widest"
                      >
                        {variableToken}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <input
                    type="checkbox"
                    checked={templateForm.is_default_cancellation}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, is_default_cancellation: e.target.checked }))}
                  />
                  Plantilla predeterminada de cancelación
                </label>
                <div className="flex gap-2">
                  <button disabled={loading} className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
                    {templateForm.id ? 'Actualizar plantilla' : 'Guardar plantilla'}
                  </button>
                  {templateForm.id && (
                    <button
                      type="button"
                      onClick={() => setTemplateForm({ id: '', name: '', body: '', is_default_cancellation: false })}
                      className="px-5 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {whatsAppTemplates.length === 0 && <p className="text-sm text-zinc-400">No hay plantillas registradas.</p>}
                {whatsAppTemplates.map((tpl) => (
                  <div key={tpl.id} className="border border-zinc-100 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-zinc-900">{tpl.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {Number(tpl.is_default_cancellation || 0) === 1 ? 'Predeterminada cancelación' : 'Plantilla'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTemplateForm({
                            id: tpl.id,
                            name: tpl.name,
                            body: tpl.body,
                            is_default_cancellation: Number(tpl.is_default_cancellation || 0) === 1
                          })}
                          className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 mt-2 line-clamp-3">{tpl.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                <th className="py-3">Seguimiento WhatsApp</th>
                <th className="py-3">Notificado por correo</th>
              </tr>
            </thead>
            <tbody>
              {community.length === 0 ? (
                <tr className="border-t border-zinc-100">
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
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
                    <td className="py-4">
                      <div className="space-y-2 min-w-[240px]">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{student.whatsapp_phone || 'Sin WhatsApp'}</p>
                        <div className="flex gap-2">
                          <select
                            className="border border-zinc-200 rounded-lg p-2 text-xs flex-1 min-h-[44px]"
                            value={templateSelectionByStudent[student.id] || ''}
                            onChange={(e) => setTemplateSelectionByStudent((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          >
                            <option value="">Plantilla</option>
                            {whatsAppTemplates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => openWhatsAppForStudent(student)}
                            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
                          >
                            Abrir
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${student.notified_by_email ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {student.notified_by_email ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  {studentSubscriptions.length > 1 && (
                    <select
                      className="w-full border border-zinc-200 rounded-xl p-3 text-sm"
                      value={selectedActiveSubscription.id}
                      onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                    >
                      {studentSubscriptions.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>
                          {(sub.package_name || 'Manual')} | {sub.estado} | {sub.fecha_vencimiento?.slice(0, 10) || 'Sin vencimiento'}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm">
                    <p className="font-black text-zinc-900">{selectedActiveSubscription.package_name || 'Manual'}</p>
                    <p className="text-zinc-600">
                      Saldo actual: {Number(selectedActiveSubscription.congelado || 0) === 1 ? 0 : (selectedActiveSubscription.alumno_clases_restantes ?? selectedStudent?.credits_remaining ?? 0)} clases
                    </p>
                    <p className="text-zinc-600">Vence: {selectedActiveSubscription.fecha_vencimiento?.slice(0, 10) || 'N/A'}</p>
                    <p className="text-zinc-600">
                      Rol: {Number(selectedActiveSubscription.es_titular || 0) === 1
                        ? 'Titular'
                        : `Beneficiario de ${selectedActiveSubscription.titular_nombre || 'Titular'}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleToggleFreeze(selectedActiveSubscription.id, Number(selectedActiveSubscription.congelado || 0) === 1)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${Number(selectedActiveSubscription.congelado || 0) === 1 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}
                    >
                      {Number(selectedActiveSubscription.congelado || 0) === 1 ? 'Reanudar paquete' : 'Pausar paquete'}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleUnassignSubscription}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Desasignar paquete
                    </button>
                  </div>
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
                <div className="flex items-stretch gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number.parseInt(manualCreditsForm.amount || '0', 10);
                      const next = (Number.isFinite(current) ? current : 0) - 1;
                      setManualCreditsForm((prev) => ({ ...prev, amount: String(next) }));
                    }}
                    className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                    aria-label="Reducir ajuste"
                  >
                    -
                  </button>
                  <input type="number" inputMode="numeric" pattern="-?[0-9]*" step={1} className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm text-center min-h-[44px]" placeholder="Cantidad (+/-)" value={manualCreditsForm.amount} onChange={(e) => setManualCreditsForm((prev) => ({ ...prev, amount: e.target.value }))} required />
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number.parseInt(manualCreditsForm.amount || '0', 10);
                      const next = (Number.isFinite(current) ? current : 0) + 1;
                      setManualCreditsForm((prev) => ({ ...prev, amount: String(next) }));
                    }}
                    className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                    aria-label="Aumentar ajuste"
                  >
                    +
                  </button>
                </div>
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
                  <div className="flex items-stretch gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number.parseFloat(subscriptionForm.monto || '0');
                        const next = Math.max(0, (Number.isFinite(current) ? current : 0) - 50);
                        setSubscriptionForm((prev) => ({ ...prev, monto: String(next) }));
                      }}
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Reducir monto"
                    >
                      -
                    </button>
                    <input type="number" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" min={0} step="0.01" className="flex-1 min-w-0 border border-zinc-200 rounded-xl p-3 text-sm text-center min-h-[44px]" placeholder="Monto (opcional)" value={subscriptionForm.monto} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, monto: e.target.value }))} />
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number.parseFloat(subscriptionForm.monto || '0');
                        const next = Math.max(0, (Number.isFinite(current) ? current : 0) + 50);
                        setSubscriptionForm((prev) => ({ ...prev, monto: String(next) }));
                      }}
                      className="w-10 min-h-[44px] shrink-0 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-black"
                      aria-label="Aumentar monto"
                    >
                      +
                    </button>
                  </div>
                  <select className="border border-zinc-200 rounded-xl p-3 text-sm" value={subscriptionForm.metodo_pago} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <input className="border border-zinc-200 rounded-xl p-3 text-sm w-full" placeholder="Referencia" value={subscriptionForm.referencia} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, referencia: e.target.value }))} />
                <label className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={Boolean(subscriptionForm.reuse_active_subscription)}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({ ...prev, reuse_active_subscription: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="font-semibold">Reutilizar suscripción activa del mismo paquete</span>
                </label>
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
                        <span className="block text-zinc-500 mt-1">
                          {Number(sub.es_titular || 0) === 1 ? 'Titular' : `Beneficiario de ${sub.titular_nombre || 'Titular'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-black uppercase tracking-widest text-[11px] text-zinc-500 mb-3">Historial de actividad</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                    <select
                      className="border border-zinc-200 rounded-lg p-2 text-xs"
                      value={activityFilterType}
                      onChange={(e) => setActivityFilterType(e.target.value)}
                    >
                      <option value="all">Todos los tipos</option>
                      <option value="attendance">Asistencia</option>
                      <option value="reservation">Reserva</option>
                      <option value="cancellation">Cancelación</option>
                      <option value="credit_adjustment">Ajuste de créditos</option>
                      <option value="package_sale">Venta de paquete</option>
                    </select>
                    <input
                      type="date"
                      className="border border-zinc-200 rounded-lg p-2 text-xs"
                      value={activityDateFrom}
                      onChange={(e) => setActivityDateFrom(e.target.value)}
                    />
                    <input
                      type="date"
                      className="border border-zinc-200 rounded-lg p-2 text-xs"
                      value={activityDateTo}
                      onChange={(e) => setActivityDateTo(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActivityFilterType('all');
                        setActivityDateFrom('');
                        setActivityDateTo('');
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {filteredActivityRows.length === 0 && (
                      <p className="text-sm text-zinc-400">Sin actividad registrada.</p>
                    )}
                    {filteredActivityRows.map((row: any, index: number) => (
                      <div key={`${row.tipo}_${row.timestamp}_${index}`} className="text-xs bg-zinc-50 rounded-lg p-2">
                        <p className="font-black text-zinc-900 uppercase">
                          {row.tipo === 'attendance'
                            ? 'Asistencia'
                            : row.tipo === 'reservation'
                              ? 'Reserva'
                              : row.tipo === 'cancellation'
                                ? 'Cancelación'
                                : row.tipo === 'package_sale'
                                  ? 'Venta paquete'
                                  : 'Ajuste'}
                        </p>
                        <p className="text-zinc-600">
                          {row.evento} | {row.referencia}
                          {row.ajuste != null ? ` | ajuste: ${row.ajuste > 0 ? '+' : ''}${row.ajuste}` : ''}
                        </p>
                        {row.saldo_antes != null && row.saldo_despues != null && (
                          <p className="text-zinc-500">
                            Saldo: {row.saldo_antes} → {row.saldo_despues}
                          </p>
                        )}
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
                  <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]" value={cashRange.startDate} onChange={(e) => setCashRange((prev) => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fecha fin</label>
                  <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[44px]" value={cashRange.endDate} onChange={(e) => setCashRange((prev) => ({ ...prev, endDate: e.target.value }))} />
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
