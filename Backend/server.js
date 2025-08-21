const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Load .env and verify
dotenv.config();
console.log('Environment Variables Loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGODB_URL);
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '****' : undefined);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const mongoURI = process.env.MONGODB_URL || "mongodb+srv://rccinfra:ig56bTkYcqqnX0as@cluster0.e8ky0uo.mongodb.net/attendance?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  connectTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err.message, err.stack));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload image to Cloudinary
async function uploadToCloudinary(base64Image, fileName) {
  try {
    console.log('Uploading file to Cloudinary:', fileName);
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      public_id: fileName,
      folder: 'AttendanceImages',
    });
    console.log('File uploaded to Cloudinary, URL:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error.message, error.stack);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
}

// Define Attendance Schema
const attendanceSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  email: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  empCode: { type: String, required: true, trim: true },
  site: { type: String, required: true, trim: true },
  entryType: { type: String, required: true, trim: true, enum: ['In', 'Out'] },
  workShift: { type: String, required: true, trim: true },
  locationName: { type: String, required: true, trim: true },
  imageUrl: { type: String },
}, { collection: 'EmployeeData' });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// POST endpoint to handle attendance form submission
app.post('/api/attendance', async (req, res) => {
  try {
    const {
      email,
      name,
      empCode,
      site,
      entryType,
      workShift,
      locationName,
      image,
    } = req.body;

    console.log('Received attendance data:', { email, name, empCode, site, entryType, workShift, locationName });

    // Validate required fields
    if (!email || !name || !empCode || !site || !entryType || !workShift || !locationName) {
      console.error('Missing required fields:', { email, name, empCode, site, entryType, workShift, locationName });
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    let imageUrl = null;
    if (image) {
      const fileName = `attendance_${email}_${Date.now()}`;
      imageUrl = await uploadToCloudinary(image, fileName);
    }

    const attendanceRecord = new Attendance({
      email,
      name,
      empCode,
      site,
      entryType,
      workShift,
      locationName,
      imageUrl,
    });

    console.log('Saving attendance record:', attendanceRecord);
    await attendanceRecord.save();
    console.log('Attendance record saved to MongoDB');

    res.status(200).json({ result: 'success', message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Error processing attendance:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET endpoint to retrieve attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const { email } = req.query;
    console.log('Fetching attendance records for email:', email);
    const query = email ? { email } : {};

    // If email is provided, filter records for the current day
    if (email) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      query.timestamp = {
        $gte: today,
        $lt: tomorrow,
      };
    }

    console.log('Querying MongoDB with:', query);
    const records = await Attendance.find(query);
    console.log('Retrieved records:', records);
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Health check endpoint to verify MongoDB connection
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'ok', message: 'MongoDB connection is healthy' });
  } catch (error) {
    console.error('Health check failed:', error.message, error.stack);
    res.status(500).json({ status: 'error', message: 'MongoDB connection failed', details: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});