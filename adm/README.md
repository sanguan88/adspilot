# AdsBot Admin - SaaS Management Application

Aplikasi admin untuk mengelola aplikasi SaaS AdsBot (adbot.seller).

## Fitur

- **Dashboard**: Overview dan analytics
- **User Management**: Kelola user dan roles
- **Subscription & Billing**: Plans, subscriptions, invoices
- **Affiliate Management**: Affiliate system dengan commission tracking
- **Usage & Monitoring**: Usage analytics dan resource monitoring
- **Application Health**: Health monitoring aplikasi
- **Reports**: Reports dan analytics
- **Settings**: System settings

## Setup

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables (copy dari adbot.seller atau buat baru):
```bash
cp ../adbot.seller/db_config.env .env.local
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Struktur

- `app/` - Next.js app router pages
- `components/` - React components
- `lib/` - Utility functions
- `contexts/` - React contexts
- `app/api/` - API routes

## Database

Aplikasi ini menggunakan database yang sama dengan adbot.seller untuk:
- User management
- Subscription data
- Affiliate data
- Usage tracking

