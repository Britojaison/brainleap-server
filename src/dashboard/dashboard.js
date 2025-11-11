export const renderDashboard = (req, res) => {
  // TODO: Replace with real admin analytics for AI session monitoring.
  res.sendFile('dashboard.html', { root: new URL('./views', import.meta.url).pathname });
};
