type FriendlyContext = {
  fallback?: string;
};

export type FriendlyError = {
  status?: number;
  code?: string;
  message: string;
  retryable?: boolean;
};

const CODE_MAP: Record<string, string> = {
  POLICY_NOT_ACCEPTED: 'Debes aceptar la política de cancelación para continuar.',
  NO_CREDITS: 'No tienes créditos suficientes para reservar esta clase.',
  CLASS_FULL: 'Esta clase ya no tiene lugares disponibles.',
  SESSION_EXPIRED: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
  NOT_AUTHORIZED: 'No tienes permiso para realizar esta acción.',
  DAILY_LIMIT_REACHED: 'Ya registraste una clase hoy. Puedes reservar otra mañana.',
  CLASS_AFTER_EXPIRY: 'No puedes reservar esta clase porque tu paquete ya venció para esa fecha.',
  PACKAGE_FROZEN: 'Tu paquete está pausado temporalmente. Contacta a tu coach para reactivarlo.',
  CANCELLATION_LIMIT_EXCEEDED: 'No puedes cancelar esta clase, el tiempo límite ya venció.'
};

const MESSAGE_HINTS: Array<{ test: (value: string) => boolean; message: string }> = [
  {
    test: (value) => value.includes('failed to fetch') || value.includes('network error') || value.includes('load failed'),
    message: 'Sin conexión. Verifica tu internet e intenta de nuevo.'
  },
  {
    test: (value) => value.includes('timeout') || value.includes('timed out'),
    message: 'La solicitud tardó demasiado. Inténtalo de nuevo en unos segundos.'
  },
  {
    test: (value) => value.includes('insufficient credits') || value.includes('sin créditos') || value.includes('no credits'),
    message: 'No tienes créditos suficientes para reservar esta clase.'
  },
  {
    test: (value) => value.includes('class is full') || value.includes('llena') || value.includes('cupo lleno'),
    message: 'Esta clase ya no tiene lugares disponibles.'
  },
  {
    test: (value) => value.includes('policy_not_accepted'),
    message: 'Debes aceptar la política de cancelación para continuar.'
  },
  {
    test: (value) => value.includes('unauthorized') || value.includes('401'),
    message: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'
  },
  {
    test: (value) => value.includes('forbidden') || value.includes('403'),
    message: 'No tienes permiso para realizar esta acción.'
  },
  {
    test: (value) => value.includes('constraint') || value.includes('foreign key'),
    message: 'Ocurrió un problema al procesar la información. Intenta de nuevo.'
  },
  {
    test: (value) => value.includes('no encontramos al alumno para ajustar creditos'),
    message: 'No encontramos al atleta seleccionado. Actualiza la lista e intenta de nuevo.'
  },
  {
    test: (value) => value.includes('cannot read properties') || value.includes('undefined'),
    message: 'Algo salió mal. Recarga la página e intenta de nuevo.'
  }
];

const safeParseJson = (input: string) => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

const sanitizeStatusMessage = (status?: number) => {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para continuar.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No encontramos lo que buscas. Actualiza la pantalla e intenta de nuevo.';
  if (status && status >= 500) return 'Tuvimos un problema interno. Intenta de nuevo en unos minutos.';
  return null;
};

export const toFriendlyError = (input: any, context: FriendlyContext = {}): FriendlyError => {
  const fallback = context.fallback || 'Algo salió mal. Intenta de nuevo.';
  if (!input) return { message: fallback };

  const status = Number(input?.status || input?.response?.status || 0) || undefined;
  const code = String(input?.code || input?.error || '').trim() || undefined;
  const parsedMessage = typeof input?.message === 'string' ? safeParseJson(input.message) : null;
  const parsedErrorCode = String(parsedMessage?.error || parsedMessage?.code || '').trim() || undefined;
  const rawMessage = String(
    parsedMessage?.message ||
      parsedMessage?.error ||
      input?.message ||
      input?.toString?.() ||
      ''
  );
  const normalizedRaw = rawMessage.toLowerCase();

  const byStatus = sanitizeStatusMessage(status);
  if (byStatus) {
    return { status, code: code || parsedErrorCode, message: byStatus, retryable: status >= 500 };
  }

  const mappedCode = CODE_MAP[parsedErrorCode || code || ''];
  if (mappedCode) {
    return { status, code: parsedErrorCode || code, message: mappedCode };
  }

  for (const hint of MESSAGE_HINTS) {
    if (hint.test(normalizedRaw)) {
      return { status, code: parsedErrorCode || code, message: hint.message };
    }
  }

  if (parsedMessage?.message && typeof parsedMessage.message === 'string') {
    const lowered = parsedMessage.message.toLowerCase();
    if (!lowered.includes('sql') && !lowered.includes('constraint') && !lowered.includes('stack')) {
      return { status, code: parsedErrorCode || code, message: parsedMessage.message };
    }
  }

  return { status, code: parsedErrorCode || code, message: fallback };
};

export const getFriendlyErrorMessage = (input: any, fallback?: string) =>
  toFriendlyError(input, { fallback }).message;
