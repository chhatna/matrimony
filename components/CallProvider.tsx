"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

// STUN gives us reflexive candidates. TURN is required to relay media
// when both peers are behind symmetric NAT (very common on mobile carriers
// and carrier-grade NAT). Without TURN, Android-on-mobile-data calling
// Web-on-WiFi gets stuck in ICE checking and falls into FAILED.
//
// Sign up for a free Metered.ca TURN account (50 GB/month) and set these
// three env vars in Render:
//   NEXT_PUBLIC_TURN_URLS         — comma-separated, e.g.
//                                   "turn:a.relay.metered.ca:80,turn:a.relay.metered.ca:443?transport=tcp"
//   NEXT_PUBLIC_TURN_USERNAME
//   NEXT_PUBLIC_TURN_CREDENTIAL
const ICE_SERVERS: RTCIceServer[] = (() => {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrls = process.env.NEXT_PUBLIC_TURN_URLS;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrls && turnUser && turnCred) {
    servers.push({
      urls: turnUrls.split(",").map((u) => u.trim()).filter(Boolean),
      username: turnUser,
      credential: turnCred,
    });
  }
  return servers;
})();

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "in-call";

type Peer = { id: string; name: string };

type CallContextValue = {
  state: CallState;
  peer: Peer | null;
  startCall: (peerId: string, peerName: string) => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    return {
      state: "idle",
      peer: null,
      startCall: () => {
        // eslint-disable-next-line no-console
        console.warn("useCall used outside CallProvider");
      },
    };
  }
  return ctx;
}

class Ringtone {
  private ctx: AudioContext | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private oscs: OscillatorNode[] = [];
  private gain: GainNode | null = null;

  start(): void {
    if (this.ctx) return;
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    this.loop();
  }

  stop(): void {
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.stopPulse();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) {
      ctx.close().catch(() => {
        // ignore
      });
    }
  }

  private stopPulse(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.gain) {
      try {
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(this.gain.gain.value, now);
        this.gain.gain.linearRampToValueAtTime(0, now + 0.05);
      } catch {
        // ignore
      }
    }
    const oscs = this.oscs;
    this.oscs = [];
    this.gain = null;
    setTimeout(() => {
      for (const o of oscs) {
        try {
          o.stop();
        } catch {
          // ignore
        }
        try {
          o.disconnect();
        } catch {
          // ignore
        }
      }
    }, 80);
  }

  private loop(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 440;
    o2.frequency.value = 480;
    o1.connect(gain);
    o2.connect(gain);
    gain.connect(ctx.destination);
    o1.start();
    o2.start();
    this.oscs = [o1, o2];
    this.gain = gain;

    // Ring 1.2s, silence 2.4s, repeat
    this.pulseTimer = setTimeout(() => {
      this.stopPulse();
      this.stopTimer = setTimeout(() => {
        if (this.ctx) this.loop();
      }, 2400);
    }, 1200);
  }
}

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CallState>("idle");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<CallState>("idle");
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const peerRef = useRef<Peer | null>(null);
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const ringtoneRef = useRef<Ringtone | null>(null);
  const prevTitleRef = useRef<string>("");

  const cleanup = useCallback(() => {
    try {
      pcRef.current?.close();
    } catch {
      // ignore
    }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    setStartedAt(null);
    setElapsed(0);
    setMuted(false);
  }, []);

  const stopRingtone = useCallback(() => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    const r = new Ringtone();
    ringtoneRef.current = r;
    r.start();
  }, [stopRingtone]);

  // Ring + title flash while "incoming"
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (state === "incoming" && peer) {
      startRingtone();
      prevTitleRef.current = document.title;
      let on = true;
      const id = setInterval(() => {
        document.title = on ? `\u{1F4DE} Incoming call from ${peer.name}` : "Incoming call...";
        on = !on;
      }, 1000);
      return () => {
        clearInterval(id);
        document.title = prevTitleRef.current || "Saathi";
        stopRingtone();
      };
    }
    stopRingtone();
    return undefined;
  }, [state, peer, startRingtone, stopRingtone]);

  // Elapsed timer during in-call
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [startedAt]);

  const endCallInternal = useCallback(
    (notify: boolean) => {
      const target = peerRef.current?.id;
      if (notify && socketRef.current && target) {
        socketRef.current.emit("call:end", { to: target });
      }
      cleanup();
      setPeer(null);
      setState("idle");
    },
    [cleanup]
  );

  const createPC = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      const target = peerRef.current?.id;
      if (e.candidate && socketRef.current && target) {
        socketRef.current.emit("call:ice", {
          to: target,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      const [remote] = e.streams;
      if (audioRef.current && remote) {
        audioRef.current.srcObject = remote;
        const p = audioRef.current.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setState("in-call");
        setStartedAt((prev) => prev ?? Date.now());
      } else if (s === "failed" || s === "closed") {
        endCallInternal(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [endCallInternal]);

  const startCall = useCallback(
    async (peerId: string, peerName: string) => {
      if (!socketRef.current) {
        setError("Not connected");
        return;
      }
      if (stateRef.current !== "idle") return;
      setError(null);
      setPeer({ id: peerId, name: peerName });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = createPC();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setState("outgoing");
        socketRef.current.emit(
          "call:invite",
          { to: peerId, offer: pc.localDescription },
          (ack: { ok?: boolean; error?: string } | undefined) => {
            if (!ack?.ok) {
              setError(ack?.error || "Could not start call");
              endCallInternal(false);
            }
          }
        );
      } catch (e) {
        setError((e as Error).message || "Microphone not available");
        cleanup();
        setPeer(null);
        setState("idle");
      }
    },
    [cleanup, createPC, endCallInternal]
  );

  const acceptIncoming = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const target = peerRef.current?.id;
    if (!offer || !socketRef.current || !target) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(offer);
      for (const c of pendingIceRef.current) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          // ignore
        }
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setState("connecting");
      socketRef.current.emit("call:accept", {
        to: target,
        answer: pc.localDescription,
      });
    } catch (e) {
      setError((e as Error).message || "Microphone not available");
      // Treat failure as decline
      if (socketRef.current && target) {
        socketRef.current.emit("call:decline", { to: target });
      }
      cleanup();
      setPeer(null);
      setState("idle");
    }
  }, [cleanup, createPC]);

  const declineIncoming = useCallback(() => {
    const target = peerRef.current?.id;
    if (socketRef.current && target) {
      socketRef.current.emit("call:decline", { to: target });
    }
    cleanup();
    setPeer(null);
    setState("idle");
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  // Connect socket once per mount
  useEffect(() => {
    const s: Socket = io("/", { path: "/api/socket", withCredentials: true });
    socketRef.current = s;

    async function onInvite({
      from,
      fromName,
      offer,
    }: {
      from: string;
      fromName?: string;
      offer: RTCSessionDescriptionInit;
    }) {
      if (stateRef.current !== "idle") {
        s.emit("call:end", { to: from });
        return;
      }
      pendingOfferRef.current = offer;
      setPeer({ id: from, name: fromName || "Unknown" });
      setState("incoming");
    }

    async function onAccept({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) {
      if (peerRef.current?.id !== from) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(answer);
        setState((prev) => (prev === "outgoing" ? "connecting" : prev));
        for (const c of pendingIceRef.current) {
          try {
            await pc.addIceCandidate(c);
          } catch {
            // ignore
          }
        }
        pendingIceRef.current = [];
      } catch (e) {
        setError((e as Error).message);
        endCallInternal(true);
      }
    }

    function onDecline({ from }: { from: string }) {
      if (peerRef.current?.id !== from) return;
      setError("Call declined");
      cleanup();
      setPeer(null);
      setState("idle");
    }

    function onEnd({ from }: { from: string }) {
      if (peerRef.current?.id !== from) return;
      cleanup();
      setPeer(null);
      setState("idle");
    }

    async function onIce({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) {
      if (peerRef.current?.id !== from) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    }

    s.on("call:invite", onInvite);
    s.on("call:accept", onAccept);
    s.on("call:decline", onDecline);
    s.on("call:end", onEnd);
    s.on("call:ice", onIce);

    return () => {
      s.off("call:invite", onInvite);
      s.off("call:accept", onAccept);
      s.off("call:decline", onDecline);
      s.off("call:end", onEnd);
      s.off("call:ice", onIce);
      s.close();
      socketRef.current = null;
      cleanup();
    };
  }, [cleanup, endCallInternal]);

  const inOverlay =
    state === "outgoing" ||
    state === "incoming" ||
    state === "connecting" ||
    state === "in-call";

  const ctxValue: CallContextValue = { state, peer, startCall };

  return (
    <CallContext.Provider value={ctxValue}>
      {children}

      <audio ref={audioRef} autoPlay playsInline />

      {inOverlay && peer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 text-brand-600 grid place-items-center text-3xl font-bold">
              {peer.name[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div className="text-lg font-semibold">{peer.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {state === "outgoing" && "Calling..."}
                {state === "incoming" && "Incoming voice call"}
                {state === "connecting" && "Connecting..."}
                {state === "in-call" && formatElapsed(elapsed)}
              </div>
            </div>

            {state === "outgoing" && (
              <div className="flex justify-center">
                <button
                  onClick={() => endCallInternal(true)}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" /> Cancel
                </button>
              </div>
            )}

            {state === "incoming" && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={declineIncoming}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" /> Decline
                </button>
                <button
                  onClick={acceptIncoming}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Accept
                </button>
              </div>
            )}

            {(state === "connecting" || state === "in-call") && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={toggleMute}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 inline-flex items-center gap-2"
                >
                  {muted ? (
                    <>
                      <MicOff className="w-4 h-4" /> Unmute
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" /> Mute
                    </>
                  )}
                </button>
                <button
                  onClick={() => endCallInternal(true)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" /> End
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && state === "idle" && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setError(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setError(null);
          }}
          className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer z-50"
        >
          {error}
        </div>
      )}
    </CallContext.Provider>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
