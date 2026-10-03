# 📥 RedGIFs Video Downloader Pro (Vite + React Web App)

Aplicación web moderna creada con **React 18**, **TypeScript**, **Tailwind CSS** y **Vite**, optimizada para desplegarse instantáneamente en **[Bolt.new](https://bolt.new)**, **Vercel**, **Netlify** o de forma local.

Permite descargar videos de [RedGIFs](https://www.redgifs.com/) en máxima calidad (**HD 1080p/720p**) y versión móvil (**SD**), con audio completo, previsualización interactiva, barra de progreso en vivo y soporte para descargas por lotes.

---

## ⚡ Despliegue en Bolt.new

Este repositorio está preparado para importarse directamente en Bolt.new:
1. En Bolt.new, selecciona **"Import from GitHub"**.
2. Introduce el repositorio: `https://github.com/jlherrerovallenova/redgifs`
3. Bolt detectará automáticamente el proyecto Vite/Node.js, ejecutará `npm install` y lanzará la aplicación web sin errores.

---

## 🚀 Ejecución Local

### Opción 1: Con lanzador rápido (Windows)
Haz doble clic en:
```bash
start.bat
```

### Opción 2: Desde terminal (npm)
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```
Abre tu navegador en [http://localhost:5173](http://localhost:5173).

---

## ✨ Características Principales
- **📥 Descarga Individual & Previsualización**: Pega cualquier enlace de RedGIFs (`https://www.redgifs.com/watch/...`) o su ID, previsualiza el video en el reproductor integrado, consulta vistas/tags y descarga en HD o SD.
- **📊 Progreso de Descarga en Vivo**: Muestra porcentaje real (0% - 100%) y megabytes transferidos en tiempo real.
- **📑 Descarga Masiva por Lotes**: Pega múltiples enlaces (uno por línea) para descargarlos todos consecutivamente.
- **🔍 Explorador de RedGIFs**: Busca por palabras clave o categorías y descarga cualquier video con un solo clic.
- **🕒 Historial de Sesión**: Guarda el historial de videos descargados para volver a reproducirlos o descargarlos cuando quieras.
- **🐍 CLI de Python adicional**: Incluye `downloader.py` para quienes deseen descargar por línea de comandos.

---

## 🛠️ Tecnologías
- **React 18** + **TypeScript**
- **Vite 5**
- **Tailwind CSS**
- **Lucide React** (iconos)
- **RedGIFs Public API v2** (CORS nativo en navegador)
