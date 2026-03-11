import { useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFaceApi } from '@/hooks/useFaceApi';

interface Props {
  onCapture: (descriptor: number[]) => void;
  onSkip: () => void;
}

export function FaceCapture({ onCapture, onSkip }: Props) {
  const { modelsLoaded, modelLoading, loadProgress, loadModels, startCamera, stopCamera, detectFace, getDescriptorArray, videoRef } = useFaceApi();
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const handleStartCamera = async () => {
    try {
      setError('');
      if (!modelsLoaded) await loadModels();
      await startCamera();
      setCameraActive(true);
      startDetectionLoop();
    } catch (e: any) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('ক্যামেরার অনুমতি দিন। ফোনের সেটিংসে গিয়ে ক্যামেরা অনুমতি চালু করুন।');
      } else {
        setError('ক্যামেরা চালু করতে সমস্যা হয়েছে');
      }
    }
  };

  const startDetectionLoop = useCallback(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled || !videoRef.current) return;
      const detection = await detectFace(videoRef.current);
      if (cancelled) return;
      setFaceDetected(!!detection);
      if (detection) {
        // Auto capture after face is stable
        setCapturing(true);
        await new Promise(r => setTimeout(r, 2000));
        if (cancelled) return;
        // Re-detect to confirm
        const finalDetection = await detectFace(videoRef.current!);
        if (finalDetection) {
          const descriptor = getDescriptorArray(finalDetection.descriptor);
          stopCamera();
          setCaptured(true);
          setCapturing(false);
          setCameraActive(false);
          onCapture(descriptor);
          return;
        }
        setCapturing(false);
      }
      if (!cancelled) requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelled = true; };
  }, [detectFace, getDescriptorArray, stopCamera, onCapture, videoRef]);

  if (captured) {
    return (
      <div className="text-center space-y-4 p-6">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">মুখের ছবি সেভ হয়েছে ✓</h3>
        <p className="text-sm text-muted-foreground">পাসওয়ার্ড রিকভারিতে মুখ স্ক্যান ব্যবহার করা যাবে।</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="text-center space-y-4 p-6">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={onSkip} className="w-full rounded-xl">
          এড়িয়ে যান
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Camera className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">📸 আপনার মুখের ছবি তুলুন</h3>
        <p className="text-sm text-muted-foreground mt-1">
          পাসওয়ার্ড ভুলে গেলে মুখ স্ক্যান করে রিকভার করতে পারবেন।
        </p>
      </div>

      {modelLoading && (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground">মডেল লোড হচ্ছে... ⏳</p>
          <Progress value={loadProgress} className="h-2" />
        </div>
      )}

      {cameraActive && (
        <div className="relative mx-auto w-56 h-56">
          <div className={`w-56 h-56 rounded-full overflow-hidden border-4 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-muted'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
          {faceDetected && !capturing && (
            <p className="text-center text-sm text-emerald-600 mt-2">মুখ পাওয়া গেছে ✓</p>
          )}
          {!faceDetected && (
            <p className="text-center text-sm text-muted-foreground mt-2">মুখ দেখা যাচ্ছে না! ক্যামেরার দিকে তাকান</p>
          )}
          {capturing && (
            <div className="text-center mt-2">
              <Loader2 className="w-5 h-5 animate-spin inline mr-1" />
              <span className="text-sm text-primary">ক্যাপচার হচ্ছে...</span>
            </div>
          )}
        </div>
      )}

      {error && !permissionDenied && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          ভালো আলোতে সরাসরি ক্যামেরার দিকে তাকান।
        </p>
      </div>

      {!cameraActive && (
        <div className="space-y-3">
          <Button onClick={handleStartCamera} disabled={modelLoading} className="w-full py-5 rounded-xl">
            {modelLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Camera className="w-5 h-5 mr-2" />}
            ক্যামেরা চালু করুন
          </Button>
          <Button variant="outline" onClick={onSkip} className="w-full py-4 rounded-xl text-muted-foreground">
            এড়িয়ে যান →
          </Button>
        </div>
      )}

      <div className="bg-accent/50 rounded-xl p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          🔒 আপনার মুখের তথ্য এনক্রিপ্টেড অবস্থায় সংরক্ষিত থাকে। কেউ দেখতে পাবে না।
        </p>
      </div>
    </div>
  );
}
