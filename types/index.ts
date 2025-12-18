export interface ScriptResult {
  scriptText: string;
  visualKeywords: string[];
}

export interface ScriptRequest {
  url: string;
}

export interface ApiError {
  error: string;
}
