import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import groupsRouter from "./routes/groups";
import expensesRouter from "./routes/expenses";
import friendsRouter from "./routes/friends";
import receiptsRouter from "./routes/receipts";
import assistantRouter from "./routes/assistant";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/receipts", receiptsRouter);
app.use("/api/assistant", assistantRouter);

export default app;
