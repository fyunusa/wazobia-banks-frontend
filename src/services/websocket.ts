export interface WebSocketConfig {
  lang: string; // "auto", "en", "yo", "ha", "ig", "pcm"
  gender: "male" | "female";
}

export class WazobiaVoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  
  private url: string;
  private callbacks: {
    onTranscript?: (text: string, lang: string) => void;
    onAnswer?: (text: string) => void;
    onAudioBytes?: (bytes: ArrayBuffer) => void;
    onDone?: (metadata: any) => void;
    onError?: (error: string) => void;
    onStateChange?: (connected: boolean) => void;
  };
  
  constructor(
    url: string,
    callbacks: {
      onTranscript?: (text: string, lang: string) => void;
      onAnswer?: (text: string) => void;
      onAudioBytes?: (bytes: ArrayBuffer) => void;
      onDone?: (metadata: any) => void;
      onError?: (error: string) => void;
      onStateChange?: (connected: boolean) => void;
    }
  ) {
    this.url = url;
    this.callbacks = callbacks;
  }

  public connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.callbacks.onStateChange?.(true);
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            this.callbacks.onTranscript?.(data.text, data.lang);
          } else if (data.type === 'answer_text') {
            this.callbacks.onAnswer?.(data.text);
          } else if (data.type === 'done') {
            this.callbacks.onDone?.(data);
          } else if (data.type === 'error') {
            this.callbacks.onError?.(data.message);
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.callbacks.onAudioBytes?.(event.data);
      }
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.callbacks.onStateChange?.(false);
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error", err);
      this.callbacks.onError?.("WebSocket connection error");
    };
  }

  public sendConfig(config: WebSocketConfig) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'config',
        lang: config.lang,
        gender: config.gender
      }));
    }
  }

  public async startRecording(config: WebSocketConfig) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    // Send initial configuration
    this.sendConfig(config);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Browser forces sample rate downsampling automatically to 16000Hz
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // ScriptProcessorNode with buffer size 2048 (approx 128ms chunks)
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processorNode.onaudioprocess = (event) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const float32Data = event.inputBuffer.getChannelData(0);
        const pcmBuffer = this.floatTo16BitPCM(float32Data);
        
        this.ws.send(pcmBuffer);
      };

      this.mediaStreamSource.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

    } catch (err: any) {
      this.cleanup();
      throw new Error(`Microphone access failed: ${err.message}`);
    }
  }

  public stopRecording() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end' }));
    }
    this.cleanupRecording();
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // true for little endian
    }
    return buffer;
  }

  private cleanupRecording() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  private cleanup() {
    this.cleanupRecording();
  }
}
