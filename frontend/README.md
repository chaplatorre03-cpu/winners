# 🎰 WINNERS - Plataforma de Rifas Neo-Punk

## 🚀 Tu aplicación está LISTA y CORRIENDO

### 📍 URLs de Acceso

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

---

## 🔐 Credenciales de Prueba

### Usuario Administrador
- **Email**: admin@winners.com
- **Contraseña**: admin123
- **Permisos**: Acceso total, puede sortear ganadores

### Usuario Regular
- **Email**: user@winners.com
- **Contraseña**: user123
- **Permisos**: Puede comprar tickets y crear rifas

---

## ✨ Funcionalidades Implementadas

### ✅ Autenticación JWT
- Registro de usuarios
- Login/Logout
- Protección de rutas
- Tokens con expiración de 7 días

### ✅ Gestión de Rifas
- Crear rifas (usuarios autenticados)
- Explorar rifas disponibles
- Ver detalles de cada rifa
- Progreso visual de tickets vendidos

### ✅ Compra de Tickets
- Selección visual de tickets
- Verificación de disponibilidad en tiempo real
- Cálculo automático del total
- Confirmación de compra

### ✅ Sistema de Sorteo Automático
- Selección aleatoria de ganador
- Solo administradores pueden sortear
- Notificación del ganador
- Actualización automática del estado

### ✅ Panel de Administración
- Estadísticas globales
- Gestión de todas las rifas
- Sorteo de ganadores
- Vista de ingresos totales

---

## 🎨 Características de Diseño

- **Estilo Neo-Punk** con colores neón (Magenta, Cian, Amarillo)
- **Animaciones modernas** y efectos hover
- **Diseño responsivo** (móvil y desktop)
- **Grid 3D** en perspectiva en el hero
- **Glassmorphism** en componentes

---

## 📋 Cómo Usar la Aplicación

### 1. Explorar Rifas
- Ve a "Explorar Rifas" para ver todas las rifas activas
- Haz clic en cualquier rifa para ver detalles

### 2. Comprar Tickets
- Inicia sesión (o regístrate)
- Entra a una rifa
- Selecciona los números de ticket que desees
- Haz clic en "Comprar Tickets"

### 3. Crear una Rifa
- Inicia sesión
- Ve a "Crear Rifa"
- Completa el formulario
- Lanza tu rifa

### 4. Panel de Administración (Solo Admin)
- Inicia sesión como admin
- Ve a "Admin" en el menú
- Visualiza estadísticas
- Sortea ganadores de rifas activas

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- React 18
- Vite
- React Router
- Lucide Icons
- CSS Vanilla

### Backend
- Node.js
- Express
- Prisma ORM
- SQLite (base de datos local)
- JWT (autenticación)
- Bcrypt (encriptación)

---

## 📊 Estructura de la Base de Datos

### Modelos
- **User**: Usuarios del sistema
- **Raffle**: Rifas creadas
- **Ticket**: Tickets comprados

### Relaciones
- Un usuario puede crear muchas rifas
- Un usuario puede comprar muchos tickets
- Una rifa tiene muchos tickets

---

## 🎯 Próximos Pasos Sugeridos

1. **Pasarela de Pagos**: Integrar Stripe/PayPal
2. **Notificaciones**: Emails al comprar/ganar
3. **Chat en Vivo**: Soporte en tiempo real
4. **Compartir en Redes**: Botones sociales
5. **Historial**: Ver rifas pasadas y ganadores
6. **Migrar a PostgreSQL**: Para producción
7. **Desplegar en Google Cloud**: Como planeaste

---

## 🐛 Solución de Problemas

### El backend no inicia
```bash
cd winners-backend
npm run dev
```

### El frontend no inicia
```bash
cd winners-neo-punk
npm run dev
```

### Resetear la base de datos
```bash
cd winners-backend
del dev.db
npx prisma migrate dev --name init
node prisma/seed.js
```

---

## 📞 Soporte

Si encuentras algún problema, revisa:
1. Que ambos servidores estén corriendo
2. Que las URLs sean correctas
3. Que hayas iniciado sesión para funciones protegidas

---

**¡Disfruta tu aplicación Winners! 🎉**
