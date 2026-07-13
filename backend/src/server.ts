import { app } from "./app.js";
import { env } from "./config/env.js";

const port = Number(env.PORT) || 5001;

app.listen(port, "0.0.0.0", () => {
  console.log(`CareMate+ backend running on http://0.0.0.0:${port}`);
});