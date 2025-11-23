import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Driver from '../models/Driver.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'los-pollos-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Admin credentials (in production, store in database)
const ADMIN_CREDENTIALS = {
  id: 'admin-001',
  email: 'admin@lospollos.com',
  password: '$2b$10$A7O1qE4aG7gNByOds.sQ9.Jwy5hXRJDXEgF1zi.AcH5mrZyYr7YqC', // bcrypt hash of 'admin123'
  name: 'Gus Fring',
  role: 'admin'
};

// Register new driver
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, licenseNumber, password, vehicleDetails } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ 
      $or: [{ email }, { licenseNumber }] 
    });

    if (existingDriver) {
      return res.status(400).json({ 
        message: 'Driver with this email or license number already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create driver
    const driver = new Driver({
      name,
      email,
      phone,
      licenseNumber,
      password: hashedPassword,
      vehicleDetails,
      status: 'active'
    });

    await driver.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: driver._id.toString(), 
        email: driver.email, 
        role: 'driver' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: driver._id.toString(),
        name: driver.name,
        email: driver.email,
        role: 'driver'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating driver', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin
    if (email === ADMIN_CREDENTIALS.email) {
      const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token for admin
      const token = jwt.sign(
        { 
          id: ADMIN_CREDENTIALS.id, 
          email: ADMIN_CREDENTIALS.email, 
          role: 'admin' 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        token,
        user: {
          id: ADMIN_CREDENTIALS.id,
          name: ADMIN_CREDENTIALS.name,
          email: ADMIN_CREDENTIALS.email,
          role: ADMIN_CREDENTIALS.role
        }
      });
    }

    // Check if driver
    const driver = await Driver.findOne({ email });
    
    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: driver._id.toString(), 
        email: driver.email, 
        role: 'driver' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: driver._id.toString(),
        name: driver.name,
        email: driver.email,
        role: 'driver'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if admin
    if (decoded.role === 'admin') {
      return res.json({
        user: {
          id: ADMIN_CREDENTIALS.id,
          name: ADMIN_CREDENTIALS.name,
          email: ADMIN_CREDENTIALS.email,
          role: 'admin'
        }
      });
    }

    // Get driver details
    const driver = await Driver.findById(decoded.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: driver._id.toString(),
        name: driver.name,
        email: driver.email,
        role: 'driver'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout (client-side only, just for consistency)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
