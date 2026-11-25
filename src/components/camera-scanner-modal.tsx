"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraScannerModal({ onScan, onClose }: CameraScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "html5-qrcode-reader";

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (!mounted) return;
          // Hentikan kamera dan teruskan hasil scan
          scanner
            .stop()
            .then(() => {
              onScan(decodedText.trim().toUpperCase());
              onClose();
            })
            .catch(() => {
              onScan(decodedText.trim().toUpperCase());
              onClose();
            });
        },
        () => {
          // ignore frame decode failures
        }
      )
      .catch((err) => {
        if (!mounted) return;
        console.error("Gagal memulai kamera", err);
        setError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
      });

    return () => {
      mounted = false;
      if (scanner.isScanning) {
        scanner.stop().catch((e) => console.error("Error stopping scanner", e));
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Camera className="text-kopi-green dark:text-kopi-olive" size={20} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Scan QR dengan Kamera
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          {error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-center text-xs text-kopi-coral">
              <AlertCircle size={32} className="mx-auto mb-2 text-kopi-coral" />
              {error}
            </div>
          ) : (
            <div className="w-full relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
              <div id={containerId} className="w-full h-full" />
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Arahkan kamera ke QR Code pada kartu digital member.
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

