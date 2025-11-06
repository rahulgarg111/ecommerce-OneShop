export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId');

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('sessionId', sessionId);
  }

  return sessionId;
};

export const clearSessionId = (): void => {
  localStorage.removeItem('sessionId');
};
