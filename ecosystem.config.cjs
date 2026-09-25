/**
 * WaBot Pro — PM2 Production Process Manager Configuration
 *
 * Usage:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 status
 *   pm2 logs wabot
 *   pm2 restart wabot
 *   pm2 stop wabot
 *
 * To enable automatic start on OS boot:
 *   pm2 startup
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'wabot',
      script: 'server/src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '350M', // Crucial for low-RAM devices like Raspberry Pi & VPS
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: 'server/logs/pm2-err.log',
      out_file: 'server/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
