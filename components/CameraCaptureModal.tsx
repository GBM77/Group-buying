import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Zap, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CameraCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

export function CameraCaptureModal({
  open,
  onOpenChange,
  onCapture,
  title = '拍照上傳團購照片 / 菜單'
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const nativeFileInputRef = useRef<HTMLInputElement>(null);
  const albumFileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia is not supported on this browser or environment');
        setHasCameraAccess(false);
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play failed:', e));
      }
      setHasCameraAccess(true);
    } catch (err: any) {
      console.warn('Camera access with specific constraints failed, attempting fallback:', err?.message || err);
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setHasCameraAccess(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play failed:', e));
        }
        setHasCameraAccess(true);
      } catch (fallbackErr: any) {
        // Gracefully handle permission dismissal or unattached camera without throwing an uncaught console.error
        console.warn('Camera access unavailable or permission dismissed:', fallbackErr?.message || fallbackErr?.name || fallbackErr);
        setHasCameraAccess(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (open && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode, capturedImage]);

  // Take photo from video stream
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setHasCameraAccess(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
      onOpenChange(false);
      toast.success('已成功擷取照片並加入！');
    }
  };

  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleNativeCameraFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressImage(file);
        if (result) {
          onCapture(result);
          onOpenChange(false);
          toast.success('已成功擷取照片！');
        }
      } catch {
        toast.error('讀取照片失敗');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        stopCamera();
        setCapturedImage(null);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-md p-4 bg-slate-950 text-white rounded-2xl shadow-2xl border-slate-800">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-bold flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-orange-400" />
              {title}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            可直接使用相機對準團購菜單、手寫訂單或紙本對帳單進行拍照
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : hasCameraAccess === false ? (
            <div className="p-6 text-center space-y-3.5 max-w-xs mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">相機畫面未開啟</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  相機權限已被關閉或略過。您可直接使用手機原生相機拍照，或從相簿選擇照片！
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-1">
                <Button
                  type="button"
                  onClick={() => nativeFileInputRef.current?.click()}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs w-full font-medium"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  開啟手機相機拍照
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => albumFileInputRef.current?.click()}
                  className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs w-full"
                >
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  從相簿選取照片
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setHasCameraAccess(null);
                    startCamera(facingMode);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 h-7"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  重新授權相機鏡頭
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Shutter flash animation overlay */}
              {isShutterActive && (
                <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
              )}
              {/* Viewfinder Grid */}
              <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-b border-white/10" />
              </div>
            </>
          )}

          {/* Hidden native input with capture="environment" for direct phone camera */}
          <input
            type="file"
            ref={nativeFileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeCameraFallback}
          />
          {/* Hidden input for album photo picker */}
          <input
            type="file"
            ref={albumFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleNativeCameraFallback}
          />
        </div>

        {/* Camera Control Actions */}
        <div className="pt-2 flex items-center justify-between gap-2">
          {capturedImage ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                重拍
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4"
              >
                <Check className="w-4 h-4 mr-1" />
                確認使用此照片
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={switchCamera}
                disabled={hasCameraAccess === false}
                className="text-slate-300 hover:bg-slate-800 text-xs disabled:opacity-40"
                title="前後鏡頭切換"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                翻轉鏡頭
              </Button>

              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={hasCameraAccess === false}
                className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-lg bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
                title="拍照"
              >
                <div className="w-10 h-10 rounded-full bg-white" />
              </button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => nativeFileInputRef.current?.click()}
                className="text-orange-400 hover:bg-slate-800 text-xs"
              >
                原生拍照
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
