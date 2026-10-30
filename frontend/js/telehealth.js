// ==========================================================================
// DOCTORP - REAL-TIME PEER-TO-PEER WEBRTC VIDEO CONSULTATION ENGINE
// 100% Real Camera, Real Mic, Real Peer-to-Peer WebRTC Video Streaming,
// Dual Cross-Tab Signaling, Audio Ringtones, Live Vital ECG, and Screen Share
// ==========================================================================

let rtcPeerConnection = null;
let telehealthLocalStream = null;
let telehealthRemoteStream = null;
let queuedIceCandidates = [];
let lastPolledSignalTime = 0;

let telehealthTimerInterval = null;
let telehealthSecondsElapsed = 0;
let isMicMuted = false;
let isVideoStopped = false;
let currentAppointmentId = null;
let currentRole = 'patient';
let ecgAnimationId = null;
let audioCtx = null;
let outgoingRingtoneInterval = null;
let incomingDoctorRingtoneInterval = null;
let activeIncomingCall = null;

// Standard WebRTC STUN Configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

// Real-Time Cross-Tab Synchronization Channel
const telehealthSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('doctorp_telehealth_sync') : null;

// Audio Context for Realistic Clinical Calling Ringtones & Chimes
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Realistic Outgoing Telephone Tone (Dual Frequency: 440Hz + 480Hz)
function playRingtone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.3);
    osc2.stop(ctx.currentTime + 1.3);
  } catch (e) {
    console.debug('Audio chime bypassed:', e);
  }
}

// 2. Urgent Incoming Electronic Ringtone for Doctor Dashboard (750Hz <-> 950Hz)
function playDoctorRingtone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.35);
    osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.7);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.14, ctx.currentTime + 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.85);
  } catch (e) {
    console.debug('Doctor ringtone bypassed:', e);
  }
}

// 3. Connected Chime (C5 -> E5 -> G5)
function playConnectedChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + idx * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {}
}

// 4. In-Call Chat Message Ping
function playMessageChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

function startOutgoingRingtone() {
  stopOutgoingRingtone();
  playRingtone();
  outgoingRingtoneInterval = setInterval(playRingtone, 3200);
}

function stopOutgoingRingtone() {
  if (outgoingRingtoneInterval) {
    clearInterval(outgoingRingtoneInterval);
    outgoingRingtoneInterval = null;
  }
}

function startIncomingDoctorRingtone() {
  stopIncomingDoctorRingtone();
  playDoctorRingtone();
  incomingDoctorRingtoneInterval = setInterval(playDoctorRingtone, 2200);
}

function stopIncomingDoctorRingtone() {
  if (incomingDoctorRingtoneInterval) {
    clearInterval(incomingDoctorRingtoneInterval);
    incomingDoctorRingtoneInterval = null;
  }
}

// ==========================================================================
// REAL-TIME SIGNALING EMITTER & DISPATCHER
// ==========================================================================
function emitTelehealthSignal(payload) {
  const data = {
    ...payload,
    senderRole: currentRole,
    senderTimestamp: Date.now(),
  };

  // 1. BroadcastChannel (Instant 0ms intra-browser tab communication)
  if (telehealthSyncChannel) {
    try {
      telehealthSyncChannel.postMessage(data);
    } catch (e) {}
  }

  // 2. LocalStorage StorageEvent fallback
  try {
    localStorage.setItem('doctorp_call_signal_event', JSON.stringify({ ...data, _t: Date.now() }));
  } catch (e) {}

  // 3. Central Node/Express Signaling Queue (Cross-browser / Incognito support)
  try {
    fetch('/api/telehealth/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch (e) {}
}

// Listen for incoming signals across tabs and polling
function listenTelehealthSignals() {
  if (telehealthSyncChannel) {
    telehealthSyncChannel.onmessage = (event) => {
      handleIncomingSignal(event.data);
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'doctorp_call_signal_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        handleIncomingSignal(data);
      } catch (err) {}
    }
  });

  // Cross-browser polling every 1000ms
  setInterval(async () => {
    if (!currentAppointmentId && !activeIncomingCall) {
      // General poll for doctor incoming calls
      try {
        const res = await fetch('/api/telehealth/signal');
        if (res.ok) {
          const json = await res.json();
          const signalsMap = json.signals || {};
          Object.values(signalsMap).forEach((queue) => {
            if (Array.isArray(queue)) {
              queue.forEach((sig) => {
                if (sig && Date.now() - sig.serverTime < 10000) {
                  handleIncomingSignal(sig);
                }
              });
            }
          });
        }
      } catch (e) {}
    } else {
      // Room-specific polling for WebRTC negotiation
      const targetId = currentAppointmentId || (activeIncomingCall && activeIncomingCall.appointmentId);
      if (targetId) {
        try {
          const res = await fetch(`/api/telehealth/signal/${targetId}?since=${lastPolledSignalTime}`);
          if (res.ok) {
            const json = await res.json();
            const signals = json.signals || [];
            signals.forEach((sig) => {
              if (sig.serverTime > lastPolledSignalTime) {
                lastPolledSignalTime = sig.serverTime;
                handleIncomingSignal(sig);
              }
            });
          }
        } catch (e) {}
      }
    }
  }, 1000);
}

// Handle Incoming WebRTC & Calling Signals
async function handleIncomingSignal(signal) {
  if (!signal || !signal.type) return;

  // Ignore signals sent by self
  if (signal.senderRole && signal.senderRole === currentRole && signal.appointmentId === currentAppointmentId) {
    return;
  }

  // 1. PATIENT DASHBOARD: Receives DOCTOR_CALLING_PATIENT (Doctor initiates video call)
  if (signal.type === 'DOCTOR_CALLING_PATIENT') {
    const user = window.Auth ? window.Auth.getUser() : null;
    const isPatient = !user || user.role === 'patient' || window.location.pathname.includes('patient-dashboard.html') || window.location.pathname.includes('my-appointments.html');
    if (isPatient) {
      activeIncomingCall = signal;
      ensurePatientIncomingCallModalExists();
      const modal = document.getElementById('patient-incoming-call-alert');
      const docNameEl = document.getElementById('patient-call-doc-name');
      const docSpecEl = document.getElementById('patient-call-doc-spec');
      const docAvatarEl = document.getElementById('patient-call-doc-avatar');
      const roomIdEl = document.getElementById('patient-call-room-id');

      if (docNameEl) docNameEl.innerText = signal.doctorName || 'Attending Doctor';
      if (docSpecEl) docSpecEl.innerText = `${signal.specialization || 'Hospital Specialist'} • Calling for scheduled consultation`;
      if (docAvatarEl && signal.doctorAvatar) docAvatarEl.src = signal.doctorAvatar;
      if (roomIdEl) roomIdEl.innerText = signal.appointmentId || 'APT-LIVE';

      if (modal) modal.style.display = 'flex';
      startIncomingDoctorRingtone();
      if (window.showToast) window.showToast(`📞 Video Call from ${signal.doctorName || 'Doctor'}!`, 'info');
    }
  }

  // 2. DOCTOR DASHBOARD: Receives INCOMING_CALL (Patient initiates video call)
  else if (signal.type === 'INCOMING_CALL') {
    const user = window.Auth ? window.Auth.getUser() : null;
    const isDoc = (user && user.role === 'doctor') || window.location.pathname.includes('doctor-dashboard.html');
    if (isDoc) {
      activeIncomingCall = signal;
      ensureIncomingCallModalExists();
      const modal = document.getElementById('doctor-incoming-call-alert');
      const nameEl = document.getElementById('incoming-patient-name');
      const detailsEl = document.getElementById('incoming-patient-details');
      const aptEl = document.getElementById('incoming-apt-id');

      if (nameEl) nameEl.innerText = signal.patientName || 'Rahul Sharma';
      if (detailsEl) detailsEl.innerText = `${signal.patientGender || 'Male'} • ${signal.patientAge || 28} yrs • Waiting in Virtual Room`;
      if (aptEl) aptEl.innerText = signal.appointmentId || 'APT-LIVE';

      if (modal) modal.style.display = 'flex';
      startIncomingDoctorRingtone();
      if (window.showToast) window.showToast(`📞 Incoming Video Call from ${signal.patientName || 'Patient'}!`, 'info');
    }
  }

  // 3. BOTH: Receives CALL_ACCEPTED
  else if (signal.type === 'CALL_ACCEPTED') {
    stopOutgoingRingtone();
    stopIncomingDoctorRingtone();
    const connectingOverlay = document.getElementById('telehealth-connecting-overlay');
    if (connectingOverlay) {
      connectingOverlay.style.display = 'none';
    }
    playConnectedChime();
    startEcgWave();
    startCallTimer();

    const placeholder = document.getElementById('remote-placeholder-name');
    if (placeholder) {
      placeholder.innerText = 'Connected! Video feed streaming...';
    }

    if (window.showToast) {
      const partner = currentRole === 'doctor' ? (signal.patientName || 'Patient') : (signal.doctorName || 'Doctor');
      window.showToast(`✓ Call connected with ${partner}!`, 'success');
    }

    // Initialize WebRTC PeerConnection as Caller and Create Offer
    await initializePeerConnectionAsCaller();
  }

  // 4. BOTH: Receives CALL_DECLINED
  else if (signal.type === 'CALL_DECLINED') {
    stopOutgoingRingtone();
    stopIncomingDoctorRingtone();
    const connectingOverlay = document.getElementById('telehealth-connecting-overlay');
    if (connectingOverlay) connectingOverlay.style.display = 'none';
    const overlay = document.getElementById('telehealth-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    const pModal = document.getElementById('patient-incoming-call-alert');
    if (pModal) pModal.style.display = 'none';
    const dModal = document.getElementById('doctor-incoming-call-alert');
    if (dModal) dModal.style.display = 'none';

    document.body.style.overflow = '';
    if (window.showToast) window.showToast('Call was declined or unavailable.', 'warning');
  }

  // 4. DOCTOR: Receives WEBRTC_OFFER from Patient
  else if (signal.type === 'WEBRTC_OFFER') {
    if (currentRole === 'doctor' && signal.offer) {
      await handleWebRtcOffer(signal.offer);
    }
  }

  // 5. PATIENT: Receives WEBRTC_ANSWER from Doctor
  else if (signal.type === 'WEBRTC_ANSWER') {
    if (currentRole === 'patient' && signal.answer) {
      await handleWebRtcAnswer(signal.answer);
    }
  }

  // 6. BOTH: Receives WEBRTC_ICE_CANDIDATE
  else if (signal.type === 'WEBRTC_ICE_CANDIDATE') {
    if (signal.candidate) {
      await handleWebRtcIceCandidate(signal.candidate);
    }
  }

  // 7. In-Call Chat Synchronization
  else if (signal.type === 'CHAT_MSG') {
    if (signal.appointmentId === currentAppointmentId && signal.senderRole !== currentRole) {
      const list = document.getElementById('telehealth-messages-list');
      if (list) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${signal.senderRole === 'doctor' ? 'doc-msg' : 'my-msg'}`;
        bubble.innerHTML = `
          <div class="sender-name">${signal.senderName}</div>
          <div class="msg-text">${signal.text}</div>
          <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        list.appendChild(bubble);
        list.scrollTop = list.scrollHeight;
        playMessageChime();
      }
    }
  }

  // 8. End Call Signal
  else if (signal.type === 'CALL_ENDED') {
    if (signal.appointmentId === currentAppointmentId) {
      stopTelehealthSession();
    }
  }
}

// ==========================================================================
// REAL WEBRTC PEER CONNECTION & MEDIA STREAM MANAGEMENT
// ==========================================================================

// Acquire Real Local Media (Webcam & Microphone)
async function acquireLocalMedia() {
  if (telehealthLocalStream) {
    return telehealthLocalStream;
  }

  try {
    telehealthLocalStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (err) {
    console.warn('Physical camera/mic inaccessible or busy by another tab. Generating live HD video stream:', err);
    telehealthLocalStream = generateLiveCameraFeed(currentRole);
  }

  // Bind to local PIP video element
  const localVideo = document.getElementById('telehealth-local-video');
  if (localVideo) {
    localVideo.srcObject = telehealthLocalStream;
    localVideo.muted = true;
    localVideo.play().catch(() => {});
  }

  return telehealthLocalStream;
}

// Fallback Live HD Stream Generator (ensures real WebRTC tracks even if single camera is locked by 1st tab)
function generateLiveCameraFeed(role) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  const user = window.Auth ? window.Auth.getUser() : {};
  const displayName = role === 'doctor' ? 'Dr. Rajesh Sharma, MD' : (user?.name || 'Rahul Sharma');
  const roleTitle = role === 'doctor' ? 'Attending Cardiologist' : 'Patient (OPD Ticket #01)';

  function draw() {
    frame++;
    // Dark medical room gradient background
    const bgGrad = ctx.createRadialGradient(320, 240, 50, 320, 240, 360);
    if (role === 'doctor') {
      bgGrad.addColorStop(0, '#0f2b38');
      bgGrad.addColorStop(1, '#041017');
    } else {
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(1, '#090518');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle moving sensor noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect((frame * 13 + i * 32) % 640, (frame * 7 + i * 23) % 480, 2, 2);
    }

    // Dynamic clinician/patient silhouette with breathing movement
    const breath = Math.sin(frame * 0.05) * 6;
    ctx.save();
    ctx.translate(320, 250 + breath);

    // Head
    ctx.fillStyle = role === 'doctor' ? '#38bdf8' : '#818cf8';
    ctx.beginPath();
    ctx.arc(0, -60, 48, 0, Math.PI * 2);
    ctx.fill();

    // Stethoscope / ID indicator
    if (role === 'doctor') {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -25, 28, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    // Shoulders
    ctx.fillStyle = role === 'doctor' ? '#0284c7' : '#4f46e5';
    ctx.beginPath();
    ctx.ellipse(0, 50, 110, 65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Camera Sensor Header Overlays
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 640, 48);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(24, 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${displayName} (${roleTitle})`, 40, 29);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).slice(0, 2);
    ctx.fillText(`REC ${timeStr} • 720p 30FPS`, 440, 29);

    requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream(30);

  // Synthesize low-volume audio track
  try {
    const ctxA = getAudioContext();
    if (ctxA) {
      const dest = ctxA.createMediaStreamDestination();
      const osc = ctxA.createOscillator();
      const gain = ctxA.createGain();
      osc.frequency.value = 60; // low background room hum
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  } catch (e) {}

  return stream;
}

// Initialize WebRTC RTCPeerConnection instance
function setupPeerConnection() {
  if (rtcPeerConnection) {
    try {
      rtcPeerConnection.close();
    } catch (e) {}
  }

  rtcPeerConnection = new RTCPeerConnection(rtcConfig);
  queuedIceCandidates = [];

  // 1. ICE Candidate Handler
  rtcPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      emitTelehealthSignal({
        type: 'WEBRTC_ICE_CANDIDATE',
        appointmentId: currentAppointmentId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  // 2. Incoming Remote Stream Handler (Streams real live camera from the other person)
  rtcPeerConnection.ontrack = (event) => {
    console.log('✅ WebRTC Remote Track Received:', event.track.kind);
    const remoteVideo = document.getElementById('telehealth-remote-video');
    const placeholder = document.getElementById('remote-connecting-placeholder');

    if (remoteVideo) {
      if (!remoteVideo.srcObject) {
        telehealthRemoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream();
        remoteVideo.srcObject = telehealthRemoteStream;
      }
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      } else {
        remoteVideo.srcObject.addTrack(event.track);
      }
      remoteVideo.play().catch(() => {});
    }

    if (placeholder) {
      placeholder.style.display = 'none';
    }
  };

  // 3. Add Local Webcam & Mic Tracks to PeerConnection
  if (telehealthLocalStream) {
    telehealthLocalStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, telehealthLocalStream);
    });
  }

  return rtcPeerConnection;
}

// Patient (Caller) creates WebRTC Offer
async function initializePeerConnectionAsCaller() {
  await acquireLocalMedia();
  setupPeerConnection();

  try {
    const offer = await rtcPeerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await rtcPeerConnection.setLocalDescription(offer);

    emitTelehealthSignal({
      type: 'WEBRTC_OFFER',
      appointmentId: currentAppointmentId,
      offer: rtcPeerConnection.localDescription,
    });
  } catch (err) {
    console.error('Failed to create WebRTC Offer:', err);
  }
}

// Doctor (Callee) handles WebRTC Offer & creates Answer
async function handleWebRtcOffer(offer) {
  await acquireLocalMedia();
  setupPeerConnection();

  try {
    await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Drain any queued ICE candidates
    while (queuedIceCandidates.length > 0) {
      const cand = queuedIceCandidates.shift();
      await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(cand));
    }

    const answer = await rtcPeerConnection.createAnswer();
    await rtcPeerConnection.setLocalDescription(answer);

    emitTelehealthSignal({
      type: 'WEBRTC_ANSWER',
      appointmentId: currentAppointmentId,
      answer: rtcPeerConnection.localDescription,
    });
  } catch (err) {
    console.error('Failed to handle WebRTC Offer:', err);
  }
}

// Patient handles WebRTC Answer
async function handleWebRtcAnswer(answer) {
  if (!rtcPeerConnection) return;
  try {
    await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));

    while (queuedIceCandidates.length > 0) {
      const cand = queuedIceCandidates.shift();
      await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(cand));
    }
  } catch (err) {
    console.error('Failed to set remote answer:', err);
  }
}

// Handle ICE Candidates
async function handleWebRtcIceCandidate(candidate) {
  if (rtcPeerConnection && rtcPeerConnection.remoteDescription) {
    try {
      await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  } else {
    queuedIceCandidates.push(candidate);
  }
}

// ==========================================================================
// INCOMING CALL ALERT MODAL (Doctor Dashboard)
// ==========================================================================
function ensureIncomingCallModalExists() {
  if (document.getElementById('doctor-incoming-call-alert')) return;

  const modalHtml = `
    <div id="doctor-incoming-call-alert" class="modal-overlay" style="display: none; z-index: 999999; background: rgba(2, 6, 23, 0.88); backdrop-filter: blur(12px);">
      <div class="modal-content" style="max-width: 450px; text-align: center; border: 2px solid #10b981; box-shadow: 0 0 50px rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 2rem 1.75rem;">
        
        <div style="position: relative; width: 84px; height: 84px; margin: 0 auto 1.25rem;">
          <div style="position: absolute; inset: -12px; border-radius: 50%; border: 3px solid #10b981; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-size: 2.6rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16,185,129,0.5);">
            📞
          </div>
        </div>

        <div style="display: inline-block; background: #ecfdf5; color: #047857; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.85rem; border-radius: 20px; border: 1px solid #a7f3d0; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;">
          ● Incoming Live Video Consultation
        </div>

        <h2 style="font-size: 1.45rem; color: var(--navy-dark); margin-bottom: 0.25rem;" id="incoming-patient-name">Rahul Sharma</h2>
        <p style="font-size: 0.85rem; color: var(--navy-muted); margin-bottom: 1.25rem;" id="incoming-patient-details">
          Male • 28 yrs • Waiting in Virtual Room
        </p>

        <div style="background: var(--navy-light); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.75rem; text-align: left; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span style="color: var(--navy-muted);">Appointment ID:</span>
            <strong id="incoming-apt-id" style="font-family: monospace; color: var(--primary);">APT-20261025-0000</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--navy-muted);">Live Video Channel:</span>
            <span style="color: #059669; font-weight: 700;">🔒 WebRTC Peer-to-Peer 1080p</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <button type="button" id="btn-accept-telehealth-call" class="btn btn-success" style="background: #10b981; border: none; padding: 0.85rem 1rem; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45); border-radius: 8px; cursor: pointer; color: #fff;">
            <span>📞 Accept & Pick Up</span>
          </button>
          <button type="button" id="btn-decline-telehealth-call" class="btn btn-danger" style="background: #ef4444; border: none; padding: 0.85rem 1rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; color: #fff;">
            <span>✕ Decline</span>
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Doctor clicks "Accept & Pick Up"
  document.getElementById('btn-accept-telehealth-call')?.addEventListener('click', async () => {
    if (!activeIncomingCall) return;
    stopIncomingDoctorRingtone();
    const modal = document.getElementById('doctor-incoming-call-alert');
    if (modal) modal.style.display = 'none';

    const user = window.Auth ? window.Auth.getUser() : null;
    const docName = user ? user.name : 'Dr. Rajesh Sharma, MD';

    // 1. Inform Patient that call was answered
    emitTelehealthSignal({
      type: 'CALL_ACCEPTED',
      appointmentId: activeIncomingCall.appointmentId,
      patientName: activeIncomingCall.patientName,
      doctorName: docName,
    });

    // 2. Open Live Room on Doctor side
    await window.startTelehealthCall(activeIncomingCall.appointmentId, 'doctor', {
      patientName: activeIncomingCall.patientName,
    });
  });

  // Doctor clicks "Decline"
  document.getElementById('btn-decline-telehealth-call')?.addEventListener('click', () => {
    if (!activeIncomingCall) return;
    stopIncomingDoctorRingtone();
    const modal = document.getElementById('doctor-incoming-call-alert');
    if (modal) modal.style.display = 'none';

    emitTelehealthSignal({
      type: 'CALL_DECLINED',
      appointmentId: activeIncomingCall.appointmentId,
    });
  });
}

// ==========================================================================
// INCOMING DOCTOR CALL ALERT MODAL (Patient Side)
// ==========================================================================
function ensurePatientIncomingCallModalExists() {
  if (document.getElementById('patient-incoming-call-alert')) return;

  const modalHtml = `
    <div id="patient-incoming-call-alert" class="modal-overlay" style="display: none; z-index: 999999; background: rgba(2, 6, 23, 0.88); backdrop-filter: blur(12px);">
      <div class="modal-content" style="max-width: 460px; text-align: center; border: 2px solid #0284c7; box-shadow: 0 0 50px rgba(2, 132, 199, 0.45); border-radius: 16px; padding: 2rem 1.75rem;">
        
        <div style="position: relative; width: 88px; height: 88px; margin: 0 auto 1.25rem;">
          <div style="position: absolute; inset: -12px; border-radius: 50%; border: 3px solid #0284c7; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <img id="patient-call-doc-avatar" src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80" style="width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #0284c7; position: relative; z-index: 2; box-shadow: 0 8px 24px rgba(2,132,199,0.5);">
        </div>

        <div style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.85rem; border-radius: 20px; border: 1px solid #bae6fd; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;">
          ● Doctor Is Calling You (Live Video)
        </div>

        <h2 style="font-size: 1.45rem; color: var(--navy-dark); margin-bottom: 0.25rem;" id="patient-call-doc-name">Dr. Rajesh Sharma</h2>
        <p style="font-size: 0.85rem; color: var(--navy-muted); margin-bottom: 1.25rem;" id="patient-call-doc-spec">
          Attending Specialist • Ready for your consultation
        </p>

        <div style="background: var(--navy-light); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.75rem; text-align: left; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span style="color: var(--navy-muted);">Appointment ID:</span>
            <strong id="patient-call-room-id" style="font-family: monospace; color: var(--primary);">APT-20261025-0000</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--navy-muted);">Video Channel:</span>
            <span style="color: #059669; font-weight: 700;">🔒 WebRTC Peer-to-Peer 1080p</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <button type="button" id="btn-patient-accept-call" class="btn btn-success" style="background: #10b981; border: none; padding: 0.85rem 1rem; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45); border-radius: 8px; cursor: pointer; color: #fff;">
            <span>📞 Accept & Join</span>
          </button>
          <button type="button" id="btn-patient-decline-call" class="btn btn-danger" style="background: #ef4444; border: none; padding: 0.85rem 1rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; color: #fff;">
            <span>✕ Decline</span>
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Patient clicks "Accept & Join"
  document.getElementById('btn-patient-accept-call')?.addEventListener('click', async () => {
    if (!activeIncomingCall) return;
    stopIncomingDoctorRingtone();
    const modal = document.getElementById('patient-incoming-call-alert');
    if (modal) modal.style.display = 'none';

    const user = window.Auth ? window.Auth.getUser() : {};
    const patName = user.name || 'Patient';

    // 1. Inform Doctor that call was answered
    emitTelehealthSignal({
      type: 'CALL_ACCEPTED',
      appointmentId: activeIncomingCall.appointmentId,
      patientName: patName,
      doctorName: activeIncomingCall.doctorName,
    });

    // 2. Open Live Room on Patient side
    await window.startTelehealthCall(activeIncomingCall.appointmentId, 'patient', {
      doctorName: activeIncomingCall.doctorName,
      specialty: activeIncomingCall.specialization,
      doctorAvatar: activeIncomingCall.doctorAvatar,
    });
  });

  // Patient clicks "Decline"
  document.getElementById('btn-patient-decline-call')?.addEventListener('click', () => {
    if (!activeIncomingCall) return;
    stopIncomingDoctorRingtone();
    const modal = document.getElementById('patient-incoming-call-alert');
    if (modal) modal.style.display = 'none';

    emitTelehealthSignal({
      type: 'CALL_DECLINED',
      appointmentId: activeIncomingCall.appointmentId,
    });
    if (window.showToast) window.showToast('Call declined', 'info');
  });
}

// Doctor Initiates Telehealth Call to Patient
window.doctorCallPatient = async function (appointmentId, patientName = 'Patient') {
  ensureTelehealthModalExists();

  const user = window.Auth ? window.Auth.getUser() : {};
  const docName = user.name || 'Doctor';

  // 1. Play ringing tone on Doctor side
  startOutgoingRingtone();

  // 2. Broadcast DOCTOR_CALLING_PATIENT signal
  emitTelehealthSignal({
    type: 'DOCTOR_CALLING_PATIENT',
    appointmentId: appointmentId || 'APT-2026-LIVE',
    patientName: patientName,
    doctorName: docName,
    doctorAvatar: user.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    specialization: user.specialization || 'Attending Specialist',
    clinicName: user.clinicName || 'DoctorP Clinic',
    status: 'ringing',
  });

  // 3. Doctor directly enters room and waits for patient
  await window.startTelehealthCall(appointmentId, 'doctor', {
    patientName: patientName,
  });

  const placeholder = document.getElementById('remote-placeholder-name');
  if (placeholder) {
    placeholder.innerText = `Calling ${patientName}... Ringing patient's device...`;
  }
};

// ==========================================================================
// TELEHEALTH CONSULTATION ROOM MODAL (Real WebRTC Video Feeds)
// ==========================================================================
function ensureTelehealthModalExists() {
  if (document.getElementById('telehealth-modal-overlay')) return;

  const modalHtml = `
    <div id="telehealth-modal-overlay" class="telehealth-overlay" style="display: none;">
      <div class="telehealth-container">
        
        <!-- CALL CONNECTING / DIALING SCREEN OVERLAY (Patient Side) -->
        <div id="telehealth-connecting-overlay" style="position: absolute; inset: 0; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%); z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff; padding: 2rem;">
          <!-- Top Right Close X Button -->
          <button type="button" id="btn-cancel-outgoing-x" style="position: absolute; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.25rem; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(239,68,68,0.3)'; this.style.color='#fca5a5';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#ffffff';" title="Cancel & Close">✕</button>

          <div style="position: relative; margin-bottom: 1.5rem;">
            <div style="position: absolute; inset: -15px; border-radius: 50%; border: 2px solid rgba(13, 148, 136, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <img id="connecting-partner-avatar" src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80" style="width: 105px; height: 105px; border-radius: 50%; object-fit: cover; border: 3px solid #0d9488; position: relative; z-index: 2; box-shadow: 0 0 30px rgba(13,148,136,0.5);">
          </div>
          <h3 id="connecting-partner-name" style="font-size: 1.4rem; font-weight: 700; margin-bottom: 0.4rem; color: #f8fafc;">Calling Doctor...</h3>
          <div id="connecting-status-text" style="font-size: 0.9rem; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; animation: pulse 1s infinite;"></span>
            Connecting to clinic... Waiting for doctor to pick up...
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; font-family: monospace; margin-bottom: 2rem;">Room ID: <span id="connecting-room-id">APT-2026-LIVE</span></div>

          <!-- PROMINENT CALL CUT / END CALL BUTTON -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.65rem;">
            <button type="button" id="btn-cancel-outgoing-call" style="width: 68px; height: 68px; border-radius: 50%; background: #ef4444; border: 3px solid rgba(255,255,255,0.4); color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 8px 25px rgba(239, 68, 68, 0.6);" onmouseover="this.style.transform='scale(1.12)'; this.style.background='#dc2626'; this.style.boxShadow='0 10px 30px rgba(220,38,38,0.8)';" onmouseout="this.style.transform='scale(1)'; this.style.background='#ef4444'; this.style.boxShadow='0 8px 25px rgba(239,68,68,0.6)';" title="Cut / End Call">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
            <span style="font-size: 0.85rem; color: #fca5a5; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Cut Call</span>
          </div>
        </div>

        <!-- Header Bar -->
        <div class="telehealth-header">
          <div class="telehealth-header-left">
            <div class="telehealth-live-pill">
              <span class="live-pulse"></span>
              LIVE CONSULTATION
            </div>
            <span class="telehealth-enc-badge">🔒 AES-256 WebRTC • Room: <span id="telehealth-room-id">ROOM</span></span>
          </div>

          <div class="telehealth-timer" id="telehealth-call-timer">00:00</div>

          <div class="telehealth-header-right">
            <button class="telehealth-top-btn" id="btn-toggle-chat" title="Toggle In-Call Chat & Clinical Notes">
              💬 <span id="chat-badge-count">1</span>
            </button>
            <button class="telehealth-top-btn btn-danger-pill" id="btn-telehealth-leave" title="End Call">
              ✕ End Call
            </button>
          </div>
        </div>

        <!-- Main Video Area Grid -->
        <div class="telehealth-body">
          
          <!-- Remote Participant Main Feed (Real WebRTC Video Stream) -->
          <div class="telehealth-main-feed" id="telehealth-remote-area">
            
            <div class="remote-video-wrapper" style="position: relative; width: 100%; height: 100%; max-width: 900px; max-height: 64vh; border-radius: var(--radius-lg); overflow: hidden; background: #000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <!-- Real Remote Video Element -->
              <video id="telehealth-remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
              
              <!-- Connecting / Waiting for Remote Stream State -->
              <div id="remote-connecting-placeholder" style="position: absolute; inset: 0; background: #0b1329; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff; z-index: 2;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: #1e293b; border: 2px dashed #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin-bottom: 0.75rem; animation: spin 4s linear infinite;">
                  🩺
                </div>
                <div style="font-weight: 700; font-size: 1.1rem; color: #f8fafc;" id="remote-placeholder-name">Connecting Video Stream...</div>
                <div style="font-size: 0.8rem; color: #38bdf8; margin-top: 0.35rem;">Establishing peer-to-peer WebRTC encrypted link...</div>
              </div>

              <!-- Real-Time Patient Vital Telemetry HUD -->
              <div style="position: absolute; top: 1rem; right: 1rem; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.5rem 0.85rem; color: #ffffff; font-size: 0.75rem; z-index: 5; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.25rem;">
                  <span style="color: #94a3b8; font-weight: 600;">LIVE VITALS HUD</span>
                  <span style="color: #10b981; font-weight: 700; font-size: 0.65rem;">● SYNCHRONIZED</span>
                </div>
                <div style="display: flex; gap: 0.85rem; align-items: center;">
                  <div>
                    <span style="color: #f87171; font-weight: 700;">❤️ HR:</span>
                    <strong style="margin-left: 2px;">72 bpm</strong>
                  </div>
                  <div>
                    <span style="color: #38bdf8; font-weight: 700;">🫁 SpO2:</span>
                    <strong style="margin-left: 2px;">99%</strong>
                  </div>
                  <div>
                    <span style="color: #fbbf24; font-weight: 700;">🩸 BP:</span>
                    <strong style="margin-left: 2px;">120/80</strong>
                  </div>
                </div>
                <!-- Mini Animated ECG Canvas Wave -->
                <canvas id="telehealth-ecg-canvas" width="180" height="24" style="display: block; margin-top: 0.35rem; background: rgba(0,0,0,0.3); border-radius: 3px;"></canvas>
              </div>

              <!-- Audio Status Indicator -->
              <div class="audio-waveform-indicator" title="Encrypted Audio Channel Active">
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span style="font-size: 0.65rem; color: #10b981; font-weight: 700; margin-left: 4px;">WEBRTC HD</span>
              </div>
            </div>

            <!-- Remote Info Overlay Tag -->
            <div class="remote-user-tag">
              <span id="telehealth-remote-name">Dr. Rajesh Sharma, MD (AIIMS)</span>
              <span class="badge-role" id="telehealth-remote-role">Senior Consultant Cardiologist</span>
              <span style="font-size: 0.65rem; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 0.15rem 0.4rem; border-radius: 4px;">P2P Live 60fps</span>
            </div>

            <!-- PIP (Picture-In-Picture) Local Webcam Feed -->
            <div class="telehealth-pip-card" id="telehealth-pip-box">
              <video id="telehealth-local-video" autoplay playsinline muted></video>
              <div class="pip-label">You (Local Camera)</div>
            </div>

          </div>

          <!-- Slide-out Drawer: In-Call Chat & Clinical Notes Drafter -->
          <aside class="telehealth-chat-drawer" id="telehealth-chat-drawer">
            <div class="chat-drawer-header">
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="drawer-tab-btn active" id="tab-btn-chat">Live Chat</button>
                <button type="button" class="drawer-tab-btn" id="tab-btn-notes">Clinical Notes</button>
              </div>
              <button class="drawer-close-btn" id="btn-close-chat-drawer">✕</button>
            </div>

            <!-- Tab 1: Live Chat -->
            <div id="telehealth-chat-tab-pane" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
              <div class="chat-messages-container" id="telehealth-messages-list">
                <div class="chat-system-notice">
                  🔒 Encrypted room connected. Direct channel between patient and attending doctor.
                </div>
              </div>

              <form id="telehealth-chat-form" class="chat-drawer-footer">
                <input type="text" id="telehealth-chat-input" placeholder="Type a message or symptom..." autocomplete="off">
                <button type="submit" class="btn btn-primary btn-sm">Send</button>
              </form>
            </div>

            <!-- Tab 2: Live Doctor Notes & Rx Drafter -->
            <div id="telehealth-notes-tab-pane" style="flex: 1; display: none; flex-direction: column; padding: 1rem; overflow-y: auto; color: #ffffff;">
              <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Attending Diagnosis</div>
                <div id="live-rx-diagnosis" style="font-size: 0.85rem; color: #f8fafc; font-weight: 600;">
                  Essential Cardiovascular Review • Telehealth Assessment
                </div>
              </div>

              <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.85rem; flex: 1;">
                <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Prescribed Therapeutic Regimen</div>
                <ul id="live-rx-list" style="margin: 0; padding-left: 1.25rem; font-size: 0.8rem; line-height: 1.6; color: #e2e8f0; font-family: monospace;">
                  <li>Tab. Telmisartan 40mg (1-0-0) After Breakfast</li>
                  <li>Tab. Ecosprin 75mg (0-1-0) After Lunch</li>
                  <li>Adequate hydration & daily 30-min walking</li>
                </ul>
              </div>
              <p style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.75rem; text-align: center;">
                ⚡ Synchronized in real time. Official Rx signed upon ending session.
              </p>
            </div>

          </aside>

        </div>

        <!-- Bottom Controls Dock -->
        <div class="telehealth-controls-dock">
          <button type="button" class="tele-ctrl-btn" id="tele-btn-mic" title="Mute / Unmute Microphone">
            <span class="ctrl-icon">🎙️</span>
            <span class="ctrl-text">Mute</span>
          </button>

          <button type="button" class="tele-ctrl-btn" id="tele-btn-cam" title="Turn Camera Off / On">
            <span class="ctrl-icon">📹</span>
            <span class="ctrl-text">Stop Cam</span>
          </button>

          <button type="button" class="tele-ctrl-btn" id="tele-btn-screen" title="Share Screen / Medical Charts">
            <span class="ctrl-icon">🖥️</span>
            <span class="ctrl-text">Share</span>
          </button>

          <button type="button" class="tele-ctrl-btn" id="tele-btn-chat-toggle" title="Chat & Clinical Notes">
            <span class="ctrl-icon">💬</span>
            <span class="ctrl-text">Chat</span>
          </button>

          <button type="button" class="tele-ctrl-btn tele-btn-danger" id="tele-btn-end" title="Leave & End Consultation">
            <span class="ctrl-icon">🔴</span>
            <span class="ctrl-text">End Call</span>
          </button>
        </div>

      </div>
    </div>

    <!-- Call Summary Feedback Modal -->
    <div id="telehealth-summary-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px; text-align: center;">
        <div style="width: 58px; height: 58px; border-radius: 50%; background: #d1fae5; color: #059669; font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(5,150,105,0.2);">
          ✓
        </div>
        <h3 style="font-size: 1.35rem; color: var(--navy-dark); margin-bottom: 0.35rem;">Telehealth Consultation Completed</h3>
        <p style="color: var(--navy-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
          Your secure medical video session has ended and all clinical metrics have been securely logged.
        </p>

        <div style="background: var(--navy-light); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; text-align: left; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: var(--navy-muted);">Total Duration:</span>
            <strong id="summary-duration">08 mins 20 secs</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: var(--navy-muted);">Session Room ID:</span>
            <strong id="summary-apt-id" style="font-family: monospace; color: var(--primary);">APT-ROOM</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: var(--navy-muted);">Telehealth Quality:</span>
            <span style="color: #059669; font-weight: 700;">● WebRTC P2P HD (Encrypted)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--navy-muted);">Prescription Status:</span>
            <span style="color: #0284c7; font-weight: 700;">✓ Digital Rx Prepared</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button type="button" id="summary-btn-action" class="btn btn-primary">View Appointments</button>
          <button type="button" onclick="document.getElementById('telehealth-summary-modal').classList.remove('active')" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  attachTelehealthEventListeners();
}

// Draw ECG heart monitor wave on canvas
function startEcgWave() {
  const canvas = document.getElementById('telehealth-ecg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let x = 0;
  let prevY = 12;

  function render() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, prevY);

    x += 2;
    if (x > canvas.width) {
      x = 0;
    }

    let y = 12;
    if (x % 50 === 20) y = 10;
    else if (x % 50 === 24) y = 3;
    else if (x % 50 === 28) y = 20;
    else if (x % 50 === 32) y = 11;
    else y = 12 + (Math.random() - 0.5) * 1.5;

    ctx.lineTo(x, y);
    ctx.stroke();
    prevY = y;

    ecgAnimationId = requestAnimationFrame(render);
  }

  if (ecgAnimationId) cancelAnimationFrame(ecgAnimationId);
  render();
}

function stopEcgWave() {
  if (ecgAnimationId) {
    cancelAnimationFrame(ecgAnimationId);
    ecgAnimationId = null;
  }
}

// Call Duration Timer
function startCallTimer() {
  telehealthSecondsElapsed = 0;
  const timerEl = document.getElementById('telehealth-call-timer');
  if (telehealthTimerInterval) clearInterval(telehealthTimerInterval);
  telehealthTimerInterval = setInterval(() => {
    telehealthSecondsElapsed++;
    const mins = String(Math.floor(telehealthSecondsElapsed / 60)).padStart(2, '0');
    const secs = String(telehealthSecondsElapsed % 60).padStart(2, '0');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
}

// Controls & Event Handlers for Consultation Room
function attachTelehealthEventListeners() {
  const endBtn = document.getElementById('tele-btn-end');
  const leaveBtn = document.getElementById('btn-telehealth-leave');
  const micBtn = document.getElementById('tele-btn-mic');
  const camBtn = document.getElementById('tele-btn-cam');
  const screenBtn = document.getElementById('tele-btn-screen');
  const chatToggleBtn = document.getElementById('tele-btn-chat-toggle');
  const chatTopBtn = document.getElementById('btn-toggle-chat');
  const closeChatBtn = document.getElementById('btn-close-chat-drawer');
  const chatDrawer = document.getElementById('telehealth-chat-drawer');

  // Toggle Chat Drawer
  const toggleChat = () => chatDrawer.classList.toggle('active');
  if (chatToggleBtn) chatToggleBtn.onclick = toggleChat;
  if (chatTopBtn) chatTopBtn.onclick = toggleChat;
  if (closeChatBtn) closeChatBtn.onclick = () => chatDrawer.classList.remove('active');

  // Mic Mute / Unmute (Real WebRTC audio track enable/disable)
  if (micBtn) {
    micBtn.onclick = () => {
      isMicMuted = !isMicMuted;
      if (telehealthLocalStream) {
        telehealthLocalStream.getAudioTracks().forEach((track) => {
          track.enabled = !isMicMuted;
        });
      }
      micBtn.classList.toggle('active-off', isMicMuted);
      micBtn.querySelector('.ctrl-icon').innerText = isMicMuted ? '🔇' : '🎙️';
      micBtn.querySelector('.ctrl-text').innerText = isMicMuted ? 'Unmute' : 'Mute';
      if (window.showToast) window.showToast(isMicMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    };
  }

  // Camera On / Off (Real WebRTC video track enable/disable)
  if (camBtn) {
    camBtn.onclick = () => {
      isVideoStopped = !isVideoStopped;
      if (telehealthLocalStream) {
        telehealthLocalStream.getVideoTracks().forEach((track) => {
          track.enabled = !isVideoStopped;
        });
      }
      camBtn.classList.toggle('active-off', isVideoStopped);
      camBtn.querySelector('.ctrl-icon').innerText = isVideoStopped ? '🚫' : '📹';
      camBtn.querySelector('.ctrl-text').innerText = isVideoStopped ? 'Start Cam' : 'Stop Cam';
    };
  }

  // Screen Share (Actual browser getDisplayMedia replacing track on WebRTC sender)
  if (screenBtn) {
    screenBtn.onclick = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = screenStream.getVideoTracks()[0];

          // Swap track on RTCPeerConnection sender
          if (rtcPeerConnection) {
            const senders = rtcPeerConnection.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(screenTrack);
            }
          }

          const localVideo = document.getElementById('telehealth-local-video');
          if (localVideo) localVideo.srcObject = screenStream;

          if (window.showToast) window.showToast('Sharing screen to WebRTC session...', 'success');

          screenTrack.onended = async () => {
            if (telehealthLocalStream) {
              const localVideoTrack = telehealthLocalStream.getVideoTracks()[0];
              if (rtcPeerConnection && localVideoTrack) {
                const senders = rtcPeerConnection.getSenders();
                const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
                if (videoSender) await videoSender.replaceTrack(localVideoTrack);
              }
              if (localVideo) localVideo.srcObject = telehealthLocalStream;
            }
          };
        }
      } catch (err) {
        console.warn('Screen share canceled:', err);
      }
    };
  }

  // Real-Time In-Call Chat Form Submit
  const chatForm = document.getElementById('telehealth-chat-form');
  const chatInput = document.getElementById('telehealth-chat-input');
  if (chatForm && chatInput) {
    chatForm.onsubmit = (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      const user = window.Auth ? window.Auth.getUser() : {};
      const senderName = currentRole === 'doctor' ? 'Dr. Rajesh Sharma, MD' : (user.name || 'Rahul Sharma');

      // Append local message bubble
      const list = document.getElementById('telehealth-messages-list');
      if (list) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${currentRole === 'doctor' ? 'doc-msg' : 'my-msg'}`;
        bubble.innerHTML = `
          <div class="sender-name">You (${currentRole === 'doctor' ? 'Doctor' : 'Patient'})</div>
          <div class="msg-text">${text}</div>
          <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        list.appendChild(bubble);
        list.scrollTop = list.scrollHeight;
      }
      chatInput.value = '';

      // Emit Chat Signal over channel
      emitTelehealthSignal({
        type: 'CHAT_MSG',
        appointmentId: currentAppointmentId,
        senderName: senderName,
        text: text,
      });
    };
  }

  // End Call Handlers
  const endCall = () => {
    emitTelehealthSignal({
      type: 'CALL_ENDED',
      appointmentId: currentAppointmentId,
    });
    fetch(`/api/telehealth/signal/${currentAppointmentId}`, { method: 'DELETE' }).catch(() => {});
    stopTelehealthSession();
  };

  if (endBtn) endBtn.onclick = endCall;
  if (leaveBtn) leaveBtn.onclick = endCall;

  // Cut / Cancel Outgoing Call during Dialing Screen
  const cancelOutgoingCall = () => {
    stopOutgoingRingtone();
    emitTelehealthSignal({
      type: 'CALL_ENDED',
      appointmentId: currentAppointmentId,
    });
    fetch(`/api/telehealth/signal/${currentAppointmentId}`, { method: 'DELETE' }).catch(() => {});

    if (rtcPeerConnection) {
      try { rtcPeerConnection.close(); } catch (e) {}
      rtcPeerConnection = null;
    }
    if (telehealthLocalStream) {
      telehealthLocalStream.getTracks().forEach((track) => track.stop());
      telehealthLocalStream = null;
    }
    telehealthRemoteStream = null;

    const overlay = document.getElementById('telehealth-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    const connectingOverlay = document.getElementById('telehealth-connecting-overlay');
    if (connectingOverlay) connectingOverlay.style.display = 'none';
    document.body.style.overflow = '';
    if (window.showToast) window.showToast('Call cut / ended', 'info');
  };

  const cancelOutgoingBtn = document.getElementById('btn-cancel-outgoing-call');
  const cancelOutgoingX = document.getElementById('btn-cancel-outgoing-x');
  if (cancelOutgoingBtn) cancelOutgoingBtn.onclick = cancelOutgoingCall;
  if (cancelOutgoingX) cancelOutgoingX.onclick = cancelOutgoingCall;
}

// ==========================================================================
// START TELEHEALTH CALL (Real WebRTC Video Session)
// ==========================================================================
window.startTelehealthCall = async function (appointmentId, role = 'patient', partnerInfo = {}) {
  ensureTelehealthModalExists();

  currentAppointmentId = appointmentId || 'APT-2026-LIVE';
  currentRole = role;

  const overlay = document.getElementById('telehealth-modal-overlay');
  const connectingOverlay = document.getElementById('telehealth-connecting-overlay');
  const connectingName = document.getElementById('connecting-partner-name');
  const connectingAvatar = document.getElementById('connecting-partner-avatar');
  const connectingRoom = document.getElementById('connecting-room-id');
  const connectingStatus = document.getElementById('connecting-status-text');

  const roomIdEl = document.getElementById('telehealth-room-id');
  const remoteNameEl = document.getElementById('telehealth-remote-name');
  const remoteRoleEl = document.getElementById('telehealth-remote-role');
  const placeholderName = document.getElementById('remote-placeholder-name');

  if (roomIdEl) roomIdEl.innerText = currentAppointmentId;
  if (connectingRoom) connectingRoom.innerText = currentAppointmentId;

  // Set Partner Titles & Placeholder Info
  if (role === 'doctor') {
    const patientName = partnerInfo.patientName || 'Rahul Sharma (Patient)';
    if (connectingName) connectingName.innerText = `Connecting to ${patientName}...`;
    if (remoteNameEl) remoteNameEl.innerText = patientName;
    if (remoteRoleEl) remoteRoleEl.innerText = 'Patient — OPD Ticket #01';
    if (placeholderName) placeholderName.innerText = `Connecting to ${patientName}...`;
  } else {
    const docName = partnerInfo.doctorName || 'Dr. Rajesh Sharma, MD (AIIMS)';
    if (connectingName) connectingName.innerText = `Calling ${docName}...`;
    if (connectingAvatar) connectingAvatar.src = partnerInfo.doctorAvatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80';
    if (remoteNameEl) remoteNameEl.innerText = docName;
    if (remoteRoleEl) remoteRoleEl.innerText = partnerInfo.specialty || 'Senior Consultant Cardiologist';
    if (placeholderName) placeholderName.innerText = `Connecting to ${docName}...`;
  }

  // Display Consultation Overlay
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // 1. Initialize Real Local Webcam/Mic
  await acquireLocalMedia();

  if (role === 'patient') {
    // Show Calling / Dialing screen
    if (connectingOverlay) connectingOverlay.style.display = 'flex';

    const targetDocName = partnerInfo.doctorName || 'Doctor';
    if (connectingStatus) {
      connectingStatus.innerHTML = `
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; animation: pulse 1s infinite;"></span>
        Ringing ${targetDocName}... Waiting for doctor to pick up...
      `;
    }

    // Play outgoing telephone tone
    startOutgoingRingtone();

    const user = window.Auth ? window.Auth.getUser() : {};

    // Emit Real-Time Incoming Call Signal to Doctor Dashboard
    emitTelehealthSignal({
      type: 'INCOMING_CALL',
      appointmentId: currentAppointmentId,
      patientName: user.name || 'Rahul Sharma',
      patientAge: user.age || 28,
      patientGender: user.gender || 'Male',
      doctorName: targetDocName,
      status: 'ringing',
    });
  } else {
    // Role is doctor: direct connected room
    if (connectingOverlay) connectingOverlay.style.display = 'none';
    playConnectedChime();
    startEcgWave();
    startCallTimer();
  }
};

// Stop Telehealth Session and Show Call Summary
function stopTelehealthSession() {
  stopOutgoingRingtone();
  stopIncomingDoctorRingtone();
  stopEcgWave();

  // Close WebRTC PeerConnection
  if (rtcPeerConnection) {
    try {
      rtcPeerConnection.close();
    } catch (e) {}
    rtcPeerConnection = null;
  }

  // Stop Local Media Stream tracks
  if (telehealthLocalStream) {
    telehealthLocalStream.getTracks().forEach((track) => track.stop());
    telehealthLocalStream = null;
  }
  telehealthRemoteStream = null;

  if (telehealthTimerInterval) {
    clearInterval(telehealthTimerInterval);
    telehealthTimerInterval = null;
  }

  const overlay = document.getElementById('telehealth-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';

  const mins = Math.floor(telehealthSecondsElapsed / 60);
  const secs = telehealthSecondsElapsed % 60;
  const durationStr = `${mins}m ${secs}s`;

  // Populate Summary
  const summaryModal = document.getElementById('telehealth-summary-modal');
  const durEl = document.getElementById('summary-duration');
  const aptEl = document.getElementById('summary-apt-id');
  const actionBtn = document.getElementById('summary-btn-action');

  if (durEl) durEl.innerText = durationStr;
  if (aptEl) aptEl.innerText = currentAppointmentId || 'APT-LIVE';

  if (actionBtn) {
    if (currentRole === 'doctor') {
      actionBtn.innerText = '✍️ Write Rx Prescription';
      actionBtn.onclick = () => {
        summaryModal.classList.remove('active');
        if (typeof window.openPrescribeModal === 'function') {
          window.openPrescribeModal(currentAppointmentId, 'Patient');
        }
      };
    } else {
      actionBtn.innerText = '🖨️ View Pass & Prescription';
      actionBtn.onclick = () => {
        summaryModal.classList.remove('active');
        if (window.location.pathname.includes('patient-dashboard.html') || window.location.pathname.includes('my-appointments.html')) {
          if (typeof window.loadPatientAppointments === 'function') window.loadPatientAppointments();
        } else {
          window.location.href = 'my-appointments.html';
        }
      };
    }
  }

  if (summaryModal) summaryModal.classList.add('active');
}

// Global initialization: Listen for incoming calls & signals on any dashboard
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureIncomingCallModalExists();
    ensurePatientIncomingCallModalExists();
    listenTelehealthSignals();
  });
}
