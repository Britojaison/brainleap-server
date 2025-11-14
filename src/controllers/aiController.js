export const requestHint = async (req, res) => {
  return res.status(503).json({
    success: false,
    message: 'AI hint service is not yet implemented on the backend.',
  });
};

export const evaluateCanvas = async (req, res) => {
  return res.status(503).json({
    success: false,
    message: 'AI evaluation service is not yet implemented on the backend.',
  });
};
