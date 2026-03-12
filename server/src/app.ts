import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

export default app;
