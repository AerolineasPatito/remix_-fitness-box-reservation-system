import { readFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
class EmailService {
    smtpConfig = null;
    transporter = null;
    transporterConfigKey = null;
    configPath = path.resolve(process.cwd(), 'email-config.json');
    setSMTPConfig(config) {
        this.smtpConfig = config;
        this.transporter = null;
        this.transporterConfigKey = null;
        console.log('SMTP configurado en memoria:', {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user
        });
    }
    isValidSMTPConfig(config) {
        return !!(config &&
            config.host &&
            typeof config.port === 'number' &&
            typeof config.secure === 'boolean' &&
            config.user &&
            config.pass);
    }
    getConfigKey(config) {
        return `${config.host}:${config.port}:${config.secure}:${config.user}`;
    }
    async reloadSMTPConfigFromFile() {
        const raw = await readFile(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.provider !== 'smtp') {
            this.smtpConfig = null;
            this.transporter = null;
            this.transporterConfigKey = null;
            return;
        }
        const smtpCandidate = {
            host: parsed.smtp?.host,
            port: parsed.smtp?.port ? Number(parsed.smtp.port) : undefined,
            secure: typeof parsed.smtp?.secure === 'boolean' ? parsed.smtp.secure : undefined,
            user: parsed.smtp?.user,
            pass: parsed.smtp?.pass
        };
        if (!this.isValidSMTPConfig(smtpCandidate)) {
            this.smtpConfig = null;
            this.transporter = null;
            this.transporterConfigKey = null;
            return;
        }
        const nextConfig = smtpCandidate;
        const nextKey = this.getConfigKey(nextConfig);
        if (nextKey !== this.transporterConfigKey) {
            this.transporter = null;
            this.transporterConfigKey = null;
        }
        this.smtpConfig = nextConfig;
    }
    async getOrCreateTransporter() {
        await this.reloadSMTPConfigFromFile();
        if (!this.smtpConfig) {
            throw new Error('Configuracion SMTP invalida o provider distinto de smtp en email-config.json.');
        }
        const configKey = this.getConfigKey(this.smtpConfig);
        if (!this.transporter || this.transporterConfigKey !== configKey) {
            this.transporter = nodemailer.createTransport({
                host: this.smtpConfig.host,
                port: this.smtpConfig.port,
                secure: this.smtpConfig.secure,
                auth: {
                    user: this.smtpConfig.user,
                    pass: this.smtpConfig.pass
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000
            });
            this.transporterConfigKey = configKey;
        }
        return this.transporter;
    }
    async sendEmail(options) {
        const transporter = await this.getOrCreateTransporter();
        try {
            await transporter.verify();
            const info = await transporter.sendMail({
                from: `"Focus Fitness" <${this.smtpConfig.user}>`,
                to: options.to,
                subject: options.subject,
                html: options.html
            });
            console.log(`✅ Email enviado correctamente a ${options.to} via SMTP`);
            console.log('Message ID:', info.messageId);
            return true;
        }
        catch (error) {
            console.error('Error SMTP real al enviar email:', {
                message: error?.message,
                code: error?.code,
                command: error?.command,
                response: error?.response,
                responseCode: error?.responseCode
            });
            throw error;
        }
    }
    async sendVerificationEmail(email, token) {
        const verificationUrl = 'http://localhost:3000/verify-email';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Focus Fitness</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Verifica tu correo electronico</p>
        </div>

        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Bienvenido a Focus Fitness</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Gracias por registrarte. Para activar tu cuenta y comenzar a reservar clases,
            por favor haz clic en el siguiente boton:
          </p>

          <form action="${verificationUrl}" method="POST" style="text-align: center; margin: 30px 0;">
            <input type="hidden" name="token" value="${token}" />
            <button type="submit" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;">
              Verificar mi correo
            </button>
          </form>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; text-align: center;">
              <strong>Seguridad:</strong> Este enlace de verificacion es personal y expira en 24 horas.
              No lo compartas con otras personas.
            </p>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Si no solicitaste este registro, puedes ignorar este email.<br>
            Este enlace expirara en 24 horas.
          </p>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 Focus Fitness Movement Studio<br>
              Transformando vidas a traves del movimiento
            </p>
          </div>
        </div>
      </div>
    `;
        return this.sendEmail({
            to: email,
            subject: 'Verifica tu correo - Focus Fitness',
            html
        });
    }
    async sendPasswordResetEmail(email, token) {
        const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">FOCUS FITNESS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Movement Studio</p>
        </div>

        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Restablecer contrasena</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Hemos recibido una solicitud para restablecer tu contrasena. Si no fuiste tu, por favor ignora este email.
            Para crear una nueva contrasena, haz clic en el siguiente boton:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                      color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px;
                      font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);">
              Restablecer mi contrasena
            </a>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Este enlace expirara en 1 hora por seguridad.<br>
            Si no solicitaste este cambio, tu cuenta permanecera segura.
          </p>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 Focus Fitness Movement Studio<br>
              Tu seguridad es nuestra prioridad
            </p>
          </div>
        </div>
      </div>
    `;
        return this.sendEmail({
            to: email,
            subject: 'Restablecer contrasena - Focus Fitness',
            html
        });
    }
    async sendReservationConfirmation(email, reservationDetails) {
        const formattedDate = new Date(`${reservationDetails.classDate}T00:00:00`).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        const html = `
      <div style="font-family: 'Arial', sans-serif; max-width: 640px; margin: 0 auto; background: #f5f7fb; padding: 24px;">
        <div style="background: linear-gradient(135deg, #111827 0%, #0f172a 100%); border-radius: 20px 20px 0 0; padding: 36px; text-align: center;">
          <h1 style="color: #22d3ee; margin: 0; font-size: 32px; letter-spacing: 1px;">FOCUS FITNESS</h1>
          <p style="color: #ffffff; margin: 12px 0 0 0; font-size: 14px; letter-spacing: .12em; text-transform: uppercase;">Confirmacion de reserva</p>
        </div>
        <div style="background: #ffffff; border-radius: 0 0 20px 20px; padding: 32px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #111827; margin-top: 0;">
            Hola${reservationDetails.fullName ? `, ${reservationDetails.fullName}` : ''}.
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.7;">
            Tu reserva quedo confirmada. Aqui esta tu ticket digital para la proxima sesion.
          </p>
          <div style="background: #0f172a; border-radius: 16px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 14px 0; color: #22d3ee; font-weight: bold; text-transform: uppercase; letter-spacing: .1em; font-size: 11px;">Ticket</p>
            <p style="margin: 0 0 8px 0; color: #fff; font-size: 22px; font-weight: 700;">${reservationDetails.className}</p>
            <p style="margin: 0; color: #cbd5e1; font-size: 14px;">${formattedDate}</p>
            <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">${reservationDetails.startTime} - ${reservationDetails.endTime}</p>
            <p style="margin: 16px 0 0 0; color: #f8fafc; font-size: 12px; letter-spacing: .08em; text-transform: uppercase;">ID Ticket: ${reservationDetails.ticketId}</p>
          </div>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
            Te recomendamos llegar 10 minutos antes para iniciar puntual.
          </p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <p style="font-size: 14px; color: #111827; margin: 0 0 10px 0;"><strong>Política de Cancelación y Reservación</strong></p>
            <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
              Para garantizar una experiencia justa para todos nuestros alumnos, te pedimos tomar en cuenta lo siguiente:
            </p>
            <p style="font-size: 13px; color: #374151; margin: 0 0 6px 0;">• Cancelación con tiempo: Puedes cancelar tu clase hasta el ${reservationDetails.cancellationDeadlineLabel || `${Number(reservationDetails.cancellationLimitHours || 8)} horas antes`} sin penalización. Tu crédito será devuelto automáticamente.</p>
            <p style="font-size: 13px; color: #374151; margin: 0 0 6px 0;">• Cancelación tardía: Si cancelas fuera de ese límite, el crédito de la clase no será reembolsado.</p>
            <p style="font-size: 13px; color: #374151; margin: 0 0 6px 0;">• Puntualidad: Te recomendamos llegar con anticipación. La clase inicia en el horario establecido.</p>
            <p style="font-size: 13px; color: #374151; margin: 0 0 6px 0;">• Capacidad: Las clases tienen un cupo limitado. Tu lugar queda confirmado únicamente al completar la reservación.</p>
            <p style="font-size: 13px; color: #374151; margin: 0;">• Cancelación por parte del negocio: En caso de que una clase sea cancelada por el coach o por no alcanzar el mínimo de participantes, recibirás una notificación por correo y tu crédito será devuelto en su totalidad.</p>
          </div>
        </div>
      </div>
    `;
        return this.sendEmail({
            to: email,
            subject: 'Reserva confirmada - Focus Fitness',
            html
        });
    }
}
export { EmailService };
export const emailService = new EmailService();
