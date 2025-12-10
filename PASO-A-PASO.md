# 📋 Guía Paso a Paso - Empezar Ahora

## 🎯 Objetivo
Tener el sistema funcionando completamente en tu máquina local.

---

## PASO 1: Verificar Instalaciones ✅

Abre PowerShell o CMD y verifica:

```bash
node --version
npm --version
psql --version
```

**Si falta alguno:**
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/windows/

---

## PASO 2: Instalar Dependencias 📦

Desde la raíz del proyecto (donde está este archivo):

```bash
npm run install-all
```

**⏱️ Esto tomará 5-10 minutos**

**✅ Verificación:** Deberías ver mensajes de instalación sin errores.

---

## PASO 3: Configurar PostgreSQL 🗄️

### 3.1. Abrir PostgreSQL

Abre **pgAdmin** o **psql** desde la terminal.

### 3.2. Crear Base de Datos

**Opción A - Desde pgAdmin:**
1. Click derecho en "Databases"
2. Create > Database
3. Nombre: `alquiler_cancha`
4. Click "Save"

**Opción B - Desde Terminal:**
```bash
psql -U postgres
CREATE DATABASE alquiler_cancha;
\q
```

### 3.3. Ejecutar Schema SQL

Desde la raíz del proyecto:

```bash
psql -U postgres -d alquiler_cancha -f server\database\schema.sql
```

**Si te pide contraseña:** Ingresa la contraseña de PostgreSQL.

**✅ Verificación:** Deberías ver muchos mensajes "CREATE TABLE", "CREATE INDEX", etc.

---

## PASO 4: Configurar Variables de Entorno ⚙️

### 4.1. Crear archivo .env

```bash
copy server\.env.example server\.env
```

### 4.2. Editar server/.env

Abre `server/.env` con tu editor favorito y **cambia estos valores:**

```env
# ⚠️ CAMBIAR ESTOS VALORES:
DB_PASSWORD=tu_contraseña_de_postgres
JWT_SECRET=cualquier_texto_largo_y_seguro_aqui_123456789

# Los demás valores pueden quedarse igual por ahora
```

**⚠️ IMPORTANTE:**
- `DB_PASSWORD`: La contraseña que usas para PostgreSQL
- `JWT_SECRET`: Cualquier texto largo y aleatorio (ej: `mi_clave_secreta_super_segura_2024`)

---

## PASO 5: Crear Usuario Administrador 👤

```bash
npm run init-db
```

**✅ Verificación:** Deberías ver:
```
✅ Administrador creado exitosamente:
   DNI: 12345678
   Contraseña: 12345678
```

---

## PASO 6: Liberar Puertos 🔓

```bash
npm run kill
```

**✅ Verificación:** Deberías ver:
```
✓ Proceso XXXX en puerto 3000 terminado
✓ Proceso XXXX en puerto 5000 terminado
✅ Todos los puertos han sido liberados
```

(Si no hay procesos, dirá que los puertos están libres)

---

## PASO 7: Iniciar el Sistema 🚀

```bash
npm run dev
```

**✅ Verificación:** Deberías ver:

```
[SERVER] ✅ Base de datos conectada
[SERVER] 🚀 Servidor corriendo en puerto 5000
[CLIENT] Compiled successfully!
[CLIENT] webpack compiled successfully
```

**⏱️ Espera 30-60 segundos** hasta que ambos servidores estén listos.

---

## PASO 8: Abrir en el Navegador 🌐

1. Abre tu navegador (Chrome, Firefox, Edge)
2. Ve a: **http://localhost:3000**
3. Deberías ver la **Landing Page** con tema de fútbol ⚽

---

## PASO 9: Iniciar Sesión 🔐

1. Click en **"Iniciar Sesión"**
2. Ingresa:
   - **DNI:** `12345678`
   - **Contraseña:** `12345678`
3. Click en **"Iniciar Sesión"**

**✅ Deberías ser redirigido al panel de administración**

---

## ✅ ¡Sistema Funcionando!

Ahora puedes:

1. **Crear Canchas** → `/admin/canchas`
2. **Configurar Costos** → Editar una cancha
3. **Crear Usuarios** → `/admin/usuarios`
4. **Ver Horarios** → `/app/horarios`
5. **Hacer Reservas** → Desde horarios o `/app/reservas`

---

## 🛠️ Comandos Útiles

```bash
# Iniciar todo
npm run dev

# Cerrar puertos
npm run kill

# Solo backend
npm run server

# Solo frontend  
npm run client
```

---

## ❌ Si Algo Sale Mal

### Error: "Puerto en uso"
```bash
npm run kill
npm run dev
```

### Error: "No se puede conectar a PostgreSQL"
- Verifica que PostgreSQL esté corriendo
- Revisa `DB_PASSWORD` en `server/.env`
- Verifica que la base de datos existe

### Error: "Module not found"
```bash
npm run install-all
```

### El frontend no carga
- Espera 30-60 segundos después de `npm run dev`
- Verifica que veas "Compiled successfully"
- Abre http://localhost:3000 (no 5000)

### El backend no responde
- Verifica que veas "🚀 Servidor corriendo en puerto 5000"
- Revisa los errores en la consola
- Verifica la conexión a PostgreSQL

---

## 📞 ¿Necesitas Ayuda?

Si encuentras algún error:
1. Copia el mensaje de error completo
2. Revisa en qué paso estás
3. Verifica que hayas completado todos los pasos anteriores

---

## 🎉 ¡Siguiente Paso!

Una vez que el sistema esté funcionando, puedes:

1. **Personalizar configuración** → `/admin/config`
2. **Crear tu primera cancha**
3. **Configurar horarios y costos**
4. **Crear usuarios de prueba**

¡Éxito! 🚀



