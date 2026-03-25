interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

class EmailService {
  private smtpConfig: SMTPConfig | null = null;

  // Método para configurar SMTP
  setSMTPConfig(config: SMTPConfig) {
    this.smtpConfig = config;
    console.log('🔧 SMTP Configurado:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user
    });
  }

  // En producción, esto se conectaría a un servicio real como SendGrid, AWS SES, etc.
  // Por ahora, simulamos el envío con logs
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Si hay configuración SMTP, usar nodemailer
      if (this.smtpConfig) {
        return this.sendRealEmail(options);
      }

      // Simulación de envío de email
      console.log('📧 EMAIL ENVIADO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Para: ${options.to}`);
      console.log(`Asunto: ${options.subject}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('HTML Content Length:', options.html.length);
      console.log('HTML Preview:', options.html.substring(0, 200) + '...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  ADVERTENCIA: Este es un envío SIMULADO');
      console.log('⚠️  El email NO se está enviando realmente');
      console.log('⚠️  Se necesita configuración SMTP real para envío');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Email enviado exitosamente (simulado)');
      
      // En producción, aquí iría el código real para enviar el email
      // ej: await sendgrid.send(options);
      
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }

  private async sendRealEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('🚀 Enviando email REAL via SMTP...');
      console.log('📧 Destino:', options.to);
      console.log('📧 Asunto:', options.subject);
      
      // Import dinámico de nodemailer
      const nodemailer = await import('nodemailer');
      
      // Crear transporter
      console.log('📡 Creando transporter SMTP...');
      const transporter = nodemailer.createTransport({
        host: this.smtpConfig!.host,
        port: this.smtpConfig!.port,
        secure: this.smtpConfig!.secure,
        auth: {
          user: this.smtpConfig!.user,
          pass: this.smtpConfig!.pass,
        },
        // Timeout y opciones adicionales
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 10000,   // 10 segundos
        socketTimeout: 10000,     // 10 segundos
      });

      console.log('📡 Transporter creado, verificando conexión...');
      console.log('🔍 Intentando conectar a:', `${this.smtpConfig!.host}:${this.smtpConfig!.port}`);
      console.log('🔍 Usando SSL/TLS:', this.smtpConfig!.secure);
      
      // Verificar conexión
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');

      console.log('📧 Enviando email...');
      // Enviar email
      const info = await transporter.sendMail({
        from: `"Focus Fitness" <${this.smtpConfig!.user}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log('📧 Email enviado exitosamente:');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);
      console.log('   Accepted:', info.accepted);
      console.log('   Rejected:', info.rejected);
      console.log('   Pending:', info.pending);
      
      return true;
    } catch (error: any) {
      console.error('❌ Error enviando email REAL:');
      console.error('   Mensaje:', error.message);
      console.error('   Código:', error.code);
      console.error('   Comando:', error.command);
      console.error('   Respuesta SMTP:', error.response);
      console.error('   Código SMTP:', error.responseCode);
      
      // Errores comunes específicos
      if (error.code === 'EAUTH') {
        console.error('   🔐 Error de autenticación - revisa usuario/contraseña');
      } else if (error.code === 'ECONNECTION') {
        console.error('   🔌 Error de conexión - revisa host/puerto');
      } else if (error.code === 'ESOCKET') {
        console.error('   🌐 Error de socket - problema de red');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   ⏰ Timeout - el servidor no responde');
      }
      
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `http://localhost:3000/verify-email`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Focus Fitness</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Verifica tu correo electrónico</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">¡Bienvenido a Focus Fitness!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Gracias por registrarte. Para activar tu cuenta y comenzar a reservar clases, 
            por favor haz clic en el siguiente botón:
          </p>
          
          <form action="${verificationUrl}" method="POST" style="text-align: center; margin: 30px 0;">
            <input type="hidden" name="token" value="${token}" />
            <button type="submit" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;">
              ✅ Verificar mi Correo
            </button>
          </form>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; text-align: center;">
              <strong>🔒 Seguridad:</strong> Este enlace de verificación es personal y expira en 24 horas.
              No lo compartas con otras personas.
            </p>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Si no solicitaste este registro, puedes ignorar este email.<br>
            Este enlace expirará en 24 horas.
          </p>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 Focus Fitness Movement Studio<br>
              Transformando vidas a través del movimiento
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: '🎯 Verifica tu correo - Focus Fitness',
      html
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">FOCUS FITNESS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Movement Studio</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">🔐 Restablecer Contraseña</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Hemos recibido una solicitud para restablecer tu contraseña. Si no fuiste tú, por favor ignora este email.
            Para crear una nueva contraseña, haz clic en el siguiente botón:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; 
                      font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);">
              Restablecer Mi Contraseña
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Este enlace expirará en 1 hora por seguridad.<br>
            Si no solicitaste este cambio, tu cuenta permanecerá segura.
          </p>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 Focus Fitness Movement Studio<br>
              Tu seguridad es nuestra prioridad
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔐 Restablecer Contraseña - Focus Fitness',
      html
    });
  }

  async sendReservationConfirmation(
    email: string,
    reservationDetails: {
      fullName?: string;
      className: string;
      classDate: string;
      startTime: string;
      endTime: string;
      ticketId: string;
    }
  ): Promise<boolean> {
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
          <p style="color: #ffffff; margin: 12px 0 0 0; font-size: 14px; letter-spacing: .12em; text-transform: uppercase;">Confirmación de reserva</p>
        </div>
        <div style="background: #ffffff; border-radius: 0 0 20px 20px; padding: 32px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #111827; margin-top: 0;">
            ¡Hola${reservationDetails.fullName ? `, ${reservationDetails.fullName}` : ''}!
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.7;">
            Tu reserva quedó confirmada. Aquí está tu ticket digital para la próxima sesión.
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
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: '✅ Reserva confirmada - Focus Fitness',
      html
    });
  }
}

export { EmailService };
export const emailService = new EmailService();
