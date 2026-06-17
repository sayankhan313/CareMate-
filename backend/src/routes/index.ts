import { Router } from "express";
import healthRoutes from "./health.routes.js";

const apiRoutes = Router();

apiRoutes.use("/health", healthRoutes);

export default apiRoutes;