import { useEffect, useRef, useState } from 'react';
import { initializeObjectDetector } from '../lib/detector';
import { isScannableItem } from '../lib/scannableItems';

interface ScannerProps {
  onDetected?: (label: string) => void;
}

export function Scanner({ onDetected }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [detectedObj, setDetectedObj] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let animationFrameId: number;
    let localStream: MediaStream | null = null;
    let isMounted = true;

    async function setupCameraAndDetector() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          localStream = stream;
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                videoRef.current!.play();
                resolve();
              };
            }
          });
        }
        
        const detector = await initializeObjectDetector();
        setIsClassifying(true);

        let hasLocked = false;

        const renderLoop = async () => {
          if (!videoRef.current || !canvasRef.current || !isMounted) return;
          const video = videoRef.current;
          
          // Wait until video has loaded dimensions fully
          if (video.videoWidth > 0 && video.videoHeight > 0 && video.currentTime > 0) {
            const detections = detector.detectForVideo(video, performance.now());
            
            // Draw boxes
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              for (const detection of detections.detections) {
                const box = detection.boundingBox;
                const category = detection.categories[0];
                
                // Only process and draw boxes for objects in our whitelist
                if (box && category && isScannableItem(category.categoryName)) {
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = '#8B5CF6'; // Fantasy Purple
                  ctx.strokeRect(box.originX, box.originY, box.width, box.height);
                  
                  ctx.fillStyle = '#8B5CF6';
                  ctx.font = '24px Arial';
                  ctx.fillText(
                    `${category.categoryName} (${Math.round(category.score * 100)}%)`, 
                    box.originX, 
                    box.originY - 10
                  );

                  // Higher confidence threshold (65%) required to lock on, preventing false positives
                  if (category.score > 0.65 && !hasLocked) {
                    hasLocked = true;
                    setDetectedObj(category.categoryName);
                    if (onDetected) onDetected(category.categoryName);
                  }
                }
              }
            }
          }
          
          animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        
      } catch (err: any) {
        console.error("Camera access denied or detector failed:", err);
        setErrorMsg(err.message || "Failed to access camera");
      }
    }

    setupCameraAndDetector();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (errorMsg) {
    return (
      <div className="bg-red-900/40 text-red-200 border border-red-500 rounded p-4 text-center">
        <p className="font-bold">Camera Error</p>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-gray-800 shadow-[0_0_40px_-15px_rgba(139,92,246,0.3)]">
      <video 
        ref={videoRef} 
        className="w-full h-auto block" 
        playsInline 
        muted 
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none" 
      />
      
      {!isClassifying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white backdrop-blur-sm">
          <p className="animate-pulse font-medium text-lg">Initializing Object Scanner...</p>
        </div>
      )}

      {detectedObj && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-purple-400">
          Target Locked: {detectedObj.toUpperCase()}
        </div>
      )}
    </div>
  );
}
