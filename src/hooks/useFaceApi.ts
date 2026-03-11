import { useState, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model';

export function useFaceApi() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadModels = useCallback(async () => {
    if (modelsLoaded || modelLoading) return;
    setModelLoading(true);
    try {
      setLoadProgress(10);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setLoadProgress(40);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadProgress(70);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setLoadProgress(100);
      setModelsLoaded(true);
    } catch (e) {
      console.error('Failed to load face models:', e);
      throw e;
    } finally {
      setModelLoading(false);
    }
  }, [modelsLoaded, modelLoading]);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const detectFace = useCallback(async (video: HTMLVideoElement) => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection || null;
  }, []);

  const getDescriptorArray = (descriptor: Float32Array): number[] => {
    return Array.from(descriptor);
  };

  const compareDescriptors = (stored: number[], live: Float32Array): number => {
    const storedArr = new Float32Array(stored);
    return faceapi.euclideanDistance(storedArr, live);
  };

  return {
    modelsLoaded,
    modelLoading,
    loadProgress,
    loadModels,
    startCamera,
    stopCamera,
    detectFace,
    getDescriptorArray,
    compareDescriptors,
    videoRef,
  };
}
