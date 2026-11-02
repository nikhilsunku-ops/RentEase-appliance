// REQ-5: reject requests where the logged-in user lacks the required role, with 403
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : "unknown"}' is not permitted to perform this action`,
      });
    }
    next();
  };
};

module.exports = { authorize };
