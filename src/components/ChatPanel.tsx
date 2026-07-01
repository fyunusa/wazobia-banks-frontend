import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, X, ArrowRight, Play, Square, Loader } from 'lucide-react';
import { submitQuery, fetchSuggestedQuestions, streamVoiceQuery } from '../services/api';
import type { QueryResponse } from '../services/api';
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

  // Fetch suggested questions when bank changes
  useEffect(() => {
    fetchSuggestedQuestions(bank.slug)
      .then(setSuggested)
      .catch((err) => console.error("Failed to fetch suggestions", err));
    
    // Reset messages for the new bank
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `Kedu! Sannu! Bawo ni! Welcome to the ${bank.name} Interactive Assistant. Ask me anything about accounts, fees, USSD, or circular guidelines.`,
      }
    ]);
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
    // Stop recording tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    // Disconnect websocket
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
            updated[updated.length - 1] = {
              ...lastMsg,
              text,
              lang,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: `voice-temp-${Date.now()}`,
                sender: 'user',
                text,
                lang,
              }
            ];
          }
        });
      },
      onAnswer: (text) => {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: `bot-ans-${Date.now()}`,
            sender: 'bot',
            text,
            isLoading: true,
          }
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
        } else {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.sender === 'bot') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                sources: metadata.sources,
                isLoading: false,
              };
              return updated;
            }
            return prev;
          });
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
          {
            id: `error-${Date.now()}`,
            sender: 'bot',
            text: `Error: ${err}`,
          }
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

  // Voice Interaction Trigger
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
      // SSE Streaming Mode (Recommended)
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
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            }
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

  // Perform SSE streaming query
  const handleSSEQuery = async (audioBlob: Blob) => {
    setIsTyping(true);
    cleanupAudio();

    const tempUserMsgId = `user-sse-${Date.now()}`;
    const tempBotMsgId = `bot-sse-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: tempUserMsgId,
        sender: 'user',
        text: 'Transcribing speech...',
        lang: language,
      },
      {
        id: tempBotMsgId,
        sender: 'bot',
        text: 'Searching wazobia data...',
        isLoading: true,
      }
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

            playAudio(tempBotMsgId, blobUrl);
          },
          onError: (error) => {
            setIsTyping(false);
            setMessages(prev => prev.map(m => m.id === tempBotMsgId ? {
              ...m,
              text: `Error: ${error}`,
              isLoading: false,
            } : m));
          }
        }
      );
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => prev.map(m => m.id === tempBotMsgId ? {
        ...m,
        text: `SSE connection error: ${err.message}`,
        isLoading: false,
      } : m));
    }
  };

  return (
    <div className="chat-panel glass">
      {/* Panel Header */}
      <div className="chat-header">
        <div className="header-info">
          <div className="bank-avatar" style={{ backgroundColor: bank.brandColor, boxShadow: `0 0 16px ${bank.brandColor}` }}>
            {bank.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3>{bank.name} Assistant</h3>
            <p className="license-text">{bank.license}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Control Tabs */}
      <div className="chat-controls">
        <div className="mode-tabs">
          <button 
            className={`tab-btn ${chatMode === 'text' ? 'active' : ''}`}
            onClick={() => handleToggleChatMode('text')}
          >
            Keyboard Link
          </button>
          <button 
            className={`tab-btn ${chatMode === 'voice' ? 'active' : ''}`}
            onClick={() => handleToggleChatMode('voice')}
          >
            Vocal Vector
          </button>
        </div>

        {/* Configuration Row */}
        <div className="dropdowns-row">
          <div className="control-group">
            <label>Dialect</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="pcm">Pidgin</option>
              <option value="yo">Yoruba</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
              <option value="auto">Auto-Detect</option>
            </select>
          </div>

          <div className="control-group">
            <label>Gender</label>
            <select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value as 'male' | 'female')}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          {chatMode === 'voice' && (
            <div className="control-group">
              <label>API Protocol</label>
              <select value={voiceMethod} onChange={(e) => handleVoiceMethodChange(e.target.value as 'sse' | 'ws')}>
                <option value="sse">SSE Stream</option>
                <option value="ws">Real-Time WS</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
            <div className={`message-bubble ${msg.sender}`} style={{
              borderLeft: msg.sender === 'bot' ? `3px solid ${bank.brandColor}` : undefined
            }}>
              <p>{msg.text}</p>
              
              {/* Play Audio Button for Bot responses */}
              {msg.sender === 'bot' && (msg.audioUrl || msg.audioBlobUrl) && (
                <button 
                  className={`audio-play-btn ${playingAudioId === msg.id ? 'playing' : ''}`}
                  onClick={() => playAudio(msg.id, msg.audioBlobUrl || msg.audioUrl || '')}
                >
                  {playingAudioId === msg.id ? <Square size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
                  <span>{playingAudioId === msg.id ? "HALT VOICE" : "LISTEN VOICE"}</span>
                </button>
              )}

              {/* Loader for loading status */}
              {msg.isLoading && (
                <div className="message-loader">
                  <Loader className="spinner" size={12} />
                  <span>Streaming synthesized audio...</span>
                </div>
              )}
            </div>

            {/* Citations / Sources */}
            {msg.sender === 'bot' && msg.sources && msg.sources.length > 0 && (
              <div className="citation-container">
                <span className="citation-title">Linked References:</span>
                <div className="citation-list">
                  {msg.sources.map((src, i) => (
                    <a 
                      key={i} 
                      href={src.source_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="citation-card"
                    >
                      <span className="citation-idx" style={{ color: bank.brandColor }}>{i + 1}</span>
                      <span className="citation-url">
                        {src.source_url ? new URL(src.source_url).hostname : 'Wazobia Registry KB'}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="message-wrapper bot">
            <div className="message-bubble bot typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {chatMode === 'text' && messages.length <= 1 && suggested.length > 0 && (
        <div className="suggestions-box">
          <p className="suggest-title">Suggested Inquiries:</p>
          <div className="suggest-list">
            {suggested.map((q, idx) => (
              <button key={idx} className="suggest-item" onClick={() => handleSendText(q)}>
                {q} <ArrowRight size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input controls based on active Mode */}
      <div className="chat-input-area">
        {chatMode === 'text' ? (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendText(inputText); }} 
            className="text-input-form"
          >
            <input
              type="text"
              placeholder="Query account charges, tariff guides, transfer rates..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={!inputText.trim() || isTyping}>
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div className="voice-input-container">
            {/* Live Waveform Canvas */}
            <div className="waveform-box">
              <AudioWaveform isRecording={isRecording} color={bank.brandColor} />
            </div>

            {/* Live transcription subtitle */}
            {isRecording && (
              <div className="voice-feedback">
                {voiceTranscript ? (
                  <p className="live-transcript">"{voiceTranscript}"</p>
                ) : (
                  <p className="listening-prompt">
                    {voiceMethod === 'ws' ? "Live uplink active: speak..." : "Local recording buffer open: speak..."}
                  </p>
                )}
              </div>
            )}

            {/* Mic trigger button */}
            <div className="mic-trigger-row">
              <button 
                onClick={handleToggleVoiceRecording}
                className={`mic-button ${isRecording ? 'recording' : ''}`}
                style={{ 
                  backgroundColor: isRecording ? '#ef4444' : bank.brandColor,
                  boxShadow: isRecording 
                    ? '0 0 25px rgba(239, 68, 68, 0.7)' 
                    : `0 0 20px ${bank.brandColor}`
                }}
              >
                {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <span className="mic-status-label">
                {isRecording 
                  ? (voiceMethod === 'ws' ? "SEND UPLINK" : "FINISH & GENERATE") 
                  : "PRESS TO INITIATE VOICE LINK"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS specific to ChatPanel */}
      <style>{`
        .chat-panel {
          width: 440px;
          height: calc(100% - 40px);
          position: absolute;
          right: 20px;
          top: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .chat-header {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.45);
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bank-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: 16px;
          color: #fff;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
        }

        .license-text {
          font-size: 10px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }

        .chat-controls {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(5, 6, 11, 0.4);
        }

        .mode-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 2px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .tab-btn {
          flex: 1;
          padding: 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          background: transparent;
          color: var(--text-secondary);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-transform: uppercase;
          font-family: var(--font-mono);
          letter-spacing: 0.05em;
        }

        .tab-btn.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.45);
        }

        .dropdowns-row {
          display: flex;
          gap: 10px;
        }

        .control-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .control-group label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .control-group select {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          width: 100%;
        }

        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 88%;
        }

        .message-wrapper.user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message-wrapper.bot {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-bubble {
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        .message-bubble.user {
          background: linear-gradient(135deg, hsla(239, 84%, 67%, 0.8) 0%, hsla(272, 88%, 68%, 0.8) 100%);
          color: #fff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 6px 15px rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message-bubble.bot {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .message-bubble.bot.typing {
          display: flex;
          gap: 5px;
          padding: 12px 16px;
        }

        .message-bubble.bot.typing .dot {
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .message-bubble.bot.typing .dot:nth-child(1) { animation-delay: -0.32s; }
        .message-bubble.bot.typing .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }

        .audio-play-btn {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          letter-spacing: 0.03em;
          font-family: var(--font-mono);
        }

        .audio-play-btn:hover {
          background: var(--color-accent);
          border-color: var(--color-accent);
          box-shadow: var(--shadow-neon-accent);
        }

        .audio-play-btn.playing {
          background: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
        }

        .message-loader {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .spinner {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .citation-container {
          margin-top: 8px;
          padding: 0 4px;
        }

        .citation-title {
          font-size: 9px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .citation-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .citation-card {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 10px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.3s;
        }

        .citation-card:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          color: #fff;
          transform: translateY(-1px);
        }

        .citation-idx {
          font-weight: 800;
        }

        .suggestions-box {
          padding: 0 20px 14px 20px;
        }

        .suggest-title {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .suggest-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .suggest-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .suggest-item:hover {
          background: rgba(99, 102, 241, 0.06);
          border-color: rgba(99, 102, 241, 0.3);
          color: #fff;
          transform: translateX(4px);
        }

        .chat-input-area {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(13, 17, 34, 0.45);
        }

        .text-input-form {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 4px;
        }

        .text-input-form input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          padding: 10px 14px;
          font-size: 14px;
        }

        .text-input-form button {
          width: 38px;
          height: 38px;
          background: var(--color-primary);
          color: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .text-input-form button:hover:not(:disabled) {
          background: var(--color-accent);
          box-shadow: var(--shadow-neon-accent);
          transform: scale(1.03);
        }

        .text-input-form button:disabled {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .voice-input-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .waveform-box {
          width: 100%;
          height: 48px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .voice-feedback {
          text-align: center;
          width: 100%;
          min-height: 18px;
        }

        .live-transcript {
          font-size: 12px;
          color: #fff;
          font-style: italic;
          line-height: 1.4;
        }

        .listening-prompt {
          font-size: 11px;
          color: var(--text-muted);
          animation: pulse-ring 2s infinite;
          font-family: var(--font-mono);
        }

        .mic-trigger-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .mic-button {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .mic-button:hover {
          transform: scale(1.08);
        }

        .mic-status-label {
          font-size: 9px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
