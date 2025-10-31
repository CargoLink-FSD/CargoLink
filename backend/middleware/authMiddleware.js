const isCustomer = (req, res, next) => {
  if (["/customer/login", "/customer/signup"].includes(req.path)) {
    return next();
  }
  if (req.session.user && req.session.user.role == 'customer')
      return next();
    return res.redirect("/customer/login");
};
  
const isTransporter = (req, res, next) => {
  if (["/transporter/login", "/transporter/signup"].includes(req.path)) {
    return next();
  }  
  if (req.session.user && req.session.user.role === "transporter"){   
    next();
  }else{
    return res.redirect("/transporter/login");
  }
};
// middleware/authMiddleware.js

const isAdmin = (req, res, next) => {
  if (["/admin/login"].includes(req.path)) {
    return next();
  }
  if (req.session.user && req.session.user.role == 'admin')
      return next();
    return res.redirect("/admin/login");
};

const isUser = (req, res, next) => {
  if (req.session.user)
      return next();
    return res.redirect("/");
};

  
module.exports = { isCustomer, isTransporter, isAdmin, isUser};
  