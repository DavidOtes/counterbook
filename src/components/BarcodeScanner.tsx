import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";

/**
 * Camera barcode scanning via the BarcodeDetector API — supported on
 * Chrome/Android, which is where our users are. Elsewhere we show a
 * friendly note (USB scanners and typing always work).
 */
export function BarcodeScanner({
  open,
  onClose,
  onCode,
}: {
  open: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function run() {
      const Detector = (window as unknown as { BarcodeDetector?: new (opts?: unknown) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (!Detector) {
        setError(
          "This browser can't scan with the camera. Use Chrome on Android, plug in a USB scanner, or type the code.",
        );
        return;
      }
      try {
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || cancelled) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              onCode(codes[0].rawValue);
              onClose();
              return;
            }
          } catch {
            /* frame not ready yet — keep polling */
          }
          timer = setTimeout(tick, 180);
        };
        tick();
      } catch {
        setError("Couldn't open the camera. Check the camera permission for this site.");
      }
    }

    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-display font-bold text-paper">Scan a barcode</p>
        <button onClick={onClose} aria-label="Close" className="rounded-sm p-2 text-paper/80 hover:text-paper">
          <XIcon width={22} height={22} />
        </button>
      </div>
      {error ? (
        <div className="flex flex-1 items-center justify-center px-8">
          <p className="max-w-[40ch] text-center leading-relaxed text-paper/90">{error}</p>
        </div>
      ) : (
        <div className="relative flex-1">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-72 rounded-lg border-2 border-paper/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          <p className="absolute inset-x-0 bottom-8 text-center text-[14px] text-paper/90">
            Hold the code inside the frame
          </p>
        </div>
      )}
    </div>
  );
}
