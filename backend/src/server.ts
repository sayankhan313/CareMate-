import { app } from "./app.js";
import { env } from "./config/env.js";

const port = Number(env.PORT);

app.listen(port, () => {
  console.log(`CareMate+ backend running on port ${port}`);
});