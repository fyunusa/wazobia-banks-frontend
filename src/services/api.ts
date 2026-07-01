export interface QueryRequest {
  query: string;
  language: string;
  institution_slug: string;
  voice_gender?: "male" | "female";
}

export interface QueryResponse {
  answer: string;
  language: string;
  audio_url?: string;
  citations?: Array<{
    text: string;
    source_url?: string;
    score?: number;
  }>;
}

export interface Institution {
  slug: string;
  name: string;
  full_name: string;
  cbn_license_type: string;
  ussd_code?: string;
  customer_care?: string;
  hq: string;
  website: string;
  logo_slug: string;
  active: boolean;
}

export interface InstitutionStats {
  total_collection_points: number;
  institution_points_count: number;
  indexed_at: string;
}

export interface UploadResponse {
  upload_batch_id: string;
  task_id: string;
  files_parsed: number;
  files_with_errors: number;
  files: Array<{
    filename: string;
    size_bytes: number;
    status: string;
  }>;
  errors: any;
}

export interface TaskStatusResponse {
  task_id: string;
  status: "SUCCESS" | "PENDING" | "FAILURE" | "RETRY" | "STARTED";
  ready: boolean;
  result?: {
    chunks_created?: number;
    points_upserted?: number;
    pages_scraped?: number;
    error?: string;
  };
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchInstitutions(apiKey?: string): Promise<Institution[]> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  const response = await fetch(`${API_BASE_URL}/v1/institutions`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch institutions');
  }
  return response.json();
}

export async function fetchInstitutionDetail(slug: string, apiKey?: string): Promise<Institution> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  const response = await fetch(`${API_BASE_URL}/v1/institutions/${slug}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch details for ${slug}`);
  }
  return response.json();
}

export async function fetchInstitutionStats(slug: string, apiKey?: string): Promise<InstitutionStats> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  const response = await fetch(`${API_BASE_URL}/v1/institutions/${slug}/stats`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch stats for ${slug}`);
  }
  return response.json();
}

export async function submitQuery(req: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: req.query,
      language: req.language,
      institution_slug: req.institution_slug,
      voice_gender: req.voice_gender
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit query');
  }
  
  return response.json();
}

export async function fetchSuggestedQuestions(slug: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/v1/query/institutions/${slug}/suggested-questions`);
  if (!response.ok) {
    throw new Error('Failed to fetch suggested questions');
  }
  return response.json();
}

export async function uploadDocuments(
  slug: string, 
  files: File[], 
  apiKey: string
): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/v1/institutions/${slug}/upload`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload files');
  }
  
  return response.json();
}

export async function fetchTaskStatus(
  taskId: string, 
  apiKey: string
): Promise<TaskStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/ingest/tasks/${taskId}`, {
    headers: {
      'X-API-Key': apiKey,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch task status for ${taskId}`);
  }
  
  return response.json();
}

export async function streamVoiceQuery(
  audioBlob: Blob,
  institutionSlug: string,
  preferredLanguage: string,
  gender: string,
  callbacks: {
    onTranscript?: (data: { text: string; language: string; confidence: number }) => void;
    onResponse?: (data: { text: string; language: string; confidence: number }) => void;
    onAudioChunk?: (data: { audio_base64: string; chunk_index: number; is_last: boolean }) => void;
    onCompleted?: (data: any) => void;
    onError?: (error: string) => void;
  }
) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'query.wav');
  formData.append('institution_slug', institutionSlug);
  formData.append('preferred_language', preferredLanguage);
  formData.append('gender', gender);

  const response = await fetch(`${API_BASE_URL}/v1/voice/stream-sse`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to start audio stream');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last partial line in the buffer
    buffer = lines.pop() || '';

    let currentEvent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.substring(5).trim();
        try {
          const parsed = JSON.parse(dataStr);
          if (currentEvent === 'transcript') {
            callbacks.onTranscript?.(parsed);
          } else if (currentEvent === 'response') {
            callbacks.onResponse?.(parsed);
          } else if (currentEvent === 'audio_chunk') {
            callbacks.onAudioChunk?.(parsed);
          } else if (currentEvent === 'completed') {
            callbacks.onCompleted?.(parsed);
          } else if (currentEvent === 'error') {
            callbacks.onError?.(parsed.error || parsed.detail || 'Unknown stream error');
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e, dataStr);
        }
      }
    }
  }
}
