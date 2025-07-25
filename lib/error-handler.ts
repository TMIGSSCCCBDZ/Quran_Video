export class VideoRenderError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message)
    this.name = "VideoRenderError"
  }
}

export class AudioError extends Error {
  constructor(
    message: string,
    public audioUrl?: string,
  ) {
    super(message)
    this.name = "AudioError"
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

export function handleRenderError(error: unknown): {
  message: string
  code: string
  statusCode: number
} {
  if (error instanceof VideoRenderError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: 500,
    }
  }

  if (error instanceof AudioError) {
    return {
      message: `Audio error: ${error.message}`,
      code: "AUDIO_ERROR",
      statusCode: 400,
    }
  }

  if (error instanceof ValidationError) {
    return {
      message: `Validation error: ${error.message}`,
      code: "VALIDATION_ERROR",
      statusCode: 400,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
      statusCode: 500,
    }
  }

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  }
}
