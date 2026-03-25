
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Header } from './components/Header.tsx';
import { ServiceSelector } from './components/ServiceSelector.tsx';
import { Schedule } from './components/Schedule.tsx';
import { BookingForm } from './components/BookingForm.tsx';
import { Confirmation } from './components/Confirmation.tsx';
import { CoachPanel } from './components/CoachPanel.tsx';
import { CoachPanelErrorBoundary } from './components/CoachPanelErrorBoundary.jsx';
import { DjangoAdmin } from './components/DjangoAdmin.tsx';
import { Auth } from './components/Auth.tsx';
import { EmailVerification } from './components/EmailVerification.tsx';
import { PasswordReset } from './components/PasswordReset.tsx';
import { NotificationProvider } from './components/NotificationSystem.tsx';
import { ClassInstance, AvailabilityState, Profile } from './types.ts';
import { api, logger } from './lib/api.ts';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({});
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App mounted, checking session...');
    const savedSession = localStorage.getItem('focus_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        console.log('Session found:', parsed.user.id);
        setSession(parsed);
        fetchProfile(parsed.user.id);
      } catch (e) {
        console.error('Session parse error:', e);
        localStorage.removeItem('focus_session');
        setLoading(false);
      }
    } else {
      console.log('No session found');
      setLoading(false);
    }

    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => {
      console.log('Safety timeout fired');
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session) {
      fetchClasses();
      fetchAvailability();
      // Polling for "realtime" feel since we don't have websockets yet in this simple demo
      const interval = setInterval(() => {
        fetchClasses();
        fetchAvailability();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for:', userId);
    try {
      const data = await api.getProfile(userId);
      console.log('Profile data received:', data);
      if (data && !data.error) {
        setUserProfile(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error en fetchProfile:', err);
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await api.getClasses();
      if (data) {
        const formatted = data.map((d: any) => ({
          ...d,
          startTime: d.start_time.substring(0, 5),
          endTime: d.end_time.substring(0, 5),
          imageUrl: d.image_url || d.imageUrl || ''
        }));
        setInstances(formatted);
      }
    } catch (err) {
      logger.error('Error fetching classes', err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await api.getAvailability();
      if (data) {
        setAvailability(data);
      }
    } catch (err) {
      logger.error('Error fetching availability', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('focus_session');
    setSession(null);
    setUserProfile(null);
  };


  const handleLogin = (sessionData: any) => {
    setSession(sessionData);
    fetchProfile(sessionData.user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 border-4 border-zinc-100 border-t-brand rounded-full animate-spin"></div>
          <span className="font-bebas text-2xl text-zinc-400 tracking-widest uppercase italic animate-pulse">Sincronizando Atleta...</span>
        </div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-white">
          <Header user={userProfile} onLogout={handleLogout} />
          
          <main className="flex-grow">
          <Routes>
            <Route path="/" element={<ServiceSelector />} />
            <Route path="/schedule/:serviceType" element={
              <div className="container mx-auto px-4 py-12 lg:py-20">
                <Schedule instances={instances} availability={availability} />
              </div>
            } />
            <Route path="/book/:instanceId" element={
              <div className="container mx-auto px-4 py-12">
                {userProfile.role === 'student' && userProfile.credits_remaining <= 0 ? (
                  <div className="max-w-xl mx-auto py-20 text-center space-y-6 animate-in fade-in zoom-in">
                    <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto border border-rose-100 rotate-12">
                      <i className="fas fa-bolt text-3xl"></i>
                    </div>
                    <h3 className="text-5xl font-bebas text-zinc-900 uppercase italic tracking-tight">Sin Créditos</h3>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">Tu contador de clases está en cero. Contacta a tu coach para renovar.</p>
                    <Link to="/" className="inline-block px-12 py-5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-brand transition-all shadow-xl">Volver a Clases</Link>
                  </div>
                ) : (
                  <BookingForm 
                    user={userProfile}
                    instances={instances}
                    onSuccess={(booking) => {
                      setLastBooking(booking);
                      fetchAvailability();
                      if (session) fetchProfile(session.user.id);
                    }} 
                  />
                )}
              </div>
            } />
            <Route path="/confirmation" element={
              <div className="container mx-auto px-4 py-12">
                <Confirmation booking={lastBooking} />
              </div>
            } />
            <Route path="/admin" element={
              userProfile.role === 'admin' ? (
                <DjangoAdmin />
              ) : <Navigate to="/" />
            } />
            <Route path="/coach-panel" element={
              (userProfile.role === 'coach' || userProfile.role === 'admin') ? (
                <div className="container mx-auto px-4 py-12">
                  <CoachPanelErrorBoundary>
                    <CoachPanel 
                      user={userProfile}
                      instances={instances} 
                      availability={availability}
                      onRefresh={fetchClasses}
                      onRefreshStudents={() => { if (session) fetchProfile(session.user.id); }}
                    />
                  </CoachPanelErrorBoundary>
                </div>
              ) : <Navigate to="/" />
            } />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/reset-password" element={<PasswordReset />} />
          </Routes>
        </main>

        <footer className="bg-zinc-50 border-t border-zinc-100 py-20 mt-20">
          <div className="container mx-auto px-4 text-center">
             <div className="inline-flex items-center space-x-4 mb-6">
                <div className="h-px w-8 bg-zinc-200"></div>
                <div className="w-36 h-14 sm:w-40 sm:h-16 flex items-center justify-center p-1 overflow-hidden">
                  <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                       alt="Focus Fitness Logo" 
                       className="w-full h-full object-contain" />
                </div>
                <div className="h-px w-8 bg-zinc-200"></div>
             </div>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.6em]">Movement Studio & High Performance</p>
          </div>
        </footer>
      </div>
    </Router>
    </NotificationProvider>
  );
};

export default App;
