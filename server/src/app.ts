import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);

export default app;
