import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes } from 'react-router-dom';
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
import { ScrollToTop } from './components/ScrollToTop.tsx';
import { Profile } from './types.ts';
import { api, logger } from './lib/api.ts';
import { AppDataProvider, useAppData } from './contexts/AppDataContext.tsx';
import { subscribeStudentStateChanged } from './lib/studentStateSync.ts';

interface AppShellProps {
  session: any;
  userProfile: Profile;
  studentDashboard: any;
  lastBooking: any;
  setLastBooking: React.Dispatch<any>;
  setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setStudentDashboard: React.Dispatch<any>;
  refreshStudentState: (userId: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  handleLogout: () => void;
}

const AppShell: React.FC<AppShellProps> = ({
  session,
  userProfile,
  studentDashboard,
  lastBooking,
  setLastBooking,
  setUserProfile,
  setStudentDashboard,
  refreshStudentState,
  fetchProfile,
  handleLogout
}) => {
  const { classes, availability, refreshAvailability, refreshClasses } = useAppData();

  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-[100dvh] flex flex-col bg-white overflow-x-hidden">
        <Header user={userProfile} onLogout={handleLogout} />

        <main className="flex-grow min-h-[100dvh] overflow-x-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6">
                  {userProfile.role === 'student' && (
                    <div className="container mx-auto px-4 pt-8">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white/70 backdrop-blur-md p-6 shadow-xl">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Dashboard</p>
                          <h2 className="mt-2 text-4xl font-bebas text-zinc-900 uppercase italic tracking-tight">
                            ¡Hola, {userProfile.full_name.split(' ')[0]}!
                          </h2>
                          <p className="mt-3 text-sm text-zinc-500">Tu progreso y tus reservas en un solo lugar.</p>
                        </div>
                        <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white shadow-xl">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Créditos disponibles</p>
                          <p className="mt-2 text-4xl font-bebas">{userProfile.credits_remaining}</p>
                        </div>
                        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Paquete activo</p>
                          <p className="mt-2 text-lg font-black text-zinc-900">
                            {studentDashboard?.activeSubscription?.package_name || 'Sin paquete activo'}
                          </p>
                          {Number(studentDashboard?.activeSubscription?.congelado || 0) === 1 && (
                            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                              <i className="fas fa-pause"></i>
                              Pausado
                            </p>
                          )}
                          <p className="mt-2 text-xs text-zinc-500">
                            {studentDashboard?.activeSubscription?.fecha_vencimiento
                              ? `Vence: ${new Date(studentDashboard.activeSubscription.fecha_vencimiento).toLocaleDateString('es-MX')}`
                              : 'Renueva con tu coach para seguir entrenando.'}
                          </p>
                        </div>
                        <div className="lg:col-span-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Próxima clase</p>
                          {studentDashboard?.upcomingReservations?.length ? (
                            <div className="mt-2">
                              <p className="text-lg font-black text-zinc-900">{studentDashboard.upcomingReservations[0].type}</p>
                              <p className="text-sm text-zinc-500">
                                {new Date(`${studentDashboard.upcomingReservations[0].date}T00:00:00`).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                                {' · '}
                                {String(studentDashboard.upcomingReservations[0].start_time || '').slice(0, 5)}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-zinc-500">Aún no tienes una reserva próxima.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <ServiceSelector
                    user={userProfile}
                    onRefreshData={async () => {
                      await refreshClasses();
                      await refreshAvailability();
                      if (session?.user?.id) {
                        await refreshStudentState(session.user.id);
                      }
                    }}
                  />
                </div>
              }
            />
            <Route
              path="/schedule/:serviceType"
              element={
                <div className="container mx-auto px-4 py-12 lg:py-20">
                  <Schedule
                    instances={classes}
                    availability={availability}
                    user={userProfile}
                    onUserProfileUpdate={(updatedProfile) => setUserProfile(updatedProfile)}
                    onStudentDashboardUpdate={(dashboardData) => setStudentDashboard(dashboardData)}
                  />
                </div>
              }
            />
            <Route
              path="/book/:instanceId"
              element={
                <div className="container mx-auto px-4 py-12">
                  {userProfile.role === 'student' && userProfile.credits_remaining <= 0 ? (
                    <div className="max-w-xl mx-auto py-20 text-center space-y-6 animate-in fade-in zoom-in">
                      <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto border border-rose-100 rotate-12">
                        <i className="fas fa-bolt text-3xl"></i>
                      </div>
                      <h3 className="text-5xl font-bebas text-zinc-900 uppercase italic tracking-tight">Sin Créditos</h3>
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">
                        Tu contador de clases está en cero. Contacta a tu coach para renovar.
                      </p>
                      <Link
                        to="/"
                        className="inline-block px-12 py-5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-brand transition-all shadow-xl"
                      >
                        Volver a Clases
                      </Link>
                    </div>
                  ) : (
                    <BookingForm
                      user={userProfile}
                      instances={classes}
                      onSuccess={async (booking) => {
                        setLastBooking(booking);
                        await refreshAvailability();
                        await refreshClasses();
                        if (session) {
                          await refreshStudentState(session.user.id);
                        }
                      }}
                    />
                  )}
                </div>
              }
            />
            <Route
              path="/confirmation"
              element={
                <div className="container mx-auto px-4 py-12">
                  <Confirmation booking={lastBooking} />
                </div>
              }
            />
            <Route path="/admin" element={userProfile.role === 'admin' ? <DjangoAdmin /> : <Navigate to="/" />} />
            <Route
              path="/coach-panel"
              element={
                userProfile.role === 'coach' || userProfile.role === 'admin' ? (
                  <div className="container mx-auto px-4 py-12">
                    <CoachPanelErrorBoundary>
                      <CoachPanel
                        user={userProfile}
                        instances={classes}
                        availability={availability}
                        onRefresh={async () => {
                          await refreshClasses();
                          await refreshAvailability();
                        }}
                        onRefreshStudents={() => {
                          if (session) return fetchProfile(session.user.id);
                        }}
                      />
                    </CoachPanelErrorBoundary>
                  </div>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/reset-password" element={<PasswordReset />} />
          </Routes>
        </main>

        <footer className="bg-zinc-50 border-t border-zinc-100 py-20 mt-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center space-x-4 mb-6">
              <div className="h-px w-8 bg-zinc-200"></div>
              <div className="w-36 h-14 sm:w-40 sm:h-16 flex items-center justify-center p-1 overflow-hidden">
                <img
                  src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png"
                  alt="Focus Fitness Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="h-px w-8 bg-zinc-200"></div>
            </div>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.6em]">Movement Studio & High Performance</p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [studentDashboard, setStudentDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem('focus_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        fetchProfile(parsed.user.id);
      } catch (e) {
        localStorage.removeItem('focus_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'student' && userProfile?.id) {
      fetchStudentDashboard(userProfile.id);
    }
  }, [userProfile?.credits_remaining, userProfile?.id, userProfile?.role, userProfile?.total_attended]);

  useEffect(() => {
    if (!session?.user?.id || userProfile?.role !== 'student') return;
    const pollMs = 30000;
    const runPolling = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      refreshStudentState(session.user.id);
    };

    const interval = setInterval(runPolling, pollMs);
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        runPolling();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [session?.user?.id, userProfile?.role]);

  useEffect(() => {
    if (!session?.user?.id || userProfile?.role !== 'student') return;
    const unsubscribe = subscribeStudentStateChanged((payload) => {
      if (payload.studentId !== session.user.id) return;
      refreshStudentState(session.user.id);
    });
    return unsubscribe;
  }, [session?.user?.id, userProfile?.role]);

  const fetchProfile = async (userId: string) => {
    try {
      const data = await api.getProfile(userId);
      if (data && !data.error) {
        setUserProfile(data);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchStudentDashboard = async (userId: string) => {
    try {
      const data = await api.getStudentDashboard(userId);
      setStudentDashboard(data);
    } catch (err) {
      logger.error('Error fetching student dashboard', err);
      setStudentDashboard(null);
    }
  };

  const refreshStudentState = async (userId: string) => {
    await fetchProfile(userId);
    await fetchStudentDashboard(userId);
  };

  const handleLogout = () => {
    localStorage.removeItem('focus_session');
    setSession(null);
    setUserProfile(null);
    window.location.href = '/';
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
      <AppDataProvider enabled={Boolean(session)} role={userProfile.role}>
        <AppShell
          session={session}
          userProfile={userProfile}
          studentDashboard={studentDashboard}
          lastBooking={lastBooking}
          setLastBooking={setLastBooking}
          setUserProfile={setUserProfile}
          setStudentDashboard={setStudentDashboard}
          refreshStudentState={refreshStudentState}
          fetchProfile={fetchProfile}
          handleLogout={handleLogout}
        />
      </AppDataProvider>
    </NotificationProvider>
  );
};

export default App;
