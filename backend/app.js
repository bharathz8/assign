import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { initializeStaticData } from "./config/database.js";
import staticData from './static.json' with { type: 'json' };
import assetRoutes from "./routes/assetRoutes.js";
import authRoutes from "./routes/authroutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/api/", assetRoutes);
app.use("/", authRoutes);
app.use("/api/", fileRoutes);

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

// Initialize static data
initializeStaticData().catch(err => {
  console.error('Error initializing static data:', err);
});

export default app;
