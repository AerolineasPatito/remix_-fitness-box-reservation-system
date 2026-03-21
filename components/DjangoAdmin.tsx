import React, { useState, useEffect } from 'react';
import { api, logger } from '../lib/api.ts';
import { EmailConfig } from './EmailConfig.tsx';
import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Profile, ClassInstance } from '../types.ts';
import { useNotifications } from './NotificationSystem.tsx';

type ModelType = 'profiles' | 'classes' | 'reservations';

export const DjangoAdmin: React.FC = () => {
  const { addNotification } = useNotifications();
  const [currentModel, setCurrentModel] = useState<ModelType>('profiles');
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);

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
      if (currentModel === 'profiles') {
        result = await api.admin.getProfiles();
      } else if (currentModel === 'classes') {
        result = await api.admin.getClasses();
      } else if (currentModel === 'reservations') {
        result = await api.admin.getReservations();
      }
      setData(result);
    } catch (err: any) {
      setError(err.message);
      logger.error(`Error fetching ${currentModel}`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;
    try {
      if (currentModel === 'profiles') {
        await api.admin.deleteProfile(id);
        addNotification({
          type: 'success',
          title: 'Usuario Eliminado',
          message: 'El usuario ha sido eliminado exitosamente del sistema.',
          duration: 4000
        });
      } else if (currentModel === 'classes') {
        await api.admin.deleteClass(id);
        addNotification({
          type: 'success',
          title: 'Clase Eliminada',
          message: 'La clase ha sido eliminada exitosamente del sistema.',
          duration: 4000
        });
      } else if (currentModel === 'reservations') {
        await api.admin.deleteReservation(id);
        addNotification({
          type: 'success',
          title: 'Reserva Eliminada',
          message: 'La reserva ha sido eliminada exitosamente del sistema.',
          duration: 4000
        });
      }
      fetchModelData();
      fetchStats();
    } catch (err: any) {
      console.error('Delete error:', err);
      
      // Handle different error types
      if (err.message?.includes('USER_HAS_RESERVATIONS')) {
        const errorData = JSON.parse(err.message);
        addNotification({
          type: 'error',
          title: 'No se puede eliminar usuario',
          message: errorData.message,
          details: errorData.details,
          suggestions: errorData.suggestions,
          duration: 10000,
          actions: [
            {
              label: 'Ver Reservas',
              onClick: () => {
                setCurrentModel('reservations');
                fetchModelData();
              },
              variant: 'primary'
            }
          ]
        });
      } else if (err.message?.includes('USER_IS_COACH')) {
        const errorData = JSON.parse(err.message);
        addNotification({
          type: 'warning',
          title: 'Usuario es Coach',
          message: errorData.message,
          details: errorData.details,
          suggestions: errorData.suggestions,
          duration: 8000
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Error de Eliminación',
          message: 'No se pudo eliminar el elemento. Por favor intenta nuevamente.',
          details: { technical: err.message },
          duration: 6000
        });
      }
    }
  };

  const handlePasswordChange = async (userId: string) => {
    const newPassword = prompt('Ingresa la nueva contraseña:');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      addNotification({
        type: 'warning',
        title: 'Contraseña Inválida',
        message: 'La contraseña debe tener al menos 6 caracteres.',
        duration: 4000
      });
      return;
    }

    try {
      await api.admin.changePassword(userId, newPassword);
      addNotification({
        type: 'success',
        title: 'Contraseña Actualizada',
        message: 'La contraseña ha sido actualizada exitosamente.',
        duration: 4000
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error al Cambiar Contraseña',
        message: 'No se pudo actualizar la contraseña. Por favor intenta nuevamente.',
        details: { technical: err.message },
        duration: 6000
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentModel === 'profiles') {
        if (isAdding) {
          await api.admin.createProfile(editingItem);
        } else {
          await api.admin.updateProfile(editingItem.id, editingItem);
        }
      } else if (currentModel === 'classes') {
        if (isAdding) {
          await api.addClass(editingItem);
        } else {
          await api.admin.updateClass(editingItem.id, editingItem);
        }
      }
      setEditingItem(null);
      setIsAdding(false);
      fetchModelData();
      fetchStats();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    }
  };

  if (loading && data.length === 0) return <div className="p-10 font-mono">Cargando administración...</div>;

  return (
    <div className="min-h-screen bg-[#f8f8f8] font-sans text-[#333]">
      {/* Django Header */}
      <header className="bg-[#417690] text-white p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Administración de Focus Fitness</h1>
        </div>
        <div className="text-[10px] sm:text-xs uppercase font-bold flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setShowEmailConfig(true)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
            title="Configurar Email"
          >
            <i className="fas fa-envelope"></i> Email
          </button>
          <span>Bienvenido, Admin</span>
          <Link to="/" className="hover:underline">Ver el sitio</Link>
          <button onClick={() => { localStorage.removeItem('focus_session'); window.location.reload(); }} className="hover:underline">Cerrar sesión</button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-[#79aec8] text-white px-4 py-2 text-[10px] sm:text-xs font-bold uppercase">
        Inicio › {currentModel.toUpperCase()}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <nav className="w-full lg:w-48 bg-white border-r border-[#ddd] min-h-[400px]">
          <div className="p-4">
            <h2 className="text-xs font-bold uppercase text-[#666] mb-4">Administrar</h2>
            <ul className="space-y-2">
              {(['profiles', 'classes', 'reservations'] as ModelType[]).map(model => (
                <li key={model}>
                  <button
                    onClick={() => setCurrentModel(model)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      currentModel === model 
                        ? 'bg-[#79aec8] text-white' 
                        : 'text-[#333] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {model === 'profiles' && '👥 Usuarios'}
                    {model === 'classes' && '📅 Clases'}
                    {model === 'reservations' && '🎫 Reservas'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {/* Stats Cards */}
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

          {/* Content Area */}
          <section className="flex-grow">
            {editingItem || isAdding ? (
              <div className="bg-white border border-[#eee] shadow-sm p-8">
                <h2 className="text-lg font-bold text-[#666] mb-6">
                  {isAdding ? 'Añadir' : 'Cambiar'} {currentModel.slice(0, -1)}
                </h2>
                <form onSubmit={handleSave} className="space-y-4">
                  {currentModel === 'profiles' && (
                    <>
                      {isAdding && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-1">Email</label>
                            <input 
                              className="w-full border p-2 text-sm"
                              value={editingItem?.email || ''}
                              onChange={e => setEditingItem({...editingItem, email: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-1">Password</label>
                            <input 
                              type="password"
                              className="w-full border p-2 text-sm"
                              value={editingItem?.password || ''}
                              onChange={e => setEditingItem({...editingItem, password: e.target.value})}
                              placeholder="focus123"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Nombre Completo</label>
                        <input 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.full_name || ''}
                          onChange={e => setEditingItem({...editingItem, full_name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Rol</label>
                        <select 
                          className="w-full border p-2 text-sm"
                          value={editingItem.role}
                          onChange={e => setEditingItem({...editingItem, role: e.target.value})}
                        >
                          <option value="student">Student</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Créditos</label>
                        <input 
                          type="number"
                          className="w-full border p-2 text-sm"
                          value={editingItem.credits_remaining}
                          onChange={e => setEditingItem({...editingItem, credits_remaining: parseInt(e.target.value)})}
                        />
                      </div>
                    </>
                  )}

                  {currentModel === 'classes' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Tipo</label>
                        <select 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.type || 'CrossFit'}
                          onChange={e => setEditingItem({...editingItem, type: e.target.value})}
                        >
                          <option value="CrossFit">CrossFit</option>
                          <option value="Weightlifting">Weightlifting</option>
                          <option value="Gymnastics">Gymnastics</option>
                          <option value="Endurance">Endurance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Fecha (YYYY-MM-DD)</label>
                        <input 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.date || ''}
                          onChange={e => setEditingItem({...editingItem, date: e.target.value})}
                          placeholder="2024-05-20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Inicio (HH:MM)</label>
                        <input 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.start_time || ''}
                          onChange={e => setEditingItem({...editingItem, start_time: e.target.value})}
                          placeholder="07:00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Fin (HH:MM)</label>
                        <input 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.end_time || ''}
                          onChange={e => setEditingItem({...editingItem, end_time: e.target.value})}
                          placeholder="08:00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Estado</label>
                        <select 
                          className="w-full border p-2 text-sm"
                          value={editingItem?.status || 'active'}
                          onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                        >
                          <option value="active">Activo</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="completed">Completado</option>
                          <option value="ongoing">En Curso</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-1">Capacidad</label>
                        <input 
                          type="number"
                          className="w-full border p-2 text-sm"
                          value={editingItem?.capacity || 8}
                          onChange={e => setEditingItem({...editingItem, capacity: parseInt(e.target.value)})}
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-4 flex space-x-4">
                    <button type="submit" className="bg-[#417690] text-white px-6 py-2 text-xs font-bold uppercase rounded">Grabar</button>
                    <button 
                      type="button" 
                      onClick={() => { setEditingItem(null); setIsAdding(false); }}
                      className="bg-[#ccc] text-white px-6 py-2 text-xs font-bold uppercase rounded"
                    >
                      Cancelar
                    </button>
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
                        if (currentModel === 'classes') setEditingItem({ type: 'CrossFit', capacity: 8 });
                        else setEditingItem({ role: 'student', credits_remaining: 0 });
                      }}
                      className="bg-[#417690] text-white px-4 py-2 text-xs font-bold uppercase rounded hover:bg-[#2b5063]"
                    >
                      Añadir {currentModel.slice(0, -1)} +
                    </button>
                  )}
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold">{error}</div>}

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f0f0f0] border-b border-[#ddd]">
                      <th className="p-3 w-8"><input type="checkbox" /></th>
                      {currentModel === 'profiles' && (
                        <>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Email</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Nombre</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Rol</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Créditos</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Email Verificado</th>
                        </>
                      )}
                      {currentModel === 'classes' && (
                        <>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Tipo</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Fecha</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Estado</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Creado Por</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Cancelado Por</th>
                        </>
                      )}
                      {currentModel === 'reservations' && (
                        <>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Usuario</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Clase</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Fecha Clase</th>
                          <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Estado</th>
                        </>
                      )}
                      <th className="p-3 font-bold text-[#417690] uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'} border-b border-[#eee] hover:bg-[#ffffcc]`}>
                        <td className="p-3"><input type="checkbox" /></td>
                        
                        {currentModel === 'profiles' && (
                          <>
                            <td className="p-3 font-bold text-[#417690] hover:underline cursor-pointer" onClick={() => setEditingItem(item)}>{item.email}</td>
                            <td className="p-3">{item.full_name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.role === 'coach' ? 'bg-[#e1f5fe] text-[#01579b]' : item.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-[#f5f5f5] text-[#666]'}`}>
                                {item.role}
                              </span>
                            </td>
                            <td className="p-3">{item.credits_remaining}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.email_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.email_verified ? '✓ Verificado' : '✗ Pendiente'}
                              </span>
                            </td>
                          </>
                        )}

                        {currentModel === 'classes' && (
                          <>
                            <td className="p-3 font-bold text-[#417690] hover:underline cursor-pointer" onClick={() => setEditingItem(item)}>{item.type}</td>
                            <td className="p-3">{item.date}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.status === 'active' ? 'bg-green-100 text-green-700' : 
                                item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                item.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                item.status === 'ongoing' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {item.status === 'active' ? 'Activo' : 
                                 item.status === 'cancelled' ? 'Cancelado' :
                                 item.status === 'completed' ? 'Completado' :
                                 item.status === 'ongoing' ? 'En Curso' :
                                 item.status}
                              </span>
                            </td>
                            <td className="p-3 text-[10px]">
                              {item.created_by_email ? 
                                item.created_by_email : 
                                (item.created_by || '-')
                              }
                            </td>
                            <td className="p-3 text-[10px]">
                              {item.canceled_by_email ? 
                                item.canceled_by_email : 
                                (item.canceled_by || '-')
                              }
                            </td>
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
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-3 bg-[#f0f0f0] text-[10px] text-[#666] font-bold uppercase">
                  {data.length} {currentModel}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Email Config Modal */}
      {showEmailConfig && (
        <div className="fixed inset-0 z-[999]">
          <EmailConfig />
        </div>
      )}
    </div>
  );
};
