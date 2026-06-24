import { Router } from "express";

import healthRoutes from "./health.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js"

const apiRoutes = Router();

apiRoutes.use("/health", healthRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/users", userRoutes);

export default apiRoutes;