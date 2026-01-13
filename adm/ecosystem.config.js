module.exports = {
  apps: [
    {
      name: 'admin',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 1003,
        HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT || '3306',
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        JWT_SECRET: process.env.JWT_SECRET,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
