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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchInstitutions(): Promise<Institution[]> {
  const response = await fetch(`${API_BASE_URL}/v1/institutions`, {
    headers: {
      'X-API-Key': 'admin_key_wazobia', // The standard admin key we use
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch institutions');
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
