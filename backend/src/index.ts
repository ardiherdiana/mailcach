import "dotenv/config"
import express from "express"
import cors from "cors"

import authRouter from "./routes/auth"
import authGoogleRouter from "./routes/auth-google"
import authOtpRouter from "./routes/auth-otp"
import meRouter from "./routes/me"
import vouchersRouter from "./routes/vouchers"
import adminUsersRouter from "./routes/admin/users"
import adminVouchersRouter from "./routes/admin/vouchers"
import adminEnvatoSessionRouter from "./routes/admin/envato-session"
import adminTurnitinJobsRouter from "./routes/admin/turnitin-jobs"
import elevenLabsRouter from "./routes/services/elevenlabs"
import envatoRouter from "./routes/services/envato"
import inboxRouter from "./routes/services/inbox"
import inboxInboundRouter from "./routes/inbox-inbound"
import turnitinRouter from "./routes/services/turnitin"

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: "http://localhost:5173", credentials: true }))

app.use("/api/inbox/inbound", express.json({ limit: "10mb" }), inboxInboundRouter)

app.use(express.json())

app.use("/api/auth", authRouter)
app.use("/api/auth", authGoogleRouter)
app.use("/api/auth", authOtpRouter)
app.use("/api/me", meRouter)
app.use("/api/vouchers", vouchersRouter)
app.use("/api/admin/users", adminUsersRouter)
app.use("/api/admin/vouchers", adminVouchersRouter)
app.use("/api/admin/envato-session", adminEnvatoSessionRouter)
app.use("/api/admin/turnitin", adminTurnitinJobsRouter)
app.use("/api/services/elevenlabs", elevenLabsRouter)
app.use("/api/services/envato", envatoRouter)
app.use("/api/services/inbox", inboxRouter)
app.use("/api/services/turnitin", turnitinRouter)

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

app.listen(PORT, () => console.log(`Backend berjalan di http://localhost:${PORT}`))
