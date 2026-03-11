import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Loader2, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFaceApi } from '@/hooks/useFaceApi';

interface Props {
  storedDescriptor: number[];
  onMatch: () => void;
  onFail: () => void;
  maxAttempts?: number;
}

export function FaceScan({ storedDescriptor, onMatch, onFail, maxAttempts = 3 }: Props) {
  const { modelsLoaded, modelLoading, loadProgress, loadModels, startCamera, stopCamera, detectFace, compareDescriptors, videoRef } = useFaceApi();
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'matched' | 'failed' | 'no-face'>('idle');
  const [error, setError] = useState('');
  const scanningRef = useRef(false);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const handleStart = async () => {
    try {
      setError('');
      if (!modelsLoaded) await loadModels();
      await startCamera();
      setCameraActive(true);
      setStatus('idle');
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('ক্যামেরার অনুমতি দিন। সেটিংসে গিয়ে ক্যামেরা অনুমতি চালু করুন।');
        onFail();
      } else {
        setError('ক্যামেরা চালু করতে সমস্যা হয়েছে');
      }
    }
  };

  const handleScan = useCallback(async () => {
    if (scanningRef.current || !videoRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    setStatus('scanning');

    try {
      const detection = await detectFace(videoRef.current);
      if (!detection) {
        setStatus('no-face');
        scanningRef.current = false;
        setScanning(false);
        return;
      }

      const distance = compareDescriptors(storedDescriptor, detection.descriptor);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (distance <= 0.5) {
        setStatus('matched');
        stopCamera();
        setCameraActive(false);
        setTimeout(() => onMatch(), 1500);
      } else {
        setStatus('failed');
        if (newAttempts >= maxAttempts) {
          stopCamera();
          setCameraActive(false);
          setTimeout(() => onFail(), 2000);
        }
      }
    } catch (e) {
      setStatus('failed');
      setError('স্ক্যান করতে সমস্যা হয়েছে');
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [detectFace, compareDescriptors, storedDescriptor, attempts, maxAttempts, stopCamera, onMatch, onFail, videoRef]);

  const remaining = maxAttempts - attempts;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">🔍 মুখ স্ক্যান করুন</h3>
        <p className="text-sm text-muted-foreground mt-1">
          আপনার মুখ ফ্রেমের মধ্যে রাখুন, সরাসরি ক্যামেরার দিকে তাকান।
        </p>
      </div>

      {modelLoading && (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground">মডেল লোড হচ্ছে... ⏳</p>
          <Progress value={loadProgress} className="h-2" />
        </div>
      )}

      {cameraActive && (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-56 h-56 rounded-full overflow-hidden border-4 transition-colors ${
            status === 'matched' ? 'border-emerald-500' : 
            status === 'failed' ? 'border-destructive' : 
            status === 'scanning' ? 'border-primary animate-pulse' : 'border-muted'
          }`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>

          {status === 'matched' && (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">মুখ যাচাই সফল হয়েছে ✓</span>
            </div>
          )}
          {status === 'failed' && remaining > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-2 text-destructive justify-center">
                <XCircle className="w-5 h-5" />
                <span>মুখ মিলেনি! আবার চেষ্টা করুন</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">আর {remaining} টি সুযোগ বাকি</p>
            </div>
          )}
          {status === 'failed' && remaining <= 0 && (
            <div className="text-center text-destructive">
              <XCircle className="w-6 h-6 mx-auto mb-1" />
              <p className="font-medium">সব সুযোগ শেষ!</p>
              <p className="text-sm text-muted-foreground">SMS OTP দিয়ে রিকভার করুন</p>
            </div>
          )}
          {status === 'no-face' && (
            <p className="text-sm text-yellow-600">মুখ দেখা যাচ্ছে না! ক্যামেরার দিকে তাকান</p>
          )}
          {status === 'scanning' && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>যাচাই করা হচ্ছে... ⏳</span>
            </div>
          )}

          {status !== 'matched' && remaining > 0 && (
            <Button onClick={handleScan} disabled={scanning} className="w-full py-5 rounded-xl">
              {scanning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              স্ক্যান শুরু করুন
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {!cameraActive && status !== 'matched' && (
        <Button onClick={handleStart} disabled={modelLoading} className="w-full py-5 rounded-xl">
          {modelLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Camera className="w-5 h-5 mr-2" />}
          ক্যামেরা চালু করুন
        </Button>
      )}

      {/* Tips */}
      <div className="bg-accent/50 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">💡 ভালো ফলাফলের জন্য:</p>
            <p>→ ভালো আলোতে স্ক্যান করুন</p>
            <p>→ সরাসরি ক্যামেরার দিকে তাকান</p>
            <p>→ চশমা খুলুন যদি পারেন</p>
            <p>→ মুখ ফ্রেমের মধ্যে রাখুন</p>
          </div>
        </div>
      </div>
    </div>
  );
}
