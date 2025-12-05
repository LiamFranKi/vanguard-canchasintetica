# ⚡ Inicio Rápido

## Comandos Esenciales

```bash
# 1. Instalar todo
npm run install-all

# 2. Crear base de datos (una sola vez)
psql -U postgres -d alquiler_cancha -f server/database/schema.sql

# 3. Configurar .env (editar server/.env con tus credenciales)
copy server\.env.example server\.env

# 4. Crear admin (una sola vez)
npm run init-db

# 5. Cerrar puertos si están ocupados
npm run kill

# 6. Iniciar sistema
npm run dev
```

## Acceso

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000
- **Admin:** DNI `12345678` / Contraseña `12345678`

## Estructura de Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia frontend y backend |
| `npm run kill` | Cierra procesos en puertos 3000 y 5000 |
| `npm run install-all` | Instala todas las dependencias |
| `npm run init-db` | Crea usuario administrador |
| `npm run server` | Solo backend |
| `npm run client` | Solo frontend |

## Checklist de Inicio

- [ ] Node.js instalado
- [ ] PostgreSQL instalado y corriendo
- [ ] Dependencias instaladas (`npm run install-all`)
- [ ] Base de datos creada
- [ ] Schema ejecutado
- [ ] Archivo `.env` configurado
- [ ] Usuario admin creado (`npm run init-db`)
- [ ] Puertos libres (`npm run kill`)
- [ ] Sistema iniciado (`npm run dev`)

¡Listo para usar! 🚀


