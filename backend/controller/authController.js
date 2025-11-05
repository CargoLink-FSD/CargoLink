const {asyncHandler} = require('./utils');
const Customer = require('../models/customer');
const Transporter = require("../models/transporter");
const ADMIN_EMAIL = "admin@cargolink.com";
const ADMIN_PASSWORD = "admin@123";

const loginCustomer = asyncHandler(async (req, res) => {
    
    const { email, password } = req.body;
    
    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(401).json({ ok: false, error: "Email not found" });

    const match = await customer.verifyPassword(password);
    if (!match) return res.status(401).json({ ok: false, error: "Invalid Password" });

    req.session.user = {
        id: customer._id.toString(),
        role: "customer"
    };
        
    return res.json({ ok: true, user: req.session.user });
});

const loginTransporter = asyncHandler(async (req, res) => {
    
    const { email, password } = req.body;    


    const transporter = await Transporter.findOne({ email });
    if (!transporter) return res.status(401).json({ ok: false, error: "Email not found" });
    
    const match = await transporter.verifyPassword(password);
    if (!match) return res.status(401).json({ ok: false, error: "Invalid Passwprd" });

    req.session.user = {
        id: transporter._id.toString(),
        role: "transporter"
    };
        
    return res.json({ ok: true, user: req.session.user });
});


const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    req.session.user = {
        id: "admin",
        role: "admin"
    };

    return res.json({ ok: true, user: req.session.user });
});


const logout = asyncHandler((req, res) => {
  req.session.destroy((err) => {
      if (err) return res.status(500).json({ ok: false, error: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.json({ ok: true, message: "Logged out successfully" });
  });
});

// API Methods for React frontend
const getCurrentUser = asyncHandler(async (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ ok: true, user: req.session.user });
    }

    res.status(401).json({ ok: false, error: 'Not authenticated' });
});

const getCustomerId = (req) => {
    return req.session.user.id;
}

const getTransporterId = (req) => {
    return req.session.user.id;
}

const getUserId = (req) => {
    return req.session.user.id;   
}

module.exports = { 
    loginCustomer, 
    loginTransporter, 
    loginAdmin,
    logout,
    getCurrentUser,
    getCustomerId, 
    getTransporterId,
    getUserId
};
