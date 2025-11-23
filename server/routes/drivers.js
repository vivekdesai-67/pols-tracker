import express from 'express';
import Driver from '../models/Driver.js';

const router = express.Router();

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error });
  }
});

// Get driver by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver', error });
  }
});

// Get driver by email (for login)
router.get('/email/:email', async (req, res) => {
  try {
    const driver = await Driver.findOne({ email: req.params.email });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver', error });
  }
});

// Get available drivers
router.get('/status/available', async (req, res) => {
  try {
    const drivers = await Driver.find({ status: 'available' });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching available drivers', error });
  }
});

// Create new driver
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, licenseNumber, vehicleDetails, password } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ 
      $or: [{ email }, { licenseNumber }] 
    });

    if (existingDriver) {
      return res.status(400).json({ 
        message: 'Driver with this email or license number already exists' 
      });
    }

    // Import bcrypt for password hashing
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password || 'driver123', 10);

    const driver = new Driver({
      name,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      vehicleDetails,
      status: 'active'
    });

    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Error creating driver', error: error.message });
  }
});

// Update driver status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, vehicleId } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status, vehicleId, lastActiveDate: Date.now() },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver status', error });
  }
});

// Add active job to driver
router.post('/:id/jobs/active', async (req, res) => {
  try {
    const { jobId, title, pickupTime, deliveryTime } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.activeJobs.push({
      jobId,
      title,
      pickupTime,
      deliveryTime,
      status: 'assigned',
      startedAt: Date.now()
    });

    driver.status = 'on-duty';
    await driver.save();
    
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error adding active job', error });
  }
});

// Complete job and add to history
router.post('/:id/jobs/complete', async (req, res) => {
  try {
    const { 
      jobId, title, description, pickupAddress, deliveryAddress,
      cargoType, distance, duration, payment, rating 
    } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Add to completed jobs
    driver.completedJobs.push({
      jobId,
      title,
      description,
      pickupAddress,
      deliveryAddress,
      cargoType,
      distance,
      duration,
      payment,
      rating,
      completedDate: Date.now(),
      status: 'completed'
    });

    // Add to earnings history
    driver.earningsHistory.push({
      id: `earning-${Date.now()}`,
      jobId,
      date: Date.now(),
      totalEarnings: payment,
      basePayment: payment,
      bonus: 0,
      deductions: 0,
      paymentStatus: 'pending'
    });

    // Update metrics
    driver.totalDeliveries += 1;
    driver.totalEarnings += payment;
    driver.currentMonthEarnings += payment;
    driver.pendingEarnings += payment;
    driver.totalDistanceCovered += distance || 0;

    // Remove from active jobs
    driver.activeJobs = driver.activeJobs.filter(job => job.jobId !== jobId);
    
    // Update status if no more active jobs
    if (driver.activeJobs.length === 0) {
      driver.status = 'active';
    }

    await driver.save();
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error completing job', error });
  }
});

// Update earnings payment status
router.patch('/:id/earnings/:earningId/payment', async (req, res) => {
  try {
    const { paymentStatus, transactionId, paymentMethod } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const earning = driver.earningsHistory.id(req.params.earningId);
    if (!earning) {
      return res.status(404).json({ message: 'Earning record not found' });
    }

    earning.paymentStatus = paymentStatus;
    if (transactionId) earning.transactionId = transactionId;
    if (paymentMethod) earning.paymentMethod = paymentMethod;

    // Update pending earnings if paid
    if (paymentStatus === 'paid') {
      driver.pendingEarnings -= earning.totalEarnings;
    }

    await driver.save();
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error });
  }
});

// Update vehicle details
router.patch('/:id/vehicle', async (req, res) => {
  try {
    const vehicleDetails = req.body;
    
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { vehicleDetails },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating vehicle details', error });
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting driver', error });
  }
});

export default router;
