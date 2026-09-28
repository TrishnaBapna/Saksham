import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, ShieldAlert, CheckCircle2, KeyRound, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import {
  startCameraStream,
  stopCameraStream,
  initializeFaceMesh,
  calculateEAR,
  calculateHeadYaw,
  extractGeometricDescriptor,
  extractCanvasFaceDescriptor,
  compareDescriptors
} from '../services/faceRecognition';
import { findUserByEmail, getFaceProfile } from '../firebase/db';

export default function FaceLoginModal({ initialEmail = '', onLoginSuccess, onUsePasskey, onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [stage, setStage] = useState('lookup'); // 'lookup' -> 'scanning' -> 'matched' -> 'failed'
  const [statusText, setStatusText] = useState('Enter account email to load face profile');
  const [errorMsg, setErrorMsg] = useState('');
  const [matchScore, setMatchScore] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [enrolledFaceData, setEnrolledFaceData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasMatchedRef = useRef(false);

  useEffect(() => {
    if (initialEmail) {
      handleLookupAndStart(initialEmail);
    }
    return () => {
      stopCameraStream(streamRef.current, videoRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [initialEmail]);

  // Lookup user by email to retrieve enrolled protected representation
  async function handleLookupAndStart(targetEmail) {
    const cleanEmail = (targetEmail || email).trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your account email.');
      return;
    }

    setErrorMsg('');
    setStatusText('Checking face profile registration…');

    try {
      const user = await findUserByEmail(cleanEmail);
      if (!user) {
        setErrorMsg('No registered account found with this email.');
        return;
      }

      const faceProfile = await getFaceProfile(user.id);
      if (!faceProfile || !faceProfile.protectedEmbedding) {
        setErrorMsg('No face recognition profile enrolled for this account. Please use Passkey or Password.');
        return;
      }

      setUserProfile(user);
      setEnrolledFaceData(faceProfile.protectedEmbedding);
      setStage('scanning');
      startCameraAndScan(faceProfile.protectedEmbedding, user);
    } catch(err) {
      console.error('[Face Lookup Error]:', err);
      setErrorMsg(err.message || 'Error looking up biometric profile.');
    }
  }

  // Start Camera & Comparison Loop
  async function startCameraAndScan(protectedEmbedding, user) {
    setStatusText('Starting local camera…');
    try {
      const stream = await startCameraStream(videoRef.current);
      streamRef.current = stream;
      setStatusText('Position face in oval & blink naturally to verify…');

      const mesh = await initializeFaceMesh((results) => {
        handleMeshResults(results, protectedEmbedding, user);
      });
      faceMeshRef.current = mesh;

      function loop() {
        if (!hasMatchedRef.current && videoRef.current && videoRef.current.readyState >= 2) {
          if (faceMeshRef.current && window.FaceMesh) {
            faceMeshRef.current.send({ image: videoRef.current }).catch(() => {});
          } else {
            handleCanvasFallback(protectedEmbedding, user);
          }
        }
        if (!hasMatchedRef.current) {
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    } catch(err) {
      console.error('[Face Login Camera Error]:', err);
      setErrorMsg(err.message || 'Could not access camera.');
    }
  }

  function handleMeshResults(results, protectedEmbedding, user) {
    if (hasMatchedRef.current) return;

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setStatusText('Detecting face geometry… Position face within the oval');
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const liveVector = extractGeometricDescriptor(landmarks);
    if (!liveVector) return;

    // Compare live vector with enrolled protected embedding
    const comparison = compareDescriptors(liveVector, protectedEmbedding);
    setMatchScore(comparison.similarity);

    if (comparison.matched) {
      hasMatchedRef.current = true;
      setStage('matched');
      setStatusText(`Face Verified (${comparison.similarity}% Match)! Welcome back, ${user.name}.`);
      stopCameraStream(streamRef.current, videoRef.current);

      setTimeout(() => {
        onLoginSuccess(user);
      }, 1200);
    } else {
      setStatusText(`Align face closer (${comparison.similarity}% match, threshold: ${comparison.threshold}%)`);
    }
  }

  function handleCanvasFallback(protectedEmbedding, user) {
    if (hasMatchedRef.current || !videoRef.current || !canvasRef.current) return;
    const liveVector = extractCanvasFaceDescriptor(videoRef.current, canvasRef.current);
    if (!liveVector) return;

    const comparison = compareDescriptors(liveVector, protectedEmbedding);
    setMatchScore(comparison.similarity);

    if (comparison.matched) {
      hasMatchedRef.current = true;
      setStage('matched');
      setStatusText(`Face Verified (${comparison.similarity}% Match)! Welcome, ${user.name}.`);
      stopCameraStream(streamRef.current, videoRef.current);

      setTimeout(() => {
        onLoginSuccess(user);
      }, 1200);
    }
  }

  function handleScanFailure() {
    stopCameraStream(streamRef.current, videoRef.current);
    setStage('failed');
    setErrorMsg('Face did not match the enrolled profile. Please use Passkey or Password.');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white font-heading">Recognize My Face</h3>
              <p className="text-[10px] text-slate-400">Client-Side Biometric Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step A: Email lookup */}
        {stage === 'lookup' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-300">
                Enter your account email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={() => handleLookupAndStart(email)}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Face Recognition</span>
            </button>
          </div>
        )}

        {/* Step B: Live Scanning & Liveness Check */}
        {(stage === 'scanning' || stage === 'matched') && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-teal-500/50 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Oval guide */}
              <div className="absolute w-40 h-52 border-2 border-dashed border-teal-400/80 rounded-[50%] pointer-events-none animate-pulse"></div>

              {stage === 'matched' && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                  <span className="font-extrabold text-sm">Identity Verified!</span>
                </div>
              )}
            </div>

            {/* Status box */}
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center space-y-1">
              <p className="text-xs font-bold text-teal-300 flex items-center justify-center gap-1.5">
                {stage === 'scanning' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{statusText}</span>
              </p>
              {matchScore !== null && (
                <p className="text-[10px] text-slate-400">
                  Live Confidence: {matchScore}% (Required: 82%)
                </p>
              )}
            </div>

            {/* Fallback button */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream(streamRef.current, videoRef.current);
                  onUsePasskey();
                }}
                className="text-emerald-400 hover:underline font-bold flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Use Passkey Instead</span>
              </button>
              <button
                type="button"
                onClick={handleScanFailure}
                className="text-slate-400 hover:text-white"
              >
                Trouble scanning?
              </button>
            </div>
          </div>
        )}

        {/* Step C: Failed */}
        {stage === 'failed' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Face Verification Rejected</h4>
              <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={onUsePasskey}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>🔐 Login with Passkey</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
              >
                Use Password
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
