module.exports = (err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal server error. Please try again.' : err.message,
  });
};
