export const DEFAULT_AI_MODEL = "deepseek/deepseek-v4-flash:free";

export const AI_MODEL_OPTIONS = [
  {
    value: "deepseek/deepseek-v4-flash:free",
    label: "DeepSeek V4 Flash",
  },
  {
    value: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
  },
  {
    value: "openai/gpt-oss-120b:free",
    label: "GPT OSS 120B",
  },
  {
    value: "openai/gpt-oss-20b:free",
    label: "GPT OSS 20B",
  },
  {
    value: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder",
  },
  {
    value: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
  },
  {
    value: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
  },
] as const;

export const ALLOWED_AI_MODELS: ReadonlySet<string> = new Set(
  AI_MODEL_OPTIONS.map((option) => option.value)
);
