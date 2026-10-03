# 📥 RedGIFs Video Downloader Pro

Herramienta completa para descargar videos de [RedGIFs](https://www.redgifs.com/) en máxima calidad (**HD 1080p/720p**) y versión móvil (**SD**), con soporte para audio, previsualización interactiva y descargas masivas por lotes.

---

## 🚀 Opciones de Uso

### 1. Interfaz Web Interactiva (Recomendada)
Para abrir la interfaz visual en tu navegador:
1. Haz doble clic en el archivo [**`start.bat`**](file:///c:/Users/Celia/Desktop/JLH/Buscador/start.bat).
2. Se abrirá automáticamente tu navegador en **http://localhost:8000**.

**Funcionalidades de la interfaz web:**
- **📥 Descarga Individual**: Pega cualquier enlace de RedGIFs (ej: `https://www.redgifs.com/watch/...`), previsualiza el video en el reproductor integrado, consulta vistas y tags, y elige descargar en **HD** o **SD**.
- **📑 Descarga Masiva por Lotes**: Pega decenas de enlaces (uno por línea) para descargarlos todos juntos con barra de progreso en tiempo real.
- **🔍 Explorador de RedGIFs**: Busca videos directamente por temática o etiquetas y descárgalos con un solo clic.
- **📁 Gestor de Descargas**: Mira los videos guardados en tu equipo, reprodúcelos o pulsa **"Abrir Carpeta en Windows"** para abrir el explorador de archivos directamente en la carpeta [`downloads/`](file:///c:/Users/Celia/Desktop/JLH/Buscador/downloads).

---

### 2. Uso desde Línea de Comandos (CLI / Terminal)
Puedes usar el script [**`downloader.py`**](file:///c:/Users/Celia/Desktop/JLH/Buscador/downloader.py) directamente desde cualquier terminal de PowerShell o CMD:

```bash
# Descargar un video en HD
python downloader.py https://www.redgifs.com/watch/ID_DEL_VIDEO

# Descargar en calidad móvil (SD)
python downloader.py https://www.redgifs.com/watch/ID_DEL_VIDEO -q sd

# Descargar por lotes desde un archivo de texto con enlaces
python downloader.py -f enlaces.txt

# Buscar videos por palabra clave
python downloader.py -s "dance"
```

---

## 📁 Ubicación de los Archivos Descargados
Todos los videos descargados se almacenan automáticamente en la carpeta:
📂 [**`downloads/`**](file:///c:/Users/Celia/Desktop/JLH/Buscador/downloads) con el formato:
`nombreusuario_idvideo_calidad.mp4`.
