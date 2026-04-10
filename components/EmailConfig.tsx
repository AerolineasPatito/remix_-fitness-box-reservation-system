import React, { useEffect, useState } from 'react';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';
import { Badge, Button, Card, NumberInput, SelectInput, TextInput } from './ui/index.ts';

interface EmailConfigData {
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

interface EmailConfigProps {
  modalMode?: boolean;
  onClose?: () => void;
}

export const EmailConfig: React.FC<EmailConfigProps> = ({ modalMode = false, onClose }) => {
  const [config, setConfig] = useState<EmailConfigData>({ provider: 'console' });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/email-config');
        const data = await response.json();
        if (data && data.provider !== 'console') {
          setConfig(data);
        }
      } catch {
        // no-op
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
        body: JSON.stringify({ email: testEmail, config })
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
          smtp: { host: 'smtp.gmail.com', port: 587, secure: false, user: '', pass: '' }
        });
        break;
      case 'outlook':
        setConfig({
          provider: 'smtp',
          smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false, user: '', pass: '' }
        });
        break;
      case 'custom':
        setConfig({
          provider: 'smtp',
          smtp: { host: 'mail.focusfitnessmvt.com', port: 465, secure: true, user: '', pass: '' }
        });
        break;
    }
  };

  const shellClass = modalMode
    ? 'max-w-5xl w-full max-h-[88vh] overflow-y-auto rounded-3xl border border-neutral-200 bg-surface p-4 sm:p-6 lg:p-8 shadow-2xl'
    : 'min-h-screen bg-surface p-3 sm:p-4 lg:p-6';

  const content = (
    <div className={`${shellClass} overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px]`}>
      <div className={modalMode ? 'space-y-5 sm:space-y-6' : 'max-w-6xl mx-auto space-y-6 sm:space-y-8'}>
        {modalMode ? (
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900">Configuración de Email</h3>
              <p className="text-xs text-neutral-500 mt-1">Configura SMTP y prueba el envío desde el panel admin.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-200"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-primary shadow-xl shadow-primary/30 flex items-center justify-center mx-auto">
              <i className="fas fa-envelope text-white text-lg sm:text-xl lg:text-2xl"></i>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl xl:text-7xl font-display text-neutral-900 tracking-tighter uppercase italic leading-none">
              CONFIGURACIÓN DE <span className="text-primary">EMAIL</span>
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm lg:text-base font-medium leading-relaxed max-w-lg mx-auto uppercase tracking-widest">
              Configura el servicio de envío de correos del sistema
            </p>
          </div>
        )}

        {message && (
          <div className={`p-3 sm:p-4 rounded-xl border text-center text-xs sm:text-sm lg:text-base font-bold ${message.includes('✅') ? 'bg-success/10 text-success border-success/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
            {message}
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-3 ${modalMode ? 'gap-4 lg:gap-5' : 'gap-6 lg:gap-8'}`}>
          <div className="lg:col-span-2">
            <Card className={`${modalMode ? 'rounded-2xl' : 'rounded-[2rem] sm:rounded-[3rem] lg:rounded-[4rem]'} border-2 border-neutral-100 p-4 sm:p-6 lg:p-8 shadow-2xl space-y-6`}>
              <SelectInput
                label="Proveedor de Email"
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                options={[
                  { value: 'console', label: 'Consola (Solo para desarrollo)' },
                  { value: 'smtp', label: 'SMTP (Gmail, Outlook, etc.)' },
                  { value: 'sendgrid', label: 'SendGrid' },
                  { value: 'ses', label: 'Amazon SES' }
                ]}
              />

              {config.provider === 'smtp' && (
                <div className="space-y-4 sm:space-y-6 border-t border-neutral-200 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="font-bold text-neutral-700 uppercase tracking-wider text-sm sm:text-base">Configuración SMTP</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="danger" size="sm" onClick={() => setPresetConfig('gmail')}>Gmail</Button>
                      <Button variant="primary" size="sm" onClick={() => setPresetConfig('outlook')}>Outlook</Button>
                      <Button variant="secondary" size="sm" onClick={() => setPresetConfig('custom')}>Servidor propio</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput
                      label="Servidor"
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={config.smtp?.host || ''}
                      onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, host: e.target.value } })}
                    />
                    <NumberInput
                      label="Puerto"
                      placeholder="587"
                      value={config.smtp?.port || ''}
                      onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, port: parseInt(e.target.value, 10) } })}
                      min={1}
                      step={1}
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm font-bold text-neutral-700">
                    <input
                      type="checkbox"
                      id="secure"
                      checked={config.smtp?.secure || false}
                      onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, secure: e.target.checked } })}
                      className="w-4 h-4 text-primary"
                    />
                    Usar SSL/TLS (Recomendado)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput
                      label="Usuario"
                      type="email"
                      placeholder="tu@email.com"
                      value={config.smtp?.user || ''}
                      onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, user: e.target.value } })}
                    />
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Tu contraseña"
                          value={config.smtp?.pass || ''}
                          onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, pass: e.target.value } })}
                          className="w-full border border-neutral-200 rounded-xl p-3 text-sm min-h-[44px]"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600">
                          <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {config.provider === 'sendgrid' && (
                <div className="space-y-4 sm:space-y-6 border-t border-neutral-200 pt-6">
                  <h3 className="font-bold text-neutral-700 uppercase tracking-wider text-sm sm:text-base">Configuración SendGrid</h3>
                  <TextInput
                    label="API Key"
                    type="password"
                    placeholder="SG.xxxxx..."
                    value={config.sendgrid?.apiKey || ''}
                    onChange={(e) => setConfig({ ...config, sendgrid: { ...config.sendgrid, apiKey: e.target.value } })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput
                      label="Email Remitente"
                      type="email"
                      placeholder="noreply@tudominio.com"
                      value={config.sendgrid?.fromEmail || ''}
                      onChange={(e) => setConfig({ ...config, sendgrid: { ...config.sendgrid, fromEmail: e.target.value } })}
                    />
                    <TextInput
                      label="Nombre Remitente"
                      type="text"
                      placeholder="Focus Fitness"
                      value={config.sendgrid?.fromName || ''}
                      onChange={(e) => setConfig({ ...config, sendgrid: { ...config.sendgrid, fromName: e.target.value } })}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <Button onClick={saveConfig} className="flex-1">Guardar Configuración</Button>
                {!modalMode && <Button variant="secondary" onClick={() => window.location.href = '/'} className="flex-1">Volver</Button>}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className={`${modalMode ? 'rounded-2xl' : 'rounded-[2rem] sm:rounded-[3rem]'} border-2 border-neutral-100 p-4 sm:p-6 shadow-2xl space-y-6`}>
              <h3 className="font-bold text-neutral-700 uppercase tracking-wider text-sm sm:text-base">Probar Configuración</h3>
              <div className="space-y-4">
                <TextInput
                  label="Email de Prueba"
                  type="email"
                  placeholder="tu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button onClick={testEmailConfig} disabled={loading} className="w-full">
                  {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Enviar Prueba'}
                </Button>
              </div>
              <div className="bg-info/10 border border-info/20 p-4 rounded-lg">
                <h4 className="font-bold text-info text-sm mb-2 flex items-center gap-2">
                  <Badge variant="info">Info</Badge> Información Útil
                </h4>
                <ul className="text-xs text-info space-y-1">
                  <li>• Gmail requiere "App Password" si usas 2FA</li>
                  <li>• Outlook usa puerto 587 con STARTTLS</li>
                  <li>• Servidor propio suele usar SSL/TLS en puerto 465</li>
                  <li>• Guarda la configuración antes de probar</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  if (!modalMode) return content;

  return (
    <div className="fixed inset-0 z-[999] bg-neutral-900/70 p-3 sm:p-6 flex items-center justify-center">
      {content}
    </div>
  );
};

