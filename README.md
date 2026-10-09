# Pomodoro UX — aplicación educativa

Starter funcional para construir una aplicación web responsive de técnica Pomodoro.

## Tecnologías
- React + Vite
- CSS responsive (sin framework CSS adicional)
- Supabase Auth + PostgreSQL + Row Level Security
- Lucide React (iconos)
- Vercel para despliegue del frontend

## Requisitos
Instala Node.js LTS (compatible con Vite actual) y Git. Verifica:
```bash
node -v
npm -v
git --version
```

## 1. Instalar y ejecutar
Descomprime el proyecto, abre su carpeta en VS Code y ejecuta en la terminal:
```bash
npm install
```

## 2. Crear Supabase
1. Entra en https://supabase.com y crea un proyecto gratuito.
2. Abre SQL Editor y ejecuta todo el contenido de `supabase/setup.sql`.
3. En Project Settings / API (o Connect), copia Project URL y la publishable key.
4. Copia `.env.example` a un archivo llamado `.env.local`.
5. Sustituye los valores de ejemplo:
```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```
6. Guarda el archivo y reinicia el servidor si ya estaba corriendo.

La clave publishable puede utilizarse en el frontend si las tablas están protegidas por RLS. Nunca uses `service_role` en React ni subas `.env.local` a GitHub.

## 3. Ejecutar
```bash
npm run dev
```
Abre la URL que Vite muestre en la terminal (normalmente http://localhost:5173).

## 4. Probar
- Registra una cuenta con correo y contraseña.
- Si Supabase solicita confirmar correo, confirma antes de iniciar sesión.
- Añade, completa y elimina tareas.
- Prueba el temporizador de enfoque/descanso.
- Comprueba que al cerrar sesión y volver a entrar las tareas sigan ahí.

## 5. Compilar para producción
```bash
npm run build
npm run preview
```

## 6. Publicar en Vercel
1. Crea un repositorio nuevo en tu GitHub y sube este proyecto.
2. En https://vercel.com, importa el repositorio.
3. Añade las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en Project Settings > Environment Variables.
4. Despliega.
5. En Supabase > Authentication > URL Configuration, configura Site URL y Redirect URLs con el dominio HTTPS que Vercel te asigne.

## Estado de esta primera versión
Incluye registro/inicio de sesión, panel responsive, cinco fases educativas, temporizador de enfoque/descanso, tareas con prioridades, progreso de tareas y guardado de sesiones en Supabase.

Próximas mejoras recomendadas: historial estadístico real, edición de tareas, recuperación de contraseña, preferencias de duración, accesibilidad avanzada, pruebas automatizadas y revisión de políticas de autenticación antes de abrir el servicio al público.
