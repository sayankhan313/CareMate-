import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import apiRoutes from "./routes/index.js";
import { env } from "./config/env.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/v1", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);