module.exports = {
  apps: [{
    name: 'adbot',
    script: './server.js',
    instances: 1, // Gunakan 1 instance, atau 'max' untuk menggunakan semua CPU cores
    exec_mode: 'fork', // 'fork' untuk single instance, 'cluster' untuk multiple instances
    env: {
      NODE_ENV: 'production',
      PORT: 2003,
      HOSTNAME: '127.0.0.1',
      DB_HOST: '154.19.37.179',
      DB_PORT: '3306',
      DB_NAME: 'soroboti_db',
      DB_USER: 'soroboti_db',
      DB_PASSWORD: '123qweASD!@#!@#'
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
  }]
};

