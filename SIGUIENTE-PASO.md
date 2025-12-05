# ✅ Instalación Completada - Siguiente Paso

## 🎯 Ahora vamos a configurar la Base de Datos

### Paso 1: Verificar que PostgreSQL esté corriendo

Abre una nueva terminal PowerShell y ejecuta:

```bash
psql --version
```

Si ves la versión, PostgreSQL está instalado. Si no, necesitas instalarlo.

### Paso 2: Crear la Base de Datos

**Opción A - Desde pgAdmin (Más fácil):**
1. Abre **pgAdmin** (búscalo en el menú inicio)
2. Conecta al servidor PostgreSQL (te pedirá tu contraseña)
3. Click derecho en "Databases"
4. Create > Database
5. Nombre: `alquiler_cancha`
6. Click "Save"

**Opción B - Desde Terminal:**
```bash
psql -U postgres
```

Si te pide contraseña, ingrésala. Luego dentro de psql:

```sql
CREATE DATABASE alquiler_cancha;
\q
```

### Paso 3: Ejecutar el Schema SQL

Desde la raíz del proyecto (donde estás ahora):

```bash
psql -U postgres -d alquiler_cancha -f server\database\schema.sql
```

**Si te pide contraseña:** Ingresa la contraseña de PostgreSQL

**✅ Deberías ver muchos mensajes:**
- CREATE TABLE
- CREATE INDEX
- CREATE TRIGGER
- INSERT (para las configuraciones iniciales)

---

## 📝 ¿Necesitas ayuda con PostgreSQL?

Si no tienes PostgreSQL instalado o no recuerdas la contraseña, avísame y te guío.

---

## 🚀 Después de configurar la BD, seguimos con:

1. ✅ Configurar archivo .env
2. ✅ Crear usuario administrador
3. ✅ Iniciar el sistema

¿Ya tienes PostgreSQL configurado? Si sí, ejecuta el Paso 3 y me dices cómo va.


