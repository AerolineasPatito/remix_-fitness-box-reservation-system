import React, { useState, useEffect } from 'react';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';

interface EmailConfig {
  provider: 'console' | 'smtp' | 'sendgrid' | 'ses';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  ses?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    fromEmail: string;
  };
}

export const EmailConfig: React.FC = () => {
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'console'
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Cargar configuración guardada del servidor
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/email-config');
        const data = await response.json();
        if (data && data.provider !== 'console') {
          setConfig(data);
        }
      } catch {
        // Evita ruido en UI cuando no hay configuración previa.
      }
    };
    
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/save-email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Configuración guardada exitosamente');
      } else {
        setMessage(`❌ ${getFriendlyErrorMessage(data, 'No pudimos guardar la configuración de correo.')}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${getFriendlyErrorMessage(error, 'Sin conexión. Verifica tu internet e intenta de nuevo.')}`);
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const testEmailConfig = async () => {
    if (!testEmail) {
      setMessage('❌ Por favor ingresa un correo de prueba');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail,
          config 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Email de prueba enviado exitosamente');
      } else {
        setMessage(`❌ ${getFriendlyErrorMessage(data, 'No pudimos enviar el correo de prueba.')}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${getFriendlyErrorMessage(error, 'Sin conexión. Verifica tu internet e intenta de nuevo.')}`);
    } finally {
      setLoading(false);
    }
  };

  const setPresetConfig = (preset: 'gmail' | 'outlook' | 'custom') => {
    switch (preset) {
      case 'gmail':
        setConfig({
          provider: 'smtp',
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: '',
            pass: ''
          }
        });
        break;
      case 'outlook':
        setConfig({
          provider: 'smtp',
          smtp: {
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            user: '',
            pass: ''
          }
        });
        break;
      case 'custom':
        setConfig({
          provider: 'smtp',
          smtp: {
            host: 'mail.focusfitnessmvt.com',
            port: 465,
            secure: true,
            user: '',
            pass: ''
          }
        });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 lg:p-6 overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px]">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-brand shadow-xl shadow-brand/30 flex items-center justify-center mx-auto">
            <i className="fas fa-envelope text-white text-lg sm:text-xl lg:text-2xl"></i>
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-5xl xl:text-7xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-none">
            CONFIGURACIÓN DE <span className="text-brand">EMAIL</span>
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm lg:text-base font-medium leading-relaxed max-w-lg mx-auto uppercase tracking-widest">
            Configura el servicio de envío de correos del sistema
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 sm:p-4 rounded-xl text-center text-xs sm:text-sm lg:text-base font-bold ${
            message.includes('✅') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {message}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white border-2 border-zinc-50 p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3rem] lg:rounded-[4rem] shadow-2xl space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm sm:text-base lg:text-lg font-bold text-zinc-700 uppercase tracking-wider mb-3">
                  Proveedor de Email
                </label>
                <select 
                  value={config.provider}
                  onChange={(e) => setConfig({...config, provider: e.target.value as any})}
                  className="w-full border border-zinc-200 rounded-xl p-3 sm:p-4 text-sm sm:text-base lg:text-lg font-bold focus:border-brand transition-all"
                >
                  <option value="console">Consola (Solo para desarrollo)</option>
                  <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="ses">Amazon SES</option>
                </select>
              </div>

              {/* SMTP Configuration */}
              {config.provider === 'smtp' && (
                <div className="space-y-4 sm:space-y-6 border-t pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-sm sm:text-base">Configuración SMTP</h3>
                    
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPresetConfig('gmail')}
                        className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 text-white text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Gmail
                      </button>
                      <button
                        onClick={() => setPresetConfig('outlook')}
                        className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Outlook
                      </button>
                      <button
                        onClick={() => setPresetConfig('custom')}
                        className="px-3 py-1 sm:px-4 sm:py-2 bg-purple-500 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Servidor propio
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Servidor</label>
                      <input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={config.smtp?.host || ''}
                        onChange={(e) => setConfig({
                          ...config, 
                          smtp: {...config.smtp, host: e.target.value}
                        })}
                        className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Puerto</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        step={1}
                        placeholder="587"
                        value={config.smtp?.port || ''}
                        onChange={(e) => setConfig({
                          ...config, 
                          smtp: {...config.smtp, port: parseInt(e.target.value)}
                        })}
                        className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="secure"
                      checked={config.smtp?.secure || false}
                      onChange={(e) => setConfig({
                        ...config, 
                        smtp: {...config.smtp, secure: e.target.checked}
                      })}
                      className="w-4 h-4 text-brand"
                    />
                    <label htmlFor="secure" className="text-sm font-bold text-zinc-700">
                      Usar SSL/TLS (Recomendado)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Usuario</label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={config.smtp?.user || ''}
                        onChange={(e) => setConfig({
                          ...config, 
                          smtp: {...config.smtp, user: e.target.value}
                        })}
                        className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Tu contraseña"
                          value={config.smtp?.pass || ''}
                          onChange={(e) => setConfig({
                            ...config, 
                            smtp: {...config.smtp, pass: e.target.value}
                          })}
                          className="w-full border border-zinc-200 rounded-lg p-3 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                        >
                          <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SendGrid Configuration */}
              {config.provider === 'sendgrid' && (
                <div className="space-y-4 sm:space-y-6 border-t pt-6">
                  <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-sm sm:text-base">Configuración SendGrid</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">API Key</label>
                    <input
                      type="password"
                      placeholder="SG.xxxxx..."
                      value={config.sendgrid?.apiKey || ''}
                      onChange={(e) => setConfig({
                        ...config, 
                        sendgrid: {...config.sendgrid, apiKey: e.target.value}
                      })}
                      className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Email Remitente</label>
                      <input
                        type="email"
                        placeholder="noreply@tudominio.com"
                        value={config.sendgrid?.fromEmail || ''}
                        onChange={(e) => setConfig({
                          ...config, 
                          sendgrid: {...config.sendgrid, fromEmail: e.target.value}
                        })}
                        className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Nombre Remitente</label>
                      <input
                        type="text"
                        placeholder="Focus Fitness"
                        value={config.sendgrid?.fromName || ''}
                        onChange={(e) => setConfig({
                          ...config, 
                          sendgrid: {...config.sendgrid, fromName: e.target.value}
                        })}
                        className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  onClick={saveConfig}
                  className="flex-1 py-3 sm:py-4 bg-brand text-white font-black rounded-xl text-sm sm:text-base uppercase tracking-wider hover:bg-zinc-900 transition-all"
                >
                  Guardar Configuración
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 py-3 sm:py-4 bg-zinc-100 text-zinc-700 font-black rounded-xl text-sm sm:text-base uppercase tracking-wider hover:bg-zinc-200 transition-all"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>

          {/* Test Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-zinc-50 p-4 sm:p-6 rounded-[2rem] sm:rounded-[3rem] shadow-2xl space-y-6">
              <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-sm sm:text-base">Probar Configuración</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-2">Email de Prueba</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-3 text-sm"
                  />
                </div>
                
                <button
                  onClick={testEmailConfig}
                  disabled={loading}
                  className="w-full py-3 sm:py-4 bg-brand text-white font-black rounded-lg text-sm sm:text-base uppercase tracking-wider hover:bg-zinc-900 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <i className="fas fa-circle-notch fa-spin"></i>
                  ) : (
                    'Enviar Prueba'
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 text-sm mb-2">ℹ️ Información Útil</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Gmail requiere "App Password" si usas 2FA</li>
                  <li>• Outlook usa puerto 587 con STARTTLS</li>
                  <li>• Servidor propio suele usar SSL/TLS en puerto 465</li>
                  <li>• Guarda la configuración antes de probar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
