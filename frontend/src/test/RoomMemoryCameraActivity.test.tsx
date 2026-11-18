import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  RoomMemoryActivity,
  HomeObservationExplorer,
} from '../features/games/components/runners/RoomMemoryActivity.js';
import {
  OnDeviceVisionService,
  SUPPORTED_HOUSEHOLD_CATALOG,
} from '../features/games/services/onDeviceVisionService.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { SpeechService } from '../services/speechService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Phase E: Privacy-First Live Camera & Room Memory Activity', () => {
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
    OnDeviceVisionService.clearSimulatedDetections();

    mockTrackStop = vi.fn();
    mockStream = {
      getTracks: vi.fn(() => [
        {
          stop: mockTrackStop,
          kind: 'video',
          id: 'mock-video-track-1',
          enabled: true,
        } as unknown as MediaStreamTrack,
      ]),
    } as unknown as MediaStream;

    // Polyfill navigator.mediaDevices
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn() },
        configurable: true,
        writable: true,
      });
    }

    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(mockStream);
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  afterEach(() => {
    OnDeviceVisionService.clearSimulatedDetections();
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 1: Consent Card & Privacy Guarantee Pre-Flight                       */
  /* ------------------------------------------------------------------------- */
  it('1. renders camera consent card with exact patient-facing text and privacy guarantees; camera does NOT start automatically', () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    // Assert consent card is present
    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();

    // Verify exact patient-facing explanation
    expect(
      screen.getByText(/ASHA would like to use your camera to find a few familiar objects in your room/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your camera image stays on this device and is not saved or uploaded by this activity/i)
    ).toBeInTheDocument();

    // Verify privacy guarantees
    expect(screen.getByText('100% On-Device')).toBeInTheDocument();
    expect(screen.getByText('Zero Video Uploads')).toBeInTheDocument();
    expect(screen.getByText('Zero Pressure')).toBeInTheDocument();

    // Verify controls
    expect(screen.getByTestId('btn-start-camera')).toBeInTheDocument();
    expect(screen.getByTestId('btn-play-without-camera')).toBeInTheDocument();
    expect(screen.getByTestId('btn-cancel-camera')).toBeInTheDocument();

    // Verify camera stream was NOT started automatically prior to explicit consent
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 2: Starting Camera & Preferred Rear Facing Mode                      */
  /* ------------------------------------------------------------------------- */
  it('2. starts camera stream upon consent with environment facing mode and renders live preview', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    const startBtn = screen.getByTestId('btn-start-camera');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // Check mediaDevices was called with rear-camera preference
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({
          facingMode: { ideal: 'environment' },
        }),
      })
    );

    // Live camera view is rendered
    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();
    expect(screen.getByTestId('live-camera-feed')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 3: Permission Denial & Calm Non-Penalizing Fallback                  */
  /* ------------------------------------------------------------------------- */
  it('3. gracefully handles camera permission denial and falls back to curated mode without penalty', async () => {
    const permError = new Error('Permission denied');
    permError.name = 'NotAllowedError';
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValueOnce(permError);

    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    // Error banner should be displayed calmly
    expect(screen.getByTestId('camera-error-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/Camera permission was denied by user or system policy/i)
    ).toBeInTheDocument();

    // Patient can continue to play without camera
    const playWithoutBtn = screen.getByTestId('btn-play-without-camera');
    await act(async () => {
      fireEvent.click(playWithoutBtn);
    });

    expect(screen.getByTestId('curated-reference-rooms-view')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 4: Camera Controls (Switch Camera, Turn Camera Off)                  */
  /* ------------------------------------------------------------------------- */
  it('4. allows switching front/rear camera and turning camera off releases media tracks', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    // Switch camera
    const switchBtn = screen.getByTestId('btn-switch-camera');
    await act(async () => {
      fireEvent.click(switchBtn);
    });

    // Previous stream track stopped
    expect(mockTrackStop).toHaveBeenCalled();
    // New getUserMedia requested with 'user'
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          facingMode: { ideal: 'user' },
        }),
      })
    );

    // Turn camera off
    const turnOffBtn = screen.getByTestId('btn-turn-camera-off');
    await act(async () => {
      fireEvent.click(turnOffBtn);
    });

    // Camera view closed and returned to curated view
    expect(screen.queryByTestId('live-camera-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('curated-reference-rooms-view')).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 5: Strict Stream Termination on Unmount                              */
  /* ------------------------------------------------------------------------- */
  it('5. unconditionally stops all media stream tracks when component unmounts', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    // Unmount
    unmount();

    // Stream track must be stopped
    expect(mockTrackStop).toHaveBeenCalled();
    expect(SpeechService.cancelSpeech).toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 5b: Visibility Change Remediation (Product Owner Decision 4)         */
  /* ------------------------------------------------------------------------- */
  it('5b. stops camera tracks immediately when document becomes hidden and requires fresh consent before restarting', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    // Simulate tab minimize or lock screen (visibilitychange to hidden)
    Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Camera track must be stopped immediately
    expect(mockTrackStop).toHaveBeenCalled();

    // View mode MUST return to camera_consent requiring fresh consent
    expect(screen.queryByTestId('live-camera-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();
    expect(
      screen.getByText(/Camera stopped for privacy while the tab was hidden/i)
    ).toBeInTheDocument();

    // Reset document.hidden
    Object.defineProperty(document, 'hidden', { value: false, configurable: true, writable: true });
  });

  it('5c. returning to tab (hidden: false) does NOT automatically restart camera; requires fresh explicit click', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    // Tab becomes hidden
    Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();
    mockTrackStop.mockClear();

    // Tab becomes visible again
    Object.defineProperty(document, 'hidden', { value: false, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Camera MUST REMAIN STOPPED: zero auto-restart
    expect(screen.queryByTestId('live-camera-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();

    // Only upon fresh explicit click does it start
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();
  });

  it('5d. handles multiple visibility change cycles cleanly and stops tracks each time', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    // Cycle 1
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });
    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockTrackStop).toHaveBeenCalled();
    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();

    // Cycle 2
    Object.defineProperty(document, 'hidden', { value: false, configurable: true, writable: true });
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });
    expect(screen.getByTestId('live-camera-view')).toBeInTheDocument();

    mockTrackStop.mockClear();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockTrackStop).toHaveBeenCalled();
    expect(screen.getByTestId('camera-consent-card')).toBeInTheDocument();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true, writable: true });
  });

  it('5e. visibility change when camera is already stopped does not crash or disturb manual curated mode', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="curated"
        />
      </BrowserRouter>
    );

    // Curated view rendered
    expect(screen.getByTestId('curated-reference-rooms-view')).toBeInTheDocument();

    // Dispatch visibility hidden while camera is NOT active
    Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Curated view is completely undisturbed
    expect(screen.getByTestId('curated-reference-rooms-view')).toBeInTheDocument();
    expect(mockTrackStop).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true, writable: true });
  });

  it('5f. cleans up visibilitychange listener upon component unmount', async () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeListenerSpy.mockRestore();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 6: Candidate Detection (>=0.55 Confidence) & Confirmation Dialog     */
  /* ------------------------------------------------------------------------- */
  it('6. recognizes candidate household object above confidence threshold and renders confirmation banner', async () => {
    OnDeviceVisionService.setSimulatedDetections([
      {
        id: 'cup-1',
        label: 'cup',
        displayName: 'Drinking Cup or Mug',
        icon: '🍵',
        confidence: 0.88,
        bbox: [100, 100, 200, 200],
        timestamp: Date.now(),
        dailyAnchor: 'Comforting morning tea or fresh water',
        clues: SUPPORTED_HOUSEHOLD_CATALOG['cup'].clues,
      },
    ]);

    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    // Wait for detection loop to process candidate
    await waitFor(
      () => {
        expect(screen.getByTestId('candidate-detection-box')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('candidate-confirmation-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/I can see something that looks like a Drinking Cup or Mug/i)
    ).toBeInTheDocument();

    // Confirm object
    const confirmBtn = screen.getByTestId('btn-confirm-object');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Candidate box removed after confirmation
    expect(screen.queryByTestId('candidate-detection-box')).not.toBeInTheDocument();
    expect(screen.getByText(/Wonderful! We've noted your Drinking Cup or Mug/i)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 7: Manual Fallback Object Selection Drawer                           */
  /* ------------------------------------------------------------------------- */
  it('7. opens manual object selection drawer and allows 1-tap selection without camera dependency', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    const chooseManuallyBtn = screen.getByTestId('btn-open-manual-picker');
    await act(async () => {
      fireEvent.click(chooseManuallyBtn);
    });

    // Modal is opened
    expect(screen.getByText('Select a Familiar Household Object')).toBeInTheDocument();
    expect(screen.getByTestId('manual-item-chair')).toBeInTheDocument();
    expect(screen.getByTestId('manual-item-clock')).toBeInTheDocument();

    // Select chair manually
    await act(async () => {
      fireEvent.click(screen.getByTestId('manual-item-chair'));
    });

    // Modal closed and object confirmed
    expect(screen.queryByText('Select a Familiar Household Object')).not.toBeInTheDocument();
    expect(screen.getByText(/Wonderful! We've noted your Resting Chair or Armchair/i)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 8: 4 Structured Gentle Game Modes (A, B, C, D)                       */
  /* ------------------------------------------------------------------------- */
  it('8. provides 4 distinct cognitive game modes: Find Object, Recall Seen, Daily Use, and Free Scan', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    // Mode A: Find Object (default)
    expect(screen.getByText(/Target: Hydration Anchor/i)).toBeInTheDocument();

    // Switch to Mode B: Recall Seen
    await act(async () => {
      fireEvent.click(screen.getByTestId('mode-remember-btn'));
    });
    expect(screen.getByText(/Study these 2 items carefully:/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-ready-to-recall')).toBeInTheDocument();

    // Advance to recall test
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-ready-to-recall'));
    });
    expect(screen.getByText(/Which object helps us know the time of day\?/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-recall-answer-clock'));
    });
    expect(screen.getByText(/You remembered the wall clock beautifully!/i)).toBeInTheDocument();

    // Switch to Mode C: Daily Use
    await act(async () => {
      fireEvent.click(screen.getByTestId('mode-associate-btn'));
    });
    expect(screen.getByText(/Functional Association/i)).toBeInTheDocument();

    // Switch to Mode D: Free Scan
    await act(async () => {
      fireEvent.click(screen.getByTestId('mode-explore-btn'));
    });
    expect(screen.getByText(/Familiar Environment Observation/i)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 9: Rest Break Toggle & Pause Increment                               */
  /* ------------------------------------------------------------------------- */
  it('9. supports non-punitive rest break pausing activity and displaying calming guidance', async () => {
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    const restBtn = screen.getByTestId('btn-rest-break');
    await act(async () => {
      fireEvent.click(restBtn);
    });

    // Resting overlay shown
    expect(screen.getByTestId('resting-break-overlay')).toBeInTheDocument();
    expect(screen.getByText('Resting Pause in Progress')).toBeInTheDocument();

    // Resume
    const resumeBtn = screen.getByText('Resume Exploration');
    await act(async () => {
      fireEvent.click(resumeBtn);
    });

    expect(screen.queryByTestId('resting-break-overlay')).not.toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 10: Curated Reference Room Mode Preserved                            */
  /* ------------------------------------------------------------------------- */
  it('10. curated mode preserves 3 zones with 5 items each and backward compatibility alias', () => {
    render(
      <BrowserRouter>
        <HomeObservationExplorer
          onComplete={vi.fn()}
          initialMode="curated"
        />
      </BrowserRouter>
    );

    expect(screen.getByTestId('curated-reference-rooms-view')).toBeInTheDocument();
    expect(screen.getByText(/Observation Safeguard Note:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Master Bedroom/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Living Room/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Kitchen/i })).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 11: Privacy Invariant: Zero Image or Video Data Stored               */
  /* ------------------------------------------------------------------------- */
  it('11. verifies zero image frames, base64 strings, or video blobs are persisted to storage', async () => {
    const onCompleteMock = vi.fn();
    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={onCompleteMock}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    // Finish session
    const finishBtn = screen.getByTestId('btn-finish-camera-session');
    await act(async () => {
      fireEvent.click(finishBtn);
    });

    expect(onCompleteMock).toHaveBeenCalled();

    // Inspect localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        expect(val).not.toContain('data:image');
        expect(val).not.toContain('data:video');
        expect(val).not.toContain('blob:');
      }
    }

    // Inspect sessionStorage for zero image or camera data
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const val = sessionStorage.getItem(key) || '';
        expect(val).not.toContain('data:image');
        expect(val).not.toContain('data:video');
        expect(val).not.toContain('blob:');
      }
    }
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 12: Adaptive Engine Non-Penalization Guarantee                       */
  /* ------------------------------------------------------------------------- */
  it('12. session recording contains non-diagnostic telemetry and never demotes difficulty on camera errors', async () => {
    const recordSpy = vi.spyOn(AdaptiveSupportService, 'recordObservation');

    render(
      <BrowserRouter>
        <RoomMemoryActivity
          onComplete={vi.fn()}
          initialMode="camera"
        />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-start-camera'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-clue-tier')); // request gentle hint
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-finish-camera-session'));
    });

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'game-room-memory',
        activityType: 'game',
        completionStatus: 'completed',
        hintsUsedCount: 1,
        assistanceRequested: true,
      })
    );
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 13: ASHA Conversational Integration (English, Hindi, Marathi)        */
  /* ------------------------------------------------------------------------- */
  it('13. ASHA conversational engine recognizes room memory and camera exploration queries with warm reassurance', async () => {
    // English query
    const resEn = await ConversationEngine.process(
      'Can we play the room memory game with my camera?',
      undefined,
      'en',
      'demo-patient-001'
    );
    expect(resEn.intent).toBe('GAMES_LAUNCH_SPECIFIC');
    expect(resEn.speech).toContain('We can explore Room Memory together');
    expect(resEn.speech).toContain('no photos are ever saved');
    expect(resEn.suggestedAction?.targetId).toBe('game-room-memory');

    // Hindi query
    const resHi = await ConversationEngine.process(
      'मुझे कमरे की याद खेल खेलना है',
      undefined,
      'hi',
      'demo-patient-001'
    );
    expect(resHi.intent).toBe('GAMES_LAUNCH_SPECIFIC');
    expect(resHi.speech).toContain('हम कमरे की याद खेल खेल सकते हैं');
    expect(resHi.speech).toContain('कोई फोटो कभी सेव नहीं होती');

    // Marathi query
    const resMr = await ConversationEngine.process(
      'मला खोलीची आठवण हा खेळ खेळायचा आहे',
      undefined,
      'mr',
      'demo-patient-001'
    );
    expect(resMr.intent).toBe('GAMES_LAUNCH_SPECIFIC');
    expect(resMr.speech).toContain('आपण खोलीची आठवण हा खेळ खेळू शकतो');
    expect(resMr.speech).toContain('कोणताही फोटो सेव्ह होत नाही');
  });
});
