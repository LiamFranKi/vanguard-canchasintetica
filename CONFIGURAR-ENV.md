# ⚙️ Configurar archivo .env

## 📝 Paso 1: Abrir el archivo .env

El archivo está en: `server/.env`

Puedes abrirlo con:
- Notepad
- Visual Studio Code
- Cualquier editor de texto

## 🔑 Paso 2: Cambiar estos valores IMPORTANTES

### 1. Contraseña de PostgreSQL
```env
DB_PASSWORD=tu_contraseña_de_postgres_aqui
```
**⚠️ Cambia `your_password` por tu contraseña real de PostgreSQL**

### 2. JWT Secret (Clave secreta)
```env
JWT_SECRET=cualquier_texto_largo_y_seguro_aqui_123456789
```
**⚠️ Cambia `your_super_secret_jwt_key_change_in_production` por cualquier texto largo y aleatorio**

**Ejemplo de JWT_SECRET:**
```
JWT_SECRET=mi_clave_secreta_super_segura_2024_alquiler_canchas_xyz123
```

## ✅ Los demás valores pueden quedarse igual por ahora

- `DB_HOST=localhost` ✅
- `DB_PORT=5432` ✅
- `DB_NAME=alquiler_cancha` ✅
- `DB_USER=postgres` ✅
- `PORT=5000` ✅
- `FRONTEND_URL=http://localhost:3000` ✅

## 📧 Email y Push (Opcional por ahora)

Puedes dejar estos valores por defecto y configurarlos después:
- `EMAIL_*` - Para correos
- `VAPID_*` - Para notificaciones push

---

## 🎯 Resumen: Solo necesitas cambiar 2 cosas

1. **DB_PASSWORD** = Tu contraseña de PostgreSQL
2. **JWT_SECRET** = Cualquier texto largo y seguro

---

## ✅ Cuando termines de editar

Guarda el archivo y avísame. Luego creamos el usuario administrador.



