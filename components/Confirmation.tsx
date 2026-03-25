
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';

interface ConfirmationProps {
  booking: any;
}

export const Confirmation: React.FC<ConfirmationProps> = ({ booking }) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloadingTicket, setDownloadingTicket] = useState(false);

  if (!booking) return (
    <div className="text-center py-20 text-zinc-400 uppercase font-black tracking-widest">
      No se encontró información.
    </div>
  );

  const generateGCalLink = () => {
    const start = `${booking.fecha.replace(/-/g, '')}T${booking.horaInicio.replace(':', '')}00Z`;
    const end = `${booking.fecha.replace(/-/g, '')}T${booking.horaFin.replace(':', '')}00Z`;
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.tipoClase)}&dates=${start}/${end}&details=${encodeURIComponent('Reserva en Focus Fitness. ID: ' + booking.id)}&location=Focus%20Fitness%20Studio`;
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current || !booking?.id) return;
    setDownloadingTicket(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });
      const imageData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `focus-ticket-${booking.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
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
        <h2 className="text-8xl font-bebas text-zinc-900 tracking-tighter leading-none">¡YA TIENES <span className="text-brand">LUGAR!</span></h2>
        <p className="text-zinc-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
          Tu reserva para <span className="text-zinc-900 font-bold">{booking.tipoClase}</span> está lista. Revisa tu correo <span className="text-brand font-bold">{booking.email}</span>.
        </p>
      </div>

      <div ref={ticketRef} className="bg-zinc-50 border border-zinc-100 p-12 rounded-[3.5rem] text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 border-b border-zinc-200 pb-12">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entrenamiento</span>
            <p className="text-3xl font-bebas text-zinc-900 tracking-tight">{booking.tipoClase}</p>
          </div>
          <div className="space-y-2 md:text-right">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ticket ID</span>
            <p className="text-2xl font-mono font-black text-brand uppercase">{booking.id}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Día</span>
            <p className="text-xl font-bold text-zinc-900">{booking.fecha}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hora</span>
            <p className="text-xl font-bold text-zinc-900">{booking.horaInicio}</p>
          </div>
          <div className="col-span-2 md:col-span-1 md:text-right">
             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estudio</span>
            <p className="text-xl font-bold text-zinc-900">Focus Main</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <a 
          href={generateGCalLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-4 py-6 bg-white border-2 border-zinc-100 hover:border-brand text-zinc-900 font-bold rounded-2xl transition-all"
        >
          <i className="fab fa-google text-brand text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Google Calendar</span>
        </a>
        <button 
          onClick={handleDownloadTicket}
          disabled={downloadingTicket}
          className="flex items-center justify-center space-x-4 py-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-zinc-400/10"
        >
          <i className="fas fa-ticket-alt text-brand text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {downloadingTicket ? 'Generando ticket...' : 'Descargar Ticket'}
          </span>
        </button>
      </div>

      <div className="pt-10">
        <Link to="/" className="text-zinc-400 hover:text-brand transition-colors text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center">
          <i className="fas fa-arrow-left mr-3"></i>
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};
