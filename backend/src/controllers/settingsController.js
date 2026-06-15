const db = require('../config/db');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Backup folder inside the backend directory ───
const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ─── In-memory SMTP config store (loaded from DB on first use) ───
let smtpCache = null;

// ─────────────────────────────────────────────
//  DB BACKUP
// ─────────────────────────────────────────────

// Create a backup using mysqldump (requires mysqldump on PATH)
exports.createBackup = async (req, res) => {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'srmss',
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Build mysqldump command
    const passwordArg = dbConfig.password ? `-p"${dbConfig.password}"` : '--password=""';
    const cmd = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} ${passwordArg} ${dbConfig.database} > "${filepath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error.message);
        return res.status(500).json({ success: false, error: 'Backup failed: ' + error.message });
      }

      const stats = fs.statSync(filepath);
      res.json({
        success: true,
        message: 'Backup created successfully',
        backup: {
          filename,
          filepath,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          created_at: new Date().toISOString(),
        },
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// List all backup files
exports.listBackups = (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((filename) => {
        const fp = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(fp);
        return {
          filename,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          created_at: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, backups: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Restore from a specific backup file
exports.restoreBackup = async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, error: 'Filename is required' });

  const filepath = path.join(BACKUP_DIR, path.basename(filename));
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, error: 'Backup file not found' });
  }

  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'srmss',
    };

    const passwordArg = dbConfig.password ? `-p"${dbConfig.password}"` : '--password=""';
    const cmd = `mysql -h ${dbConfig.host} -u ${dbConfig.user} ${passwordArg} ${dbConfig.database} < "${filepath}"`;

    exec(cmd, (error) => {
      if (error) {
        return res.status(500).json({ success: false, error: 'Restore failed: ' + error.message });
      }
      res.json({ success: true, message: `Database restored from ${filename}` });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a backup file
exports.deleteBackup = (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(BACKUP_DIR, path.basename(filename));

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  try {
    fs.unlinkSync(filepath);
    res.json({ success: true, message: 'Backup deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Download a backup file
exports.downloadBackup = (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(BACKUP_DIR, path.basename(filename));

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  res.download(filepath, filename);
};

// ─────────────────────────────────────────────
//  SMTP SETTINGS  (stored in a settings table)
// ─────────────────────────────────────────────

// Ensure the settings table exists
const ensureSettingsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

// Get current SMTP settings
exports.getSmtpSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'smtp_%'`
    );
    const settings = {};
    rows.forEach((r) => (settings[r.setting_key] = r.setting_value));

    res.json({
      success: true,
      smtp: {
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || '587',
        smtp_user: settings.smtp_user || '',
        smtp_password: settings.smtp_password ? '••••••••' : '',
        smtp_from_name: settings.smtp_from_name || 'SRMSS System',
        smtp_from_email: settings.smtp_from_email || '',
        smtp_secure: settings.smtp_secure || 'tls',
        smtp_configured: !!(settings.smtp_host && settings.smtp_user),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Save / update SMTP settings
exports.saveSmtpSettings = async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, smtp_from_email, smtp_secure } = req.body;

  try {
    await ensureSettingsTable();

    const settings = {
      smtp_host,
      smtp_port: smtp_port || '587',
      smtp_user,
      smtp_secure: smtp_secure || 'tls',
      smtp_from_name: smtp_from_name || 'SRMSS System',
      smtp_from_email: smtp_from_email || smtp_user,
    };

    // Only update password if a new one was provided (not the masked placeholder)
    if (smtp_password && smtp_password !== '••••••••') {
      settings.smtp_password = smtp_password;
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }

    smtpCache = null; // Bust the in-memory cache
    res.json({ success: true, message: 'SMTP settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Test SMTP by sending a test email
exports.testSmtp = async (req, res) => {
  const { test_email } = req.body;
  if (!test_email) return res.status(400).json({ success: false, error: 'Test email address is required' });

  try {
    await ensureSettingsTable();
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'smtp_%'`
    );
    const s = {};
    rows.forEach((r) => (s[r.setting_key] = r.setting_value));

    if (!s.smtp_host || !s.smtp_user || !s.smtp_password) {
      return res.status(400).json({ success: false, error: 'SMTP is not configured. Please save settings first.' });
    }

    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port) || 587,
      secure: s.smtp_secure === 'ssl',
      auth: { user: s.smtp_user, pass: s.smtp_password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"${s.smtp_from_name || 'SRMSS'}" <${s.smtp_from_email || s.smtp_user}>`,
      to: test_email,
      subject: '✅ SRMSS SMTP Test Email',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2 style="color:#f59e0b;">SRMSS — SMTP Test Successful</h2>
          <p>Your mail server is correctly configured and working.</p>
          <p style="color:#888;font-size:12px;">Sent at ${new Date().toLocaleString()}</p>
        </div>`,
    });

    res.json({ success: true, message: `Test email sent to ${test_email}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SMTP test failed: ' + err.message });
  }
};

// ─────────────────────────────────────────────
//  FORGOT PASSWORD — send reset link via SMTP
// ─────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { identity } = req.body;
  if (!identity) return res.status(400).json({ success: false, error: 'Username or email is required' });

  try {
    // Find user by username or email
    const [users] = await db.query(
      `SELECT user_id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [identity, identity]
    );

    // Always return success (don't leak whether account exists)
    if (!users.length) {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    const user = users[0];

    // Generate a 6-digit OTP or a token
    const resetToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the reset token in system_settings (or a dedicated table)
    await ensureSettingsTable();
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [`reset_token_${user.user_id}`, JSON.stringify({ token: resetToken, expires: expiresAt })]
    );

    // Fetch SMTP settings
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'smtp_%'`
    );
    const s = {};
    rows.forEach((r) => (s[r.setting_key] = r.setting_value));

    if (!s.smtp_host || !s.smtp_user || !s.smtp_password) {
      return res.json({ success: true, message: 'Reset token generated. SMTP not configured — token: ' + resetToken });
    }

    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port) || 587,
      secure: s.smtp_secure === 'ssl',
      auth: { user: s.smtp_user, pass: s.smtp_password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"${s.smtp_from_name || 'SRMSS'}" <${s.smtp_from_email || s.smtp_user}>`,
      to: user.email,
      subject: '🔑 SRMSS Password Reset Request',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2 style="color:#f59e0b;">Password Reset Request</h2>
          <p>Hello <strong>${user.username}</strong>,</p>
          <p>Your password reset token is:</p>
          <div style="background:#1a1a1a;color:#f59e0b;font-size:28px;font-weight:bold;padding:20px;text-align:center;border-radius:8px;letter-spacing:6px;">
            ${resetToken}
          </div>
          <p>This token expires in 1 hour. If you did not request this, please ignore this email.</p>
          <p style="color:#888;font-size:12px;">SRMSS System — ${new Date().toLocaleString()}</p>
        </div>`,
    });

    res.json({ success: true, message: 'Password reset link sent to your registered email.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
