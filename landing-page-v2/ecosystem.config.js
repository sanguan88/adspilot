module.exports = {
  apps: [
    {
      name: 'app-landing',
      script: 'npm',
      args: 'start',
      cwd: '/root/adspilot/landing-page-v2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        HOSTNAME: '0.0.0.0',
        DB_HOST: '154.19.37.198',
        DB_PORT: '3306',
        DB_NAME: 'soroboti_ads',
        DB_USER: 'soroboti_db',
        DB_PASSWORD: '123qweASD!@#!@#',
        NEXT_PUBLIC_API_URL: 'https://app.adspilot.id',
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
