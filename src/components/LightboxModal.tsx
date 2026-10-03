import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface LightboxModalProps {
  open: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ open, url, title, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // fallback
        }
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={title || 'Reproductor de video'}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 w-full h-full max-w-none max-h-none border-none animate-fadeIn m-0"
    >
      <div className="bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200 truncate">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar reproductor"
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <video
          src={url}
          controls
          autoPlay
          muted
          playsInline
          loop
          className="w-full max-h-[70vh] bg-black"
        />
      </div>
    </dialog>
  );
};
