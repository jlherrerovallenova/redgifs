import os
import subprocess
import platform
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from downloader import RedGifsDownloader

app = FastAPI(title="RedGIFs Downloader Pro", version="1.0.0")

client = RedGifsDownloader()
DOWNLOAD_DIR = os.path.abspath("downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

class DownloadRequest(BaseModel):
    url: str
    quality: str = "hd" # "hd" or "sd"

class BatchDownloadRequest(BaseModel):
    urls: List[str]
    quality: str = "hd"

@app.get("/api/info")
def get_info(url: str = Query(..., description="URL o ID de RedGIFs")):
    try:
        info = client.get_video_info(url)
        return info
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download")
def download_single(req: DownloadRequest):
    try:
        result = client.download_video(req.url, output_dir=DOWNLOAD_DIR, quality=req.quality)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch-download")
def download_batch(req: BatchDownloadRequest):
    results = []
    errors = []
    for u in req.urls:
        clean_u = u.strip()
        if not clean_u:
            continue
        try:
            res = client.download_video(clean_u, output_dir=DOWNLOAD_DIR, quality=req.quality)
            results.append(res)
        except Exception as e:
            errors.append({"url": clean_u, "error": str(e)})

    return {
        "total": len(req.urls),
        "downloaded": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors
    }

@app.get("/api/search")
def search_redgifs(q: str = Query(..., description="Término de búsqueda"), page: int = 1, count: int = 20):
    try:
        results = client.search_videos(q, count=count, page=page)
        return {"query": q, "results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/downloads")
def list_downloads():
    files = []
    if os.path.exists(DOWNLOAD_DIR):
        for fname in os.listdir(DOWNLOAD_DIR):
            if fname.lower().endswith(('.mp4', '.webm')):
                fpath = os.path.join(DOWNLOAD_DIR, fname)
                stat = os.stat(fpath)
                files.append({
                    "filename": fname,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "created_at": stat.st_mtime,
                    "url": f"/downloads/{fname}"
                })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return {"files": files, "count": len(files), "download_dir": DOWNLOAD_DIR}

@app.post("/api/open-folder")
def open_download_folder():
    """Abre la carpeta de descargas en el explorador de archivos de Windows."""
    try:
        if platform.system() == "Windows":
            os.startfile(DOWNLOAD_DIR)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", DOWNLOAD_DIR])
        else:
            subprocess.Popen(["xdg-open", DOWNLOAD_DIR])
        return {"success": True, "path": DOWNLOAD_DIR}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo abrir la carpeta: {e}")

@app.delete("/api/downloads/{filename}")
def delete_downloaded_file(filename: str):
    fpath = os.path.join(DOWNLOAD_DIR, filename)
    if os.path.exists(fpath):
        try:
            os.remove(fpath)
            return {"success": True, "deleted": filename}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="Archivo no encontrado")

# Servir archivos descargados para streaming local
app.mount("/downloads", StaticFiles(directory=DOWNLOAD_DIR), name="downloads")

# Servir archivos estáticos de la interfaz web
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
