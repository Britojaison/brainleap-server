export const validateLogin = (payload) => {
  if (!payload.email || !payload.password) {
    throw new Error('Email and password are required');
  }
};

export const validateAiCanvasPayload = ({ canvasState }) => {
  // Placeholder for validating whiteboard payloads before invoking the AI service.
  if (!canvasState) {
    throw new Error('Canvas state is required');
  }
};
