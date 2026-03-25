
export const logger = {
  log: (message: string, data?: any) => {
    console.log(`%c[FOCUS-LOG]: ${message}`, 'color: #3794a4; font-weight: bold;', data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`%c[FOCUS-ERROR]: ${message}`, 'color: #ef4444; font-weight: bold;', error || '');
  }
};

const handleResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    
    // If response is not ok, throw error with details
    if (!res.ok) {
      const error = new Error(data.message || 'Request failed');
      if (data.error) {
        (error as any).code = data.error;
      }
      if (data.details) {
        (error as any).details = data.details;
      }
      if (data.suggestions) {
        (error as any).suggestions = data.suggestions;
      }
      // Stringify the entire error for the frontend to parse
      error.message = JSON.stringify(data);
      throw error;
    }
    
    return data;
  }
  const text = await res.text();
  console.error('Non-JSON response received:', text.substring(0, 100));
  throw new Error(`Server returned non-JSON response (${res.status})`);
};

export const api = {
  getClasses: async (year?: number | string) => {
    const params = new URLSearchParams();
    if (year != null && year !== '') params.set('year', String(year));
    const query = params.toString();
    const res = await fetch(`/api/classes${query ? `?${query}` : ''}`);
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
  getAvailability: async () => {
    const res = await fetch('/api/availability');
    return handleResponse(res);
  },
  getProfile: async (id: string) => {
    const res = await fetch(`/api/profile/${id}`);
    return handleResponse(res);
  },
  login: async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },
  register: async (email: string, password?: string, fullName?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    return handleResponse(res);
  },
  createReservation: async (userId: string, classId: string) => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, classId })
    });
    return handleResponse(res);
  },
  getStudents: async () => {
    const res = await fetch('/api/students');
    return handleResponse(res);
  },
  addClass: async (classData: any) => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
    return handleResponse(res);
  },
  createClass: async (classData: any) => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
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
    createSubscription: async (data: any) => {
      const res = await fetch('/api/coach/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
    getCommunity: async () => {
      const res = await fetch('/api/coach/community');
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
    getCashCut: async (filters?: { year?: number | string; month?: number | string; startDate?: string; endDate?: string }) => {
      const params = new URLSearchParams();
      if (filters?.year != null) params.set('year', String(filters.year));
      if (filters?.month != null) params.set('month', String(filters.month));
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      const query = params.toString();
      const res = await fetch(`/api/coach/cash-cut${query ? `?${query}` : ''}`);
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
    getCoachAnalytics: async () => {
      console.log('Calling getCoachAnalytics API...');
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
