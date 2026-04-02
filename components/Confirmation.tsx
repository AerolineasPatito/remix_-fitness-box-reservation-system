import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';

interface ConfirmationProps {
  booking: any;
}

export const Confirmation: React.FC<ConfirmationProps> = ({ booking }) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!booking) {
    return (
      <div className="text-center py-20 text-zinc-400 uppercase font-black tracking-widest">
        No se encontro informacion.
      </div>
    );
  }

  const ticketId = String(
    booking?.ticketId ||
      booking?.ticket_id ||
      booking?.id ||
      booking?.reservationId ||
      booking?.reservation_id ||
      booking?.reservation?.id ||
      ''
  ).trim();
  const className = String(booking?.tipoClase || booking?.reservation?.type || 'Clase').trim();
  const classDate = String(booking?.fecha || booking?.reservation?.date || '').trim();
  const startTimeRaw = String(booking?.horaInicio || booking?.reservation?.start_time || '').trim();
  const endTimeRaw = String(booking?.horaFin || booking?.reservation?.end_time || '').trim();
  const studentEmail = String(booking?.email || '').trim();

  const ensureTime = (timeLike: string, fallback = '00:00') => {
    const clean = String(timeLike || '').trim();
    if (/^\d{2}:\d{2}$/.test(clean)) return clean;
    if (/^\d{1}:\d{2}$/.test(clean)) return `0${clean}`;
    return fallback;
  };

  const computeFallbackEnd = (start: string) => {
    const [h, m] = ensureTime(start, '07:00').split(':').map(Number);
    const dt = new Date();
    dt.setHours(h, m, 0, 0);
    dt.setMinutes(dt.getMinutes() + 60);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  };

  const startTime = ensureTime(startTimeRaw, '07:00');
  const endTime = ensureTime(endTimeRaw, computeFallbackEnd(startTime));

  const toGCalDateTime = (date: string, time: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
    const t = ensureTime(time);
    return `${date.replace(/-/g, '')}T${t.replace(':', '')}00`;
  };

  const generateGCalLink = () => {
    const start = toGCalDateTime(classDate, startTime);
    const end = toGCalDateTime(classDate, endTime);
    if (!start || !end) return '';
    const details = `Reserva en Focus Fitness. ID: ${ticketId || 'N/A'}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(className)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent('Focus Main Studio')}`;
  };

  const googleCalendarLink = generateGCalLink();

  const downloadFromSvgFallback = () => {
    const safeClass = className || 'Clase';
    const safeDate = classDate || 'N/A';
    const safeTime = `${startTime} - ${endTime}`;
    const safeTicket = (ticketId || 'N/A').toUpperCase();
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" fill="#f5f7fb"/>
  <rect x="40" y="40" width="1120" height="620" rx="28" fill="#ffffff" stroke="#e5e7eb"/>
  <rect x="40" y="40" width="1120" height="140" rx="28" fill="#0f172a"/>
  <text x="600" y="98" font-size="48" font-family="Arial, sans-serif" text-anchor="middle" fill="#22d3ee" font-weight="700">FOCUS FITNESS</text>
  <text x="600" y="130" font-size="24" font-family="Arial, sans-serif" text-anchor="middle" fill="#ffffff" letter-spacing="2">CONFIRMACIÓN DE RESERVA</text>
  <text x="90" y="235" font-size="22" font-family="Arial, sans-serif" fill="#6b7280">Entrenamiento</text>
  <text x="90" y="275" font-size="42" font-family="Arial, sans-serif" fill="#111827" font-weight="700">${safeClass}</text>
  <text x="90" y="355" font-size="22" font-family="Arial, sans-serif" fill="#6b7280">Día</text>
  <text x="90" y="395" font-size="34" font-family="Arial, sans-serif" fill="#111827" font-weight="700">${safeDate}</text>
  <text x="90" y="465" font-size="22" font-family="Arial, sans-serif" fill="#6b7280">Hora</text>
  <text x="90" y="505" font-size="34" font-family="Arial, sans-serif" fill="#111827" font-weight="700">${safeTime}</text>
  <text x="760" y="355" font-size="22" font-family="Arial, sans-serif" fill="#6b7280">Ticket ID</text>
  <text x="760" y="410" font-size="38" font-family="Arial, sans-serif" fill="#06b6d4" font-weight="700">${safeTicket}</text>
  <text x="760" y="505" font-size="22" font-family="Arial, sans-serif" fill="#6b7280">Estudio</text>
  <text x="760" y="545" font-size="34" font-family="Arial, sans-serif" fill="#111827" font-weight="700">Focus Main</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `focus-ticket-${ticketId || Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    setDownloadError(null);
    setDownloadingTicket(true);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const iosPreviewWindow = isIOS ? window.open('', '_blank') : null;
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const filename = `focus-ticket-${ticketId || Date.now()}.png`;

      if (isIOS) {
        const imageData = canvas.toDataURL('image/png');
        if (iosPreviewWindow) {
          const safeTitle = className || 'Clase';
          const safeWhen = `${classDate || 'N/A'} · ${startTime} - ${endTime}`;
          const safeTicket = (ticketId || 'N/A').toUpperCase();
          iosPreviewWindow.document.write(`
            <html>
              <head>
                <title>Ticket Focus Fitness</title>
                <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
              </head>
              <body style="margin:0;background:linear-gradient(180deg,#020617 0%,#0f172a 50%,#111827 100%);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <div style="max-width:560px;margin:0 auto;min-height:100vh;padding:24px 18px 36px 18px;box-sizing:border-box;">
                  <div style="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:20px;background:rgba(15,23,42,0.55);backdrop-filter: blur(8px);">
                    <p style="margin:0;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:800;color:#67e8f9;">Focus Fitness</p>
                    <h1 style="margin:10px 0 6px 0;font-size:28px;line-height:1;font-weight:900;letter-spacing:0.02em;">Ticket Digital</h1>
                    <p style="margin:0 0 16px 0;font-size:14px;color:#cbd5e1;">${safeTitle}</p>
                    <div style="display:grid;grid-template-columns:1fr;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:12px 14px;margin-bottom:14px;">
                      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#94a3b8;font-weight:700;">Horario</p>
                      <p style="margin:0;font-size:15px;font-weight:700;color:#f8fafc;">${safeWhen}</p>
                      <p style="margin:8px 0 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#94a3b8;font-weight:700;">Ticket ID</p>
                      <p style="margin:0;font-size:16px;font-weight:900;color:#22d3ee;">${safeTicket}</p>
                    </div>
                    <p style="margin:0 0 14px 0;font-size:13px;line-height:1.5;color:#e2e8f0;">
                      Mantén presionada la imagen y selecciona <strong>"Guardar en Fotos"</strong>.
                    </p>
                    <div style="background:#ffffff;border-radius:14px;padding:8px;">
                      <img src="${imageData}" alt="Ticket Focus Fitness" style="display:block;width:100%;height:auto;border-radius:10px;" />
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `);
          iosPreviewWindow.document.close();
        } else {
          window.location.href = imageData;
        }
      } else {
        canvas.toBlob((blob) => {
          if (!blob) {
            setDownloadError('No pudimos generar el ticket. Intenta de nuevo.');
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }, 'image/png');
      }
    } catch {
      if (iosPreviewWindow && !iosPreviewWindow.closed) {
        iosPreviewWindow.close();
      }
      try {
        downloadFromSvgFallback();
      } catch {
        setDownloadError('No pudimos descargar el ticket. Intenta de nuevo.');
      }
    } finally {
      setDownloadingTicket(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-center space-y-16 animate-in fade-in zoom-in duration-1000">
      <div className="relative inline-block">
        <div className="w-40 h-40 bg-brand rounded-[3.5rem] flex items-center justify-center mx-auto shadow-3xl shadow-cyan-600/30 rotate-12 transition-transform hover:rotate-0 duration-700">
          <i className="fas fa-check text-white text-6xl"></i>
        </div>
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white animate-bounce">
          <i className="fas fa-star text-sm"></i>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-8xl font-bebas text-zinc-900 tracking-tighter leading-none">
          ¡YA TIENES <span className="text-brand">LUGAR!</span>
        </h2>
        <p className="text-zinc-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
          Tu reserva para <span className="text-zinc-900 font-bold">{className}</span> esta lista. Revisa tu correo{' '}
          <span className="text-brand font-bold">{studentEmail}</span>.
        </p>
      </div>

      <div ref={ticketRef} className="bg-zinc-50 border border-zinc-100 p-12 rounded-[3.5rem] text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 border-b border-zinc-200 pb-12">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entrenamiento</span>
            <p className="text-3xl font-bebas text-zinc-900 tracking-tight">{className}</p>
          </div>
          <div className="space-y-2 md:text-right">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ticket ID</span>
            <p className="text-2xl font-mono font-black text-brand uppercase">{ticketId || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dia</span>
            <p className="text-xl font-bold text-zinc-900">{classDate || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hora</span>
            <p className="text-xl font-bold text-zinc-900">{startTime}</p>
          </div>
          <div className="col-span-2 md:col-span-1 md:text-right">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estudio</span>
            <p className="text-xl font-bold text-zinc-900">Focus Main</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {googleCalendarLink ? (
          <a
            href={googleCalendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-4 py-6 bg-white border-2 border-zinc-100 hover:border-brand text-zinc-900 font-bold rounded-2xl transition-all"
          >
            <i className="fab fa-google text-brand text-xl"></i>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Google Calendar</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center space-x-4 py-6 bg-zinc-100 border-2 border-zinc-200 text-zinc-500 font-bold rounded-2xl cursor-not-allowed"
          >
            <i className="fab fa-google text-zinc-400 text-xl"></i>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Google Calendar</span>
          </button>
        )}
        <button
          onClick={handleDownloadTicket}
          disabled={downloadingTicket}
          className="flex items-center justify-center space-x-4 py-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-zinc-400/10 disabled:opacity-60"
        >
          <i className="fas fa-ticket-alt text-brand text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {downloadingTicket ? 'Generando ticket...' : 'Descargar Ticket'}
          </span>
        </button>
      </div>

      {downloadError && (
        <p className="text-center text-xs font-bold text-rose-500 uppercase tracking-widest">{downloadError}</p>
      )}

      <div className="pt-10">
        <Link
          to="/"
          className="text-zinc-400 hover:text-brand transition-colors text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center"
        >
          <i className="fas fa-arrow-left mr-3"></i>
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};
