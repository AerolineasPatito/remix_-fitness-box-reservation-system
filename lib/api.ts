
import { toFriendlyError } from './errorMessages.ts';

const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

export const logger = {
  log: (message: string, data?: any) => {
    if (!isDev) return;
    console.log(`%c[FOCUS-LOG]: ${message}`, 'color: #3794a4; font-weight: bold;', data || '');
  },
  error: (message: string, error?: any) => {
    if (!isDev) return;
    console.error(`%c[FOCUS-ERROR]: ${message}`, 'color: #ef4444; font-weight: bold;', error || '');
  }
};

const createApiError = (input: any) => {
  const normalized = toFriendlyError(input, {
    fallback: 'Algo salió mal al procesar tu solicitud. Intenta de nuevo.'
  });
  const error = new Error(normalized.message);
  (error as any).code = normalized.code;
  (error as any).status = normalized.status;
  (error as any).retryable = normalized.retryable;
  (error as any).raw = input;
  return error;
};

const handleUnauthorized = () => {
  try {
    localStorage.removeItem('focus_session');
    sessionStorage.setItem('focus_auth_feedback', 'Tu sesión expiró. Inicia sesión de nuevo.');
  } catch {}
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

const handleResponse = async (res: Response, options?: { suppressUnauthorizedRedirect?: boolean }) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    
    if (!res.ok) {
      const normalizedError = createApiError({
        ...data,
        message: data?.message || data?.error,
        status: res.status
      });
      if (res.status === 401 && !options?.suppressUnauthorizedRedirect) {
        handleUnauthorized();
      }
      throw normalizedError;
    }
    
    return data;
  }

  if (!res.ok) {
    const normalizedError = createApiError({
      status: res.status,
      message: `HTTP ${res.status}`
    });
    if (res.status === 401 && !options?.suppressUnauthorizedRedirect) {
      handleUnauthorized();
    }
    throw normalizedError;
  }

  return res.text();
};

const nativeFetch = globalThis.fetch.bind(globalThis);

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await nativeFetch(input, init);
  } catch (error: any) {
    throw createApiError(error);
  }
};

const fetch = safeFetch;

const normalizeClassPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.is_event != null) return payload;
  if (payload.isEvent != null) {
    return {
      ...payload,
      is_event: payload.isEvent ? 1 : 0
    };
  }
  return payload;
};

export const api = {
  getClasses: async (year?: number | string) => {
    const params = new URLSearchParams();
    if (year != null && year !== '') params.set('year', String(year));
    const query = params.toString();
    const res = await fetch(`/api/classes${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },
  getCalendarClasses: async (filters?: { startDate?: string; endDate?: string; viewerId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.viewerId) params.set('viewerId', filters.viewerId);
    const query = params.toString();
    const res = await fetch(`/api/calendar/classes${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },
  getClassesCalendar: async (filters?: { year?: number | string; includeRoster?: boolean }) => {
    const params = new URLSearchParams();
    params.set('includeAllStates', 'true');
    if (filters?.year != null && filters.year !== '') params.set('year', String(filters.year));
    if (filters?.includeRoster) params.set('includeRoster', 'true');
    const query = params.toString();
    const res = await fetch(`/api/classes?${query}`);
    return handleResponse(res);
  },
  getClassTypes: async () => {
    const res = await fetch('/api/class-types');
    return handleResponse(res);
  },
  createClassType: async (data: any) => {
    const res = await fetch('/api/class-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  updateClassType: async (id: string, data: any) => {
    const res = await fetch(`/api/class-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  deleteClassType: async (id: string) => {
    const res = await fetch(`/api/class-types/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    });
    return handleResponse(res);
  },
  getAvailability: async () => {
    const res = await fetch('/api/availability');
    return handleResponse(res);
  },
  getProfile: async (id: string) => {
    const res = await fetch(`/api/profile/${id}`);
    return handleResponse(res);
  },
  acceptCancellationPolicy: async (id: string) => {
    const res = await fetch(`/api/profile/${id}/policy-acceptance`, {
      method: 'POST'
    });
    return handleResponse(res);
  },
  login: async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res, { suppressUnauthorizedRedirect: true });
  },
  register: async (email: string, password?: string, fullName?: string, whatsappPhone?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, whatsappPhone })
    });
    return handleResponse(res, { suppressUnauthorizedRedirect: true });
  },
  createReservation: async (userId: string, classId: string) => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, classId })
    });
    return handleResponse(res);
  },
  cancelReservation: async (reservationId: string) => {
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  getStudentDashboard: async (studentId: string) => {
    const res = await fetch(`/api/students/${studentId}/dashboard`);
    return handleResponse(res);
  },
  getPublicSettings: async () => {
    const res = await fetch('/api/system-settings/public');
    return handleResponse(res);
  },
  getActiveHighlights: async () => {
    const res = await fetch('/api/highlights/active');
    return handleResponse(res);
  },
  getStudents: async () => {
    const res = await fetch('/api/students');
    return handleResponse(res);
  },
  addClass: async (classData: any) => {
    const payload = normalizeClassPayload(classData);
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  createClass: async (classData: any) => {
    const payload = normalizeClassPayload(classData);
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  createRecurringClasses: async (payload: any) => {
    const normalizedPayload = normalizeClassPayload(payload);
    const res = await fetch('/api/classes/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    });
    return handleResponse(res);
  },
  deleteClass: async (id: string) => {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  cancelClass: async (id: string, canceledBy: string) => {
    const res = await fetch(`/api/classes/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canceled_by: canceledBy })
    });
    return handleResponse(res);
  },
  updateCredits: async (id: string, credits: number) => {
    const res = await fetch(`/api/profiles/${id}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits })
    });
    return handleResponse(res);
  },
  coach: {
    getPackages: async () => {
      const res = await fetch('/api/coach/packages');
      return handleResponse(res);
    },
    createPackage: async (data: any) => {
      const res = await fetch('/api/coach/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    updatePackage: async (id: string, data: any) => {
      const res = await fetch(`/api/coach/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    deletePackage: async (id: string) => {
      const res = await fetch(`/api/coach/packages/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    createSubscription: async (data: any, options?: { reuse_active_subscription?: boolean }) => {
      const payload =
        options?.reuse_active_subscription === undefined
          ? data
          : { ...(data || {}), reuse_active_subscription: Boolean(options.reuse_active_subscription) };
      const res = await fetch('/api/coach/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    getSubscriptionBeneficiaries: async (subscriptionId: string) => {
      const res = await fetch(`/api/coach/subscriptions/${subscriptionId}/beneficiaries`);
      return handleResponse(res);
    },
    addSubscriptionBeneficiary: async (subscriptionId: string, data: any) => {
      const res = await fetch(`/api/coach/subscriptions/${subscriptionId}/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    toggleSubscriptionFreeze: async (subscriptionId: string, action: 'pause' | 'resume') => {
      const res = await fetch(`/api/coach/subscriptions/${subscriptionId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      return handleResponse(res);
    },
    unassignSubscription: async (subscriptionId: string, data: any) => {
      const res = await fetch(`/api/coach/subscriptions/${subscriptionId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    getCommunity: async () => {
      const res = await fetch('/api/coach/community');
      return handleResponse(res);
    },
    getWhatsAppTemplates: async () => {
      const res = await fetch('/api/coach/whatsapp-templates');
      return handleResponse(res);
    },
    createWhatsAppTemplate: async (data: any) => {
      const res = await fetch('/api/coach/whatsapp-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    updateWhatsAppTemplate: async (id: string, data: any) => {
      const res = await fetch(`/api/coach/whatsapp-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    deleteWhatsAppTemplate: async (id: string) => {
      const res = await fetch(`/api/coach/whatsapp-templates/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    updateStudent: async (id: string, data: any) => {
      const res = await fetch(`/api/coach/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    adjustStudentCredits: async (id: string, data: any) => {
      const res = await fetch(`/api/coach/students/${id}/manual-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    registerAttendance: async (data: any) => {
      const res = await fetch('/api/coach/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    getStudentSubscriptions: async (id: string) => {
      const res = await fetch(`/api/coach/students/${id}/subscriptions`);
      return handleResponse(res);
    },
    getStudentHistory: async (id: string) => {
      const res = await fetch(`/api/coach/students/${id}/history`);
      return handleResponse(res);
    },
    getCashCut: async (filters?: { year?: number | string; month?: number | string; startDate?: string; endDate?: string }) => {
      const params = new URLSearchParams();
      if (filters?.year != null) params.set('year', String(filters.year));
      if (filters?.month != null) params.set('month', String(filters.month));
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      const query = params.toString();
      const res = await fetch(`/api/coach/cash-cut${query ? `?${query}` : ''}`);
      return handleResponse(res);
    },
    getHighlights: async () => {
      const res = await fetch('/api/coach/highlights');
      return handleResponse(res);
    },
    createHighlight: async (data: any) => {
      const res = await fetch('/api/coach/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    updateHighlight: async (id: string, data: any) => {
      const res = await fetch(`/api/coach/highlights/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    deleteHighlight: async (id: string) => {
      const res = await fetch(`/api/coach/highlights/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    toggleHighlight: async (id: string, data: { is_active: number | boolean; actor_id?: string }) => {
      const res = await fetch(`/api/coach/highlights/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },
  admin: {
    getProfiles: async () => {
      const res = await fetch('/api/admin/profiles');
      return handleResponse(res);
    },
    createProfile: async (data: any) => {
      const res = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    updateProfile: async (id: string, data: any) => {
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    deleteProfile: async (id: string) => {
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    getClasses: async () => {
      const res = await fetch('/api/admin/classes');
      return handleResponse(res);
    },
    updateClass: async (id: string, data: any) => {
      const res = await fetch(`/api/admin/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    deleteClass: async (id: string) => {
      const res = await fetch(`/api/admin/classes/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    getReservations: async () => {
      const res = await fetch('/api/admin/reservations');
      return handleResponse(res);
    },
    deleteReservation: async (id: string) => {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    getStats: async () => {
      const res = await fetch('/api/admin/stats');
      return handleResponse(res);
    },
    getSettings: async () => {
      const res = await fetch('/api/admin/settings');
      return handleResponse(res);
    },
    createSetting: async (data: { setting_key: string; setting_value: string }) => {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    updateSetting: async (key: string, value: string | number) => {
      const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_value: String(value) })
      });
      return handleResponse(res);
    },
    deleteSetting: async (key: string) => {
      const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      return handleResponse(res);
    },
    getCoachAnalytics: async () => {
      const res = await fetch('/api/coach/analytics');
      return handleResponse(res);
    },
    changePassword: async (userId: string, newPassword: string) => {
      const res = await fetch(`/api/admin/change-password/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      return handleResponse(res);
    }
  }
};
