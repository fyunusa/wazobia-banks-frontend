import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, ArrowLeft, Play, Square, Loader, BookOpen, BarChart2, ShieldAlert } from 'lucide-react';
import { submitQuery, fetchSuggestedQuestions, streamVoiceQuery, fetchInstitutionStats } from '../services/api';
import type { QueryResponse, InstitutionStats } from '../services/api';
import { WazobiaVoiceClient } from '../services/websocket';
import { AudioWaveform } from './AudioWaveform';
import type { BankData } from './BankCarousel3D';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  lang?: string;
  audioUrl?: string;
  audioBlobUrl?: string;
  sources?: any[];
  isLoading?: boolean;
}

interface ChatPanelProps {
  bank: BankData;
  onClose: () => void;
}

export function ChatPanel({ bank, onClose }: ChatPanelProps) {
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text');
  const [voiceMethod, setVoiceMethod] = useState<'sse' | 'ws'>('sse');
  const [language, setLanguage] = useState<string>('en');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  
  // Citations currently active in Column 3
  const [activeCitations, setActiveCitations] = useState<any[]>([]);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // SSE MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // WebSocket Client reference
  const wsClientRef = useRef<WazobiaVoiceClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // GSAP References for cinematic entrances
  const workspaceRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const centerColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  // Fetch suggested questions and DB stats when bank changes
  useEffect(() => {
    fetchSuggestedQuestions(bank.slug)
      .then(setSuggested)
      .catch((err) => console.error("Failed to fetch suggestions", err));

    fetchInstitutionStats(bank.slug)
      .then(setStats)
      .catch((err) => console.warn("Failed to load institution stats", err));
    
    // Reset messages and active citations for the new bank
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `Kedu! Sannu! Bawo ni! Welcome to the administrative workspace for ${bank.name}. How can I assist you today?`,
      }
    ]);
    setActiveCitations([]);

    // GSAP Entrance timeline
    import('gsap').then(({ gsap }) => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.6 } });
      tl.fromTo(workspaceRef.current, { opacity: 0 }, { opacity: 1 });
      tl.fromTo(leftColRef.current, { x: -60, opacity: 0 }, { x: 0, opacity: 1 }, '-=0.4');
      tl.fromTo(rightColRef.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1 }, '-=0.5');
      tl.fromTo(centerColRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5');
    });
  }, [bank]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clean up audio & connections on unmount or bank change
  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupConnections();
    };
  }, [bank]);

  const cleanupAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingAudioId(null);
  };

  const cleanupConnections = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
      setWsConnected(false);
    }
    setIsRecording(false);
  };

  // Initialize and connect WebSocket client for streaming voice
  const initWebSocket = () => {
    if (wsClientRef.current) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || 'localhost:8000';
    const wsUrl = `${wsProtocol}//${wsHost}/v1/voice/stream/${bank.slug}`;

    let incomingAudioBytes: ArrayBuffer[] = [];

    wsClientRef.current = new WazobiaVoiceClient(wsUrl, {
      onStateChange: (connected) => {
        setWsConnected(connected);
      },
      onTranscript: (text, lang) => {
        setVoiceTranscript(text);
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === 'user' && lastMsg.id.startsWith('voice-temp')) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...lastMsg, text, lang };
            return updated;
          } else {
            return [
              ...prev,
              { id: `voice-temp-${Date.now()}`, sender: 'user', text, lang }
            ];
          }
        });
      },
      onAnswer: (text) => {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          { id: `bot-ans-${Date.now()}`, sender: 'bot', text, isLoading: true }
        ]);
      },
      onAudioBytes: (bytes) => {
        incomingAudioBytes.push(bytes);
      },
      onDone: (metadata) => {
        if (incomingAudioBytes.length > 0) {
          const blob = new Blob(incomingAudioBytes, { type: 'audio/wav' });
          const blobUrl = URL.createObjectURL(blob);
          
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.sender === 'bot') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                audioBlobUrl: blobUrl,
                sources: metadata.sources,
                isLoading: false,
              };
              playAudio(lastMsg.id, blobUrl);
              return updated;
            }
            return prev;
          });
        }
        if (metadata.sources) {
          setActiveCitations(metadata.sources);
        }
        incomingAudioBytes = [];
        setIsRecording(false);
      },
      onError: (err) => {
        console.error("WS voice error:", err);
        setIsRecording(false);
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          { id: `error-${Date.now()}`, sender: 'bot', text: `Error: ${err}` }
        ]);
      }
    });

    wsClientRef.current.connect();
  };

  const handleToggleChatMode = (mode: 'text' | 'voice') => {
    setChatMode(mode);
    cleanupAudio();
    cleanupConnections();
    
    if (mode === 'voice' && voiceMethod === 'ws') {
      initWebSocket();
    }
  };

  const handleVoiceMethodChange = (method: 'sse' | 'ws') => {
    setVoiceMethod(method);
    cleanupAudio();
    cleanupConnections();

    if (method === 'ws') {
      initWebSocket();
    }
  };

  const playAudio = (msgId: string, url: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      if (playingAudioId === msgId) {
        setPlayingAudioId(null);
        return;
      }
    }

    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);
    
    audio.play().catch(e => {
      console.error("Audio playback blocked or failed", e);
      setPlayingAudioId(null);
    });

    audio.onended = () => {
      setPlayingAudioId(null);
    };
  };

  // Submit Text Query (REST Mode)
  const handleSendText = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      lang: language,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res: QueryResponse = await submitQuery({
        query: textToSend,
        language,
        institution_slug: bank.slug,
        voice_gender: voiceGender,
      });

      const botMsgId = `bot-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: res.answer,
          audioUrl: res.audio_url,
          sources: res.citations,
        }
      ]);

      if (res.citations) {
        setActiveCitations(res.citations);
      }

      if (res.audio_url) {
        playAudio(botMsgId, res.audio_url);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `Failed to fetch response: ${err.message}`,
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Voice Recording Toggle
  const handleToggleVoiceRecording = async () => {
    if (voiceMethod === 'ws') {
      if (isRecording) {
        if (wsClientRef.current) {
          wsClientRef.current.stopRecording();
        }
      } else {
        setIsRecording(true);
        setVoiceTranscript('');
        if (!wsClientRef.current || !wsConnected) {
          initWebSocket();
        }

        try {
          if (wsClientRef.current) {
            await wsClientRef.current.startRecording({
              lang: language,
              gender: voiceGender
            });
          }
        } catch (err: any) {
          setIsRecording(false);
          alert(err.message);
        }
      }
    } else {
      if (isRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true }
          });
          mediaStreamRef.current = stream;

          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            await handleSSEQuery(audioBlob);
          };

          setIsRecording(true);
          setVoiceTranscript('');
          recorder.start();
        } catch (err: any) {
          alert(`Microphone access failed: ${err.message}`);
        }
      }
    }
  };

  // Perform SSE query
  const handleSSEQuery = async (audioBlob: Blob) => {
    setIsTyping(true);
    cleanupAudio();

    const tempUserMsgId = `user-sse-${Date.now()}`;
    const tempBotMsgId = `bot-sse-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: tempUserMsgId, sender: 'user', text: 'Transcribing speech...', lang: language },
      { id: tempBotMsgId, sender: 'bot', text: 'Generating search context...', isLoading: true }
    ]);

    const collectedAudioBase64: string[] = [];

    try {
      await streamVoiceQuery(
        audioBlob,
        bank.slug,
        language,
        voiceGender,
        {
          onTranscript: (data) => {
            setMessages(prev => prev.map(m => m.id === tempUserMsgId ? { ...m, text: data.text, lang: data.language } : m));
          },
          onResponse: (data) => {
            setIsTyping(false);
            setMessages(prev => prev.map(m => m.id === tempBotMsgId ? { ...m, text: data.text } : m));
          },
          onAudioChunk: (data) => {
            collectedAudioBase64.push(data.audio_base64);
          },
          onCompleted: (data) => {
            const binaryString = collectedAudioBase64.map(b64 => atob(b64)).join('');
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const wavBlob = new Blob([bytes], { type: 'audio/wav' });
            const blobUrl = URL.createObjectURL(wavBlob);

            setMessages(prev => prev.map(m => m.id === tempBotMsgId ? {
              ...m,
              audioBlobUrl: blobUrl,
              sources: data.sources,
              isLoading: false,
            } : m));

            if (data.sources) {
              setActiveCitations(data.sources);
            }

            playAudio(tempBotMsgId, blobUrl);
          },
          onError: (error) => {
            setIsTyping(false);
            setMessages(prev => prev.map(m => m.id === tempBotMsgId ? {
              ...m,
              text: `Error processing voice: ${error}`,
              isLoading: false,
            } : m));
          }
        }
      );
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => prev.map(m => m.id === tempBotMsgId ? {
        ...m,
        text: `SSE Connection Failed: ${err.message}`,
        isLoading: false,
      } : m));
    }
  };

  return (
    <div ref={workspaceRef} className="workspace-overlay">
      <div className="workspace-grid">
        
        {/* ================= COLUMN 1: Profile & Navigation ================= */}
        <div ref={leftColRef} className="workspace-column left glass">
          <button className="back-deck-btn" onClick={onClose}>
            <ArrowLeft size={16} />
            <span>BACK TO SYSTEM DECK</span>
          </button>

          <div className="profile-card">
            <div className="bank-profile-avatar" style={{ backgroundColor: bank.brandColor }}>
              {bank.name.substring(0, 2).toUpperCase()}
            </div>
            <h2>{bank.name}</h2>
            <p className="full-name-sub">{bank.full_name}</p>
          </div>

          <div className="metadata-pills">
            <div className="pill">
              <span className="pill-title">USSD CODE</span>
              <span className="pill-val">{bank.ussd}</span>
            </div>
            <div className="pill">
              <span className="pill-title">LICENSE TYPE</span>
              <span className="pill-val">{bank.license}</span>
            </div>
          </div>

          {/* Database Ingestion Stats */}
          <div className="stats-box">
            <div className="stats-header">
              <BarChart2 size={14} className="glow-icon" />
              <h3>DATABASE METRICS</h3>
            </div>
            {stats ? (
              <div className="stats-grid">
                <div className="stat-row">
                  <span className="lbl">Total Collections</span>
                  <span className="val">{stats.total_collection_points.toLocaleString()}</span>
                </div>
                <div className="stat-row">
                  <span className="lbl">Indexed Vectors (Slug)</span>
                  <span className="val">{stats.institution_points_count.toLocaleString()}</span>
                </div>
                <div className="stat-row flex-col">
                  <span className="lbl">Last Ingestion Run</span>
                  <span className="val-small">
                    {new Date(stats.indexed_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="stats-loader">
                <Loader className="spinner" size={14} />
                <span>Syncing vector registry...</span>
              </div>
            )}
          </div>

          {/* Suggested Starter Questions */}
          {suggested.length > 0 && (
            <div className="suggested-questions-box">
              <h3>SUGGESTED QUERIES</h3>
              <div className="questions-scroll">
                {suggested.map((q, idx) => (
                  <button key={idx} className="question-capsule" onClick={() => handleSendText(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= COLUMN 2: Conversational Hub ================= */}
        <div ref={centerColRef} className="workspace-column center glass">
          <div className="chat-header-row">
            <div className="chat-mode-selector">
              <button 
                className={`mode-btn ${chatMode === 'text' ? 'active' : ''}`}
                onClick={() => handleToggleChatMode('text')}
              >
                Text
              </button>
              <button 
                className={`mode-btn ${chatMode === 'voice' ? 'active' : ''}`}
                onClick={() => handleToggleChatMode('voice')}
              >
                Voice
              </button>
            </div>
          </div>

          {/* Main Messages Log */}
          <div className="conversational-log">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender}`}>
                <div className={`balloon ${msg.sender}`}>
                  <p>{msg.text}</p>
                  
                  {msg.sender === 'bot' && (msg.audioUrl || msg.audioBlobUrl) && (
                    <button 
                      className={`play-btn ${playingAudioId === msg.id ? 'playing' : ''}`}
                      onClick={() => playAudio(msg.id, msg.audioBlobUrl || msg.audioUrl || '')}
                    >
                      {playingAudioId === msg.id ? <Square size={10} fill="#fff" /> : <Play size={10} fill="#fff" />}
                      <span>{playingAudioId === msg.id ? "Stop voice" : "Listen response"}</span>
                    </button>
                  )}

                  {msg.isLoading && (
                    <div className="stream-loader">
                      <Loader className="spinner" size={14} />
                      <span>Synthesizing dynamic speech...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-row bot">
                <div className="balloon bot typing">
                  <span className="bounce-dot" />
                  <span className="bounce-dot" />
                  <span className="bounce-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Interface */}
          <div className="conversational-input">
            {chatMode === 'text' ? (
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendText(inputText); }} 
                className="input-bar"
              >
                <input
                  type="text"
                  placeholder={`Ask ${bank.name} anything (e.g. transfer fees, cash limits, loan rates)...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isTyping}
                />
                <button type="submit" disabled={!inputText.trim() || isTyping}>
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div className="mic-interface-box">
                <div className="waveform-box">
                  <AudioWaveform isRecording={isRecording} color={bank.brandColor} />
                </div>

                {isRecording && (
                  <div className="live-speech-box">
                    {voiceTranscript ? (
                      <p className="subtitle">"{voiceTranscript}"</p>
                    ) : (
                      <p className="blink-prompt">
                        {voiceMethod === 'ws' ? "WebSocket active. Speak now..." : "SSE locally buffered. Press button to complete speech..."}
                      </p>
                    )}
                  </div>
                )}

                <div className="mic-button-row">
                  <button 
                    onClick={handleToggleVoiceRecording}
                    className={`mic-ring ${isRecording ? 'recording' : ''}`}
                    style={{ 
                      backgroundColor: isRecording ? '#f43f5e' : bank.brandColor,
                      boxShadow: isRecording 
                        ? '0 0 25px rgba(244, 63, 94, 0.5)' 
                        : `0 0 20px ${bank.brandColor}`
                    }}
                  >
                    {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                  <span className="trigger-label">
                    {isRecording 
                      ? (voiceMethod === 'ws' ? "Press to send query" : "Press to finish recording") 
                      : "Tap microphone to interact"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: Research & Citation Deck ================= */}
        <div ref={rightColRef} className="workspace-column right glass">
          <div className="config-card">
            <div className="card-header">
              <BookOpen size={14} className="glow-icon" />
              <h3>WORKSPACE PARAMETERS</h3>
            </div>
            
            <div className="options-stack">
              <div className="opt-group">
                <label>Preferred Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English (US/UK)</option>
                  <option value="pcm">Nigerian Pidgin</option>
                  <option value="yo">Yoruba (Káàsọ̀)</option>
                  <option value="ha">Hausa (Sannu)</option>
                  <option value="ig">Igbo (Ndịwo)</option>
                  <option value="auto">Auto-Detect Speech</option>
                </select>
              </div>

              <div className="opt-group">
                <label>Voice Synthesizer Gender</label>
                <select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value as 'male' | 'female')}>
                  <option value="female">Lady (Female Accent)</option>
                  <option value="male">Gentleman (Male Accent)</option>
                </select>
              </div>

              {chatMode === 'voice' && (
                <div className="opt-group">
                  <label>Audio Transport Protocol</label>
                  <select value={voiceMethod} onChange={(e) => handleVoiceMethodChange(e.target.value as 'sse' | 'ws')}>
                    <option value="sse">SSE Streaming (Recommended)</option>
                    <option value="ws">Real-Time WS Connection</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* RAG Citations snippets list */}
          <div className="citations-box">
            <div className="card-header">
              <BookOpen size={14} className="glow-icon" />
              <h3>CITED KNOWLEDGE SEGMENTS</h3>
            </div>
            
            <div className="citations-list-scroll">
              {activeCitations.length > 0 ? (
                activeCitations.map((cit, idx) => (
                  <div key={idx} className="citation-segment-card">
                    <div className="segment-header">
                      <span className="idx">REFERENCE #{idx + 1}</span>
                      {cit.score && <span className="score">Match: {(cit.score * 100).toFixed(0)}%</span>}
                    </div>
                    <p className="segment-text">"{cit.text}"</p>
                    {cit.source_url && (
                      <a href={cit.source_url} target="_blank" rel="noopener noreferrer" className="segment-link">
                        Source Link: {new URL(cit.source_url).hostname}
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="citations-placeholder">
                  <ShieldAlert size={28} className="warn-icon" />
                  <p>Database Context Inactive</p>
                  <span>Verbatim source snippets retrieved from the Qdrant database matching your query will be displayed here dynamically.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Workspace specific styles */}
      <style>{`
        .workspace-overlay {
          position: absolute;
          inset: 0;
          z-index: 100;
          background: rgba(3, 4, 8, 0.4);
          overflow: hidden;
          width: 100vw;
          height: 100vh;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: 300px 1fr 340px;
          gap: 20px;
          padding: 20px;
          height: 100%;
          box-sizing: border-box;
          width: 100%;
        }

        .workspace-column {
          height: 100%;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .workspace-column.left {
          background: rgba(8, 10, 20, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 20px;
          gap: 20px;
        }

        .workspace-column.center {
          background: rgba(10, 14, 28, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .workspace-column.right {
          background: rgba(8, 10, 20, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 20px;
          gap: 20px;
        }

        /* COLUMN 1: Profile UI */
        .back-deck-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-family: var(--font-mono);
          font-weight: 700;
          transition: all 0.2s;
        }

        .back-deck-btn:hover {
          color: #fff;
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .profile-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }

        .bank-profile-avatar {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-family: var(--font-mono);
          font-size: 24px;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .profile-card h2 {
          font-size: 22px;
          color: #fff;
          margin: 0;
          font-weight: 800;
        }

        .full-name-sub {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .metadata-pills {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .pill {
          flex: 1;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 10px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pill-title {
          font-size: 8px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .pill-val {
          font-size: 13px;
          font-family: var(--font-mono);
          font-weight: 700;
          color: #fff;
          margin-top: 4px;
        }

        /* Database Stats */
        .stats-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stats-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-primary);
        }

        .stats-header h3 {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .stats-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .stat-row.flex-col {
          flex-direction: column;
          gap: 2px;
        }

        .stat-row .lbl {
          color: var(--text-muted);
        }

        .stat-row .val {
          font-weight: 700;
          color: #fff;
          font-family: var(--font-mono);
        }

        .stat-row .val-small {
          color: var(--text-secondary);
          font-size: 11px;
          font-family: var(--font-mono);
        }

        .stats-loader {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 11px;
          color: var(--text-muted);
        }

        .glow-icon {
          filter: drop-shadow(0 0 5px var(--color-primary));
        }

        /* Suggested Queries */
        .suggested-questions-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
        }

        .suggested-questions-box h3 {
          font-size: 11px;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .questions-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .question-capsule {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 12px;
          text-align: left;
          line-height: 1.4;
          transition: all 0.2s;
        }

        .question-capsule:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.25);
          color: #fff;
          transform: translateX(3px);
        }

        /* COLUMN 2: Chat */
        .chat-header-row {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.25);
        }

        .chat-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .chat-badge .pulse {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
        }

        .chat-mode-selector {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2px;
        }

        .chat-mode-selector .mode-btn {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          background: transparent;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .chat-mode-selector .mode-btn.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
        }

        .conversational-log {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chat-row {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .chat-row.user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .chat-row.bot {
          align-self: flex-start;
          align-items: flex-start;
        }

        .balloon {
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
        }

        .balloon.user {
          background: var(--color-primary);
          color: #fff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 5px 15px rgba(99, 102, 241, 0.15);
        }

        .balloon.bot {
          background: rgba(255, 255, 255, 0.025);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .balloon.bot.typing {
          display: flex;
          gap: 4px;
          padding: 12px;
        }

        .bounce-dot {
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .bounce-dot:nth-child(1) { animation-delay: -0.32s; }
        .bounce-dot:nth-child(2) { animation-delay: -0.16s; }

        .play-btn {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .play-btn:hover {
          background: var(--color-accent);
          border-color: var(--color-accent);
        }

        .play-btn.playing {
          background: #f43f5e;
          border-color: #f43f5e;
        }

        .stream-loader {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 10px;
          color: var(--text-muted);
        }

        .conversational-input {
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(13, 17, 34, 0.2);
        }

        .input-bar {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 6px;
        }

        .input-bar input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          padding: 8px 12px;
          font-size: 14px;
        }

        .input-bar button {
          width: 36px;
          height: 36px;
          background: var(--color-primary);
          color: #fff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .input-bar button:hover:not(:disabled) {
          background: var(--color-accent);
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
        }

        .input-bar button:disabled {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* Voice Input Box */
        .mic-interface-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .waveform-box {
          width: 100%;
          height: 48px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .live-speech-box {
          min-height: 18px;
        }

        .live-speech-box .subtitle {
          font-size: 12px;
          color: #fff;
          font-style: italic;
        }

        .blink-prompt {
          font-size: 10px;
          color: var(--text-muted);
          animation: pulse-ring 2s infinite;
        }

        .mic-button-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .mic-ring {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .mic-ring:hover {
          transform: scale(1.1);
        }

        .trigger-label {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* COLUMN 3: Configs & Citations */
        .config-card {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-primary);
        }

        .card-header h3 {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .options-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .opt-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .opt-group label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .opt-group select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #fff;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 12px;
        }

        /* Citation segments column */
        .citations-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
        }

        .citations-list-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .citation-segment-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .segment-header {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          font-family: var(--font-mono);
          font-weight: 700;
        }

        .segment-header .idx {
          color: var(--color-primary);
        }

        .segment-header .score {
          color: #34d399;
          background: rgba(52, 211, 153, 0.08);
          border: 1px solid rgba(52, 211, 153, 0.15);
          padding: 1px 4px;
          border-radius: 4px;
        }

        .segment-text {
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-secondary);
          font-style: italic;
        }

        .segment-link {
          font-size: 10px;
          color: var(--text-muted);
          text-decoration: none;
          margin-top: 4px;
          transition: color 0.2s;
        }

        .segment-link:hover {
          color: #fff;
        }

        .citations-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
          gap: 8px;
        }

        .warn-icon {
          color: var(--text-muted);
        }

        .citations-placeholder p {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .citations-placeholder span {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1.4;
          max-width: 250px;
        }
      `}</style>
    </div>
  );
}
