"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "in-call";

type InvitePayload = { from: string; offer: RTCSessionDescriptionInit };
type AcceptPayload = { from: string; answer: RTCSessionDescriptionInit };
type FromOnlyPayload = { from: string };
type IcePayload = { from: string; candidate: RTCIceCandidateInit };

export default function VoiceCall({
  socket,
  peerId,
  peerName,
}: {
  socket: Socket | null;
  peerId: string;
  peerName: string;
}) {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const stateRef = useRef<CallState>("idle");
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  function cleanup() {
    try {
      pcRef.current?.close();
    } catch {
      // ignore
    }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    setStartedAt(null);
    setElapsed(0);
    setMuted(false);
  }

  function endCall(notify: boolean) {
    if (notify && socket) socket.emit("call:end", { to: peerId });
    cleanup();
    setState("idle");
  }

  function createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("call:ice", { to: peerId, candidate: e.candidate.toJSON() });
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
        endCall(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    if (!socket) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setState("outgoing");
      socket.emit(
        "call:invite",
        { to: peerId, offer: pc.localDescription },
        (ack: { ok?: boolean; error?: string } | undefined) => {
          if (!ack?.ok) {
            setError(ack?.error || "Could not start call");
            endCall(false);
          }
        }
      );
    } catch (e) {
      setError((e as Error).message || "Microphone not available");
      setState("idle");
      cleanup();
    }
  }

  async function acceptIncoming() {
    const offer = pendingOfferRef.current;
    if (!offer || !socket) return;
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
          // ignore bad candidates
        }
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setState("connecting");
      socket.emit("call:accept", { to: peerId, answer: pc.localDescription });
    } catch (e) {
      setError((e as Error).message || "Microphone not available");
      declineIncoming();
    }
  }

  function declineIncoming() {
    if (socket) socket.emit("call:decline", { to: peerId });
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    cleanup();
    setState("idle");
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  useEffect(() => {
    if (!socket) return;

    function onInvite({ from, offer }: InvitePayload) {
      if (from !== peerId) return;
      if (stateRef.current !== "idle") {
        socket!.emit("call:end", { to: from });
        return;
      }
      pendingOfferRef.current = offer;
      setState("incoming");
    }

    async function onAccept({ from, answer }: AcceptPayload) {
      if (from !== peerId) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(answer);
        setState((s) => (s === "outgoing" ? "connecting" : s));
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
        endCall(true);
      }
    }

    function onDecline({ from }: FromOnlyPayload) {
      if (from !== peerId) return;
      setError("Call declined");
      cleanup();
      setState("idle");
    }

    function onEnd({ from }: FromOnlyPayload) {
      if (from !== peerId) return;
      cleanup();
      setState("idle");
    }

    async function onIce({ from, candidate }: IcePayload) {
      if (from !== peerId) return;
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

    socket.on("call:invite", onInvite);
    socket.on("call:accept", onAccept);
    socket.on("call:decline", onDecline);
    socket.on("call:end", onEnd);
    socket.on("call:ice", onIce);

    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:accept", onAccept);
      socket.off("call:decline", onDecline);
      socket.off("call:end", onEnd);
      socket.off("call:ice", onIce);
    };
  }, [socket, peerId]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    return () => {
      if (pcRef.current && socket) {
        socket.emit("call:end", { to: peerId });
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inOverlay = state === "outgoing" || state === "incoming" || state === "connecting" || state === "in-call";

  return (
    <>
      <button
        onClick={startCall}
        disabled={!socket || state !== "idle"}
        title="Voice call"
        aria-label="Voice call"
        className="p-2 rounded-full hover:bg-gray-100 text-brand-600 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      >
        <Phone className="w-5 h-5" />
      </button>

      <audio ref={audioRef} autoPlay playsInline />

      {inOverlay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 text-brand-600 grid place-items-center text-3xl font-bold">
              {peerName[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div className="text-lg font-semibold">{peerName}</div>
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
                  onClick={() => endCall(true)}
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
                  onClick={() => endCall(true)}
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
    </>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
