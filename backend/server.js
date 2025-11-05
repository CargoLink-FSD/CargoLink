const connectDatabase = require("./database/db")
const errorMiddleware = require('./middleware/errorMiddleware')
const express = require('express');
const session = require("express-session");
const cors = require('cors');
const {asyncHandler} = require('./controller/utils');
const authController = require('./controller/authController')

const app = express();

// CORS configuration - MUST come before routes
app.use(cors({
  origin: 'http://localhost:5173', // React dev server
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json())

// Session Middleware
app.use(session({  
  name: 'cargolink',
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: false,  
  cookie: { 
    httpOnly: true,
    sameSite: 'lax', // Changed for cross-origin
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24*60*60000
  } 
}));

// // //================= This is only for testing disable later ==================
// app.use((req, res, next) => {
//   if(req.path.startsWith('/transporter')){
//         req.session.user = {
//           id: "681dcf65262faca9bcbc3343", // fill with one local  transporter id
//           role: 'transporter',
//         };
//   }else if(req.path.startsWith('/customer')){
//         req.session.user = {
//           id: "681dcf65262faca9bcbc333d", // fill with one local customer id
//           role: 'customer',
//         };
//   } else { 
//     req.session.admin = {id: "1"};
//     return next();
//   }
//   next();
// });
// // //============================================================================


app.use((req, res, next)=> {
    res.locals.userType = req.session.user?.role;    
    next();
});

// Set up Routes
app.use('/customer', require('./routes/customer'));
app.use('/transporter', require('./routes/transporter'));
app.use('/transporter/assignment', require('./routes/assignment'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat'));
app.use('/static', require('./routes/static'));


// API health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'CargoLink Server',
    version: '1.0.0'
  });
});

// Logout endpoint
app.post('/logout', authController.logout);

// Get current user endpoint
app.get('/api/auth/me', authController.getCurrentUser);

// Start server
app.listen(3000, '0.0.0.0', () => console.log('Server running on http://localhost:3000'));
connectDatabase()