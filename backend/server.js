import app from "./app.js";
if (!process.env.JWT_SECRET) throw new Error("Set JWT_SECRET before starting the backend");
app.listen(process.env.PORT || 5000, () => console.log("CrowdMind API: http://localhost:" + (process.env.PORT || 5000)));
