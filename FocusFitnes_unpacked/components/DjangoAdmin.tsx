import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, logger } from '../lib/api.ts';
import { EmailConfig } from './EmailConfig.tsx';
import { useNotifications } from './NotificationSystem.tsx';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';

type ModelType = 'profiles' | 'classes' | 'reservations' | 'settings';

export const DjangoAdmin: React.FC = () => {
  const { addNotification } = useNotifications();
  const { refreshSettings } = useAppData();
  const [currentModel, setCurrentModel] = useState<ModelType>('profiles');
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [cancellationLimitHours, setCancellationLimitHours] = useState('8');
  const [cancellationCutoffMorning, setCancellationCutoffMorning] = useState('08:00');
  const [cancellationDeadlineEvening, setCancellationDeadlineEvening] = useState('22:00');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchModelData();
  }, [currentModel]);

  const fetchStats = async () => {
    try {
      const statsData = await api.admin.getStats();
      setStats(statsData);
    } catch (err: any) {
      logger.error('Error fetching stats', err);
    }
  };

  const fetchModelData = async () => {
    setLoading(true);
    setError(null);
    try {
      let result: any[] = [];
      if (currentModel === 'profiles') result = await api.admin.getProfiles();
      if (currentModel === 'classes') result = await api.admin.getClasses();
      if (currentModel === 'reservations') result = await api.admin.getReservations();
      if (currentModel === 'settings') {
        result = await api.admin.getSettings();
        const limitSetting = result.find((row: any) => row.setting_key === 'cancellation_limit_hours');
        if (limitSetting?.setting_value) setCancellationLimitHours(String(limitSetting.setting_value));
        const cutoffSetting = result.find((row: any) => row.setting_key === 'cancellation_cutoff_morning');
        if (cutoffSetting?.setting_value) setCancellationCutoffMorning(String(cutoffSetting.setting_value));
        const eveningSetting = result.find((row: any) => row.setting_key === 'cancellation_deadline_evening');
        if (eveningSetting?.setting_value) setCancellationDeadlineEvening(String(eveningSetting.setting_value));
      }
      setData(result);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'No se pudieron cargar los datos de administración.'));
      logger.error(`Error fetching ${currentModel}`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      if (currentModel === 'profiles') await api.admin.deleteProfile(id);
      if (currentModel === 'classes') await api.admin.deleteClass(id);
      if (currentModel === 'reservations') await api.admin.deleteReservation(id);
      if (currentModel === 'settings') {
        await api.admin.deleteSetting(id);
        await refreshSettings();
      }
      addNotification({
        type: 'success',
        title: 'Eliminado',
        message: 'Elemento eliminado correctamente.',
        duration: 3500
      });
      fetchModelData();
      fetchStats();
    } catch (err: any) {
      let message = 'No se pudo eliminar el elemento.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.message) message = parsed.message;
      } catch {}
      message = getFriendlyErrorMessage(err, message);
      addNotification({
        type: 'error',
        title: 'Error de eliminación',
        message,
        duration: 6000
      });
    }
  };

  const handlePasswordChange = async (userId: string) => {
    const newPassword = prompt('Ingresa la nueva contraseña:');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      addNotification({ type: 'warning', title: 'Contraseña inválida', message: 'Mínimo 6 caracteres.', duration: 3500 });
      return;
    }
    try {
      await api.admin.changePassword(userId, newPassword);
      addNotification({ type: 'success', title: 'Contraseña actualizada', message: 'Cambio aplicado.', duration: 3500 });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: getFriendlyErrorMessage(err, 'No se pudo actualizar la contraseña.'), duration: 5000 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentModel === 'profiles') {
        if (isAdding) await api.admin.createProfile(editingItem);
        else await api.admin.updateProfile(editingItem.id, editingItem);
      } else if (currentModel === 'classes') {
        if (isAdding) await api.addClass(editingItem);
        else await api.admin.updateClass(editingItem.id, editingItem);
      }
      setEditingItem(null);
      setIsAdding(false);
      fetchModelData();
      fetchStats();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error al guardar', message: getFriendlyErrorMessage(err, 'No se pudieron guardar los cambios.'), duration: 6000 });
    }
  };

  const handleSaveCancellationLimit = async () => {
    const hours = Number(cancellationLimitHours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
      addNotification({
        type: 'warning',
        title: 'Valor inválido',
        message: 'Ingresa un valor entre 0 y 168 horas.',
        duration: 4000
      });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(cancellationCutoffMorning) || !/^\d{2}:\d{2}$/.test(cancellationDeadlineEvening)) {
      addNotification({
        type: 'warning',
        title: 'Formato inválido',
        message: 'Usa formato HH:MM para hora de corte matutina y hora límite nocturna.',
        duration: 4000
      });
      return;
    }
    setSavingSettings(true);
    try {
      await Promise.all([
        api.admin.updateSetting('cancellation_limit_hours', hours),
        api.admin.updateSetting('cancellation_cutoff_morning', cancellationCutoffMorning),
        api.admin.updateSetting('cancellation_deadline_evening', cancellationDeadlineEvening)
      ]);
      await refreshSettings();
      addNotification({
        type: 'success',
        title: 'Ajuste guardado',
        message: 'Política de cancelación inteligente actualizada.',
        duration: 3500
      });
      fetchModelData();
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error guardando ajuste',
        message: getFriendlyErrorMessage(err, 'No se pudo actualizar el ajuste.'),
        duration: 6000
      });
    } finally {
      setSavingSettings(false);
    }
  };


  if (loading && data.length === 0) return <div className="p-10 font-mono">Cargando administración...</div>;

  return (
    <div className="min-h-screen bg-[#f8f8f8] font-sans text-[#333] overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px]">
      <header className="bg-[#417690] text-white p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Administración de Focus Fitness</h1>
        <div className="text-[10px] sm:text-xs uppercase font-bold flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <button onClick={() => setShowEmailConfig(true)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors">
            <i className="fas fa-envelope"></i> Email
          </button>
          <span>Bienvenido, Admin</span>
          <Link to="/" className="hover:underline">Ver el sitio</Link>
          <button onClick={() => { localStorage.removeItem('focus_session'); window.location.reload(); }} className="hover:underline">Cerrar sesión</button>
        </div>
      </header>

      <div className="bg-[#79aec8] text-white px-4 py-2 text-[10px] sm:text-xs font-bold uppercase">
        Inicio › {currentModel.toUpperCase()}
      </div>

      <div className="flex flex-col lg:flex-row">
        <nav className="w-full lg:w-56 bg-white border-r border-[#ddd] min-h-[400px]">
          <div className="p-4">
            <h2 className="text-xs font-bold uppercase text-[#666] mb-4">Administrar</h2>
            <ul className="space-y-2">
              {(['profiles', 'classes', 'reservations', 'settings'] as ModelType[]).map((model) => (
                <li key={model}>
                  <button
                    onClick={() => setCurrentModel(model)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${currentModel === model ? 'bg-[#79aec8] text-white' : 'text-[#333] hover:bg-[#f0f0f0]'}`}
                  >
                    {model === 'profiles' && 'Usuarios'}
                    {model === 'classes' && 'Clases'}
                    {model === 'reservations' && 'Reservas'}
                    {model === 'settings' && '⚙️ Ajustes'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <main className="flex-1 p-4 sm:p-6">
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow border border-[#ddd]">
                <h3 className="text-xs font-bold uppercase text-[#666] mb-2">Usuarios</h3>
                <p className="text-2xl font-bold text-[#417690]">{stats.totalUsers}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-[#ddd]">
                <h3 className="text-xs font-bold uppercase text-[#666] mb-2">Clases</h3>
                <p className="text-2xl font-bold text-[#417690]">{stats.totalClasses}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-[#ddd]">
                <h3 className="text-xs font-bold uppercase text-[#666] mb-2">Reservas</h3>
                <p className="text-2xl font-bold text-[#417690]">{stats.totalReservations}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-[#ddd]">
                <h3 className="text-xs font-bold uppercase text-[#666] mb-2">Créditos</h3>
                <p className="text-2xl font-bold text-[#417690]">{stats.totalCredits}</p>
              </div>
            </div>
          )}

          <section className="flex-grow">
            {currentModel === 'settings' ? (
              <div className="bg-white border border-[#eee] shadow-sm p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#666] mb-2">Ajustes del Sistema</h2>
                  <p className="text-xs text-[#666]">Configura políticas globales del negocio.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-[#666] uppercase mb-2">
                      Límite de cancelación (horas)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step={1}
                      min={0}
                      max={168}
                      value={cancellationLimitHours}
                      onChange={(e) => setCancellationLimitHours(e.target.value)}
                      className="w-full border p-2 text-sm min-h-[44px]"
                    />
                    <p className="mt-1 text-[11px] text-[#666]">Horas base para calcular el límite normal.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#666] uppercase mb-2">
                      Hora de corte matutina
                    </label>
                    <input
                      type="time"
                      value={cancellationCutoffMorning}
                      onChange={(e) => setCancellationCutoffMorning(e.target.value)}
                      className="w-full border p-2 text-sm min-h-[44px]"
                    />
                    <p className="mt-1 text-[11px] text-[#666]">Si el límite cae antes de esta hora, se moverá al día anterior por la noche.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#666] uppercase mb-2">
                      Hora límite nocturna (día anterior)
                    </label>
                    <input
                      type="time"
                      value={cancellationDeadlineEvening}
                      onChange={(e) => setCancellationDeadlineEvening(e.target.value)}
                      className="w-full border p-2 text-sm min-h-[44px]"
                    />
                    <p className="mt-1 text-[11px] text-[#666]">Hora final permitida del día anterior para clases matutinas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCancellationLimit}
                    disabled={savingSettings}
                    className="bg-[#417690] text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-[#2b5063] disabled:opacity-60 min-h-[44px]"
                  >
                    {savingSettings ? 'Guardando...' : 'Guardar Ajuste'}
                  </button>
                </div>

                <div className="border border-[#eee] rounded">
                  <div className="p-3 bg-[#f7f7f7] text-xs font-bold uppercase text-[#666]">Ajustes actuales</div>
                  <div className="p-3 space-y-2 text-sm">
                    {data.length === 0 && <p className="text-[#999]">No hay ajustes configurados.</p>}
                    {data.map((row: any) => (
                      <div key={row.setting_key} className="flex items-center justify-between border-b border-[#f0f0f0] pb-2 last:border-b-0 last:pb-0">
                        <span className="font-mono text-xs">{row.setting_key}</span>
                        <span className="font-bold">{row.setting_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : editingItem || isAdding ? (
              <div className="bg-white border border-[#eee] shadow-sm p-8">
                <h2 className="text-lg font-bold text-[#666] mb-6">{isAdding ? 'Añadir' : 'Cambiar'} {currentModel.slice(0, -1)}</h2>
                <form onSubmit={handleSave} className="space-y-4">
                  {currentModel === 'profiles' && (
                    <>
                      {isAdding && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-1">Email</label>
                            <input className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.email || ''} onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })} required />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-1">Password</label>
                            <input type="password" className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.password || ''} onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })} placeholder="focus123" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Nombre Completo</label>
                        <input className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.full_name || ''} onChange={(e) => setEditingItem({ ...editingItem, full_name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Rol</label>
                        <select className="w-full border p-2 text-sm min-h-[44px]" value={editingItem.role} onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}>
                          <option value="student">Student</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Créditos</label>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" step={1} className="w-full border p-2 text-sm min-h-[44px]" value={editingItem.credits_remaining} onChange={(e) => setEditingItem({ ...editingItem, credits_remaining: parseInt(e.target.value || '0', 10) })} />
                      </div>
                    </>
                  )}

                  {currentModel === 'classes' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Tipo</label>
                        <input className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.type || ''} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Fecha (YYYY-MM-DD)</label>
                        <input type="date" className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.date || ''} onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Inicio (HH:MM)</label>
                        <input type="time" className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.start_time || ''} onChange={(e) => setEditingItem({ ...editingItem, start_time: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Fin (HH:MM)</label>
                        <input type="time" className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.end_time || ''} onChange={(e) => setEditingItem({ ...editingItem, end_time: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Capacidad</label>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" step={1} className="w-full border p-2 text-sm min-h-[44px]" value={editingItem?.capacity || 8} onChange={(e) => setEditingItem({ ...editingItem, capacity: parseInt(e.target.value || '8', 10) })} />
                      </div>
                    </>
                  )}

                  <div className="pt-4 flex space-x-4">
                    <button type="submit" className="bg-[#417690] text-white px-6 py-2 text-xs font-bold uppercase rounded min-h-[44px]">Grabar</button>
                    <button type="button" onClick={() => { setEditingItem(null); setIsAdding(false); }} className="bg-[#ccc] text-white px-6 py-2 text-xs font-bold uppercase rounded min-h-[44px]">Cancelar</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-[#eee] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#eee] flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#666]">Selecciona {currentModel.slice(0, -1)} para cambiar</h2>
                  {(currentModel === 'classes' || currentModel === 'profiles') && (
                    <button
                      onClick={() => {
                        setIsAdding(true);
                        if (currentModel === 'classes') setEditingItem({ type: 'Entrenamiento Funcional', capacity: 8 });
                        else setEditingItem({ role: 'student', credits_remaining: 0 });
                      }}
                      className="bg-[#417690] text-white px-4 py-2 text-xs font-bold uppercase rounded hover:bg-[#2b5063]"
                    >
                      Añadir {currentModel.slice(0, -1)} +
                    </button>
                  )}
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold">{error}</div>}

                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead>
                    <tr className="bg-[#f0f0f0] border-b border-[#ddd]">
                      <th className="p-3">ID</th>
                      {currentModel === 'profiles' && (
                        <>
                          <th className="p-3">Email</th>
                          <th className="p-3">Nombre</th>
                          <th className="p-3">Rol</th>
                          <th className="p-3">Créditos</th>
                        </>
                      )}
                      {currentModel === 'classes' && (
                        <>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Estado</th>
                        </>
                      )}
                      {currentModel === 'reservations' && (
                        <>
                          <th className="p-3">Usuario</th>
                          <th className="p-3">Clase</th>
                          <th className="p-3">Fecha Clase</th>
                          <th className="p-3">Estado</th>
                        </>
                      )}
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item: any) => (
                      <tr key={item.id} className="border-b border-[#eee] hover:bg-[#ffffcc]">
                        <td className="p-3">{item.id}</td>
                        {currentModel === 'profiles' && (
                          <>
                            <td className="p-3">{item.email}</td>
                            <td className="p-3">{item.full_name}</td>
                            <td className="p-3">{item.role}</td>
                            <td className="p-3">{item.credits_remaining}</td>
                          </>
                        )}
                        {currentModel === 'classes' && (
                          <>
                            <td className="p-3">{item.type}</td>
                            <td className="p-3">{item.date}</td>
                            <td className="p-3">{item.status}</td>
                          </>
                        )}
                        {currentModel === 'reservations' && (
                          <>
                            <td className="p-3">{item.user_email}</td>
                            <td className="p-3">{item.class_type}</td>
                            <td className="p-3">{item.class_date}</td>
                            <td className="p-3">{item.status}</td>
                          </>
                        )}
                        <td className="p-3 space-x-2">
                          {(currentModel === 'profiles' || currentModel === 'classes') && (
                            <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:underline">Editar</button>
                          )}
                          {currentModel === 'profiles' && (
                            <>
                              <span>|</span>
                              <button onClick={() => handlePasswordChange(item.id)} className="text-purple-600 hover:underline">Cambiar Contraseña</button>
                            </>
                          )}
                          {currentModel !== 'settings' && (
                            <>
                              <span>|</span>
                              <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Eliminar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div className="p-3 bg-[#f0f0f0] text-[10px] text-[#666] font-bold uppercase">
                  {data.length} {currentModel}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {showEmailConfig && (
        <div className="fixed inset-0 z-[999]">
          <EmailConfig />
        </div>
      )}
    </div>
  );
};
