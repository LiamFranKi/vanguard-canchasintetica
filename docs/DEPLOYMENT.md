# Guía de Deployment

## Preparación para Hostinger VPS

### 1. Requisitos del Servidor

- Node.js 18+ 
- PostgreSQL 14+
- PM2 (gestor de procesos)
- Nginx (proxy reverso)

### 2. Configuración Inicial

```bash
# Conectar al servidor VPS
ssh usuario@tu-servidor.com

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y
```

### 3. Configurar Base de Datos

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE alquiler_cancha;
CREATE USER cancha_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE alquiler_cancha TO cancha_user;
\q

# Ejecutar schema
psql -U cancha_user -d alquiler_cancha -f server/database/schema.sql
```

### 4. Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/sistema-alquilercancha.git
cd sistema-alquilercancha

# Instalar dependencias
npm run install-all

# Configurar variables de entorno
cp server/.env.example server/.env
nano server/.env
# Editar con tus credenciales
```

### 5. Build del Frontend

```bash
cd client
npm run build
cd ..
```

### 6. Configurar PM2

```bash
# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cancha-api',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Configurar Nginx

```bash
# Crear configuración
sudo nano /etc/nginx/sites-available/canchas

# Contenido:
server {
    listen 80;
    server_name canchas.tu-dominio.com;

    # Frontend
    location / {
        root /ruta/a/sistema-alquilercancha/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /ruta/a/sistema-alquilercancha/server/uploads;
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/canchas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d canchas.tu-dominio.com
```

### 9. Comandos Útiles

```bash
# Ver logs
pm2 logs cancha-api

# Reiniciar aplicación
pm2 restart cancha-api

# Ver estado
pm2 status

# Actualizar aplicación
git pull
cd client && npm run build
pm2 restart cancha-api
```

## Variables de Entorno Requeridas

Asegúrate de configurar todas las variables en `server/.env`:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (generar uno seguro)
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `FRONTEND_URL` (URL de producción)


