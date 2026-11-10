// Fixed destinations: a supplied API key is never forwarded to a custom URL.
export const AI_PROVIDERS={
  openai:{name:'OpenAI',docs:'https://developers.openai.com/api/docs/models',endpoint:'https://api.openai.com/v1/responses',format:'responses'},
  gemini:{name:'Google Gemini',docs:'https://ai.google.dev/gemini-api/docs/models',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/',format:'gemini'},
  anthropic:{name:'Claude · Anthropic',docs:'https://platform.claude.com/docs/en/about-claude/models/overview',endpoint:'https://api.anthropic.com/v1/messages',format:'anthropic'},
  xai:{name:'Grok · xAI',docs:'https://docs.x.ai/developers/models',endpoint:'https://api.x.ai/v1/responses',format:'responses'},
  openrouter:{name:'OpenRouter · vários modelos',docs:'https://openrouter.ai/models',endpoint:'https://openrouter.ai/api/v1/chat/completions',format:'chat'},
};
