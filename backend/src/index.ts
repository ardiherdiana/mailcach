import "dotenv/config"
import express from "express"
import cors from "cors"

import authRouter from "./routes/auth"
import meRouter from "./routes/me"
import vouchersRouter from "./routes/vouchers"
import adminUsersRouter from "./routes/admin/users"
import adminVouchersRouter from "./routes/admin/vouchers"
import adminEnvatoSessionRouter from "./routes/admin/envato-session"
import elevenLabsRouter from "./routes/services/elevenlabs"
import envatoRouter from "./routes/services/envato"
import inboxRouter from "./routes/services/inbox"
import inboxInboundRouter from "./routes/inbox-inbound"

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: "http://localhost:5173", credentials: true }))

// Inbound harus didaftarkan sebelum global express.json() agar limit-nya tidak kalah
app.use("/api/inbox/inbound", express.json({ limit: "10mb" }), inboxInboundRouter)

app.use(express.json())

app.use("/api/auth", authRouter)
app.use("/api/me", meRouter)
app.use("/api/vouchers", vouchersRouter)
app.use("/api/admin/users", adminUsersRouter)
app.use("/api/admin/vouchers", adminVouchersRouter)
app.use("/api/admin/envato-session", adminEnvatoSessionRouter)
app.use("/api/services/elevenlabs", elevenLabsRouter)
app.use("/api/services/envato", envatoRouter)
app.use("/api/services/inbox", inboxRouter)


app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

app.listen(PORT, () => console.log(`Backend berjalan di http://localhost:${PORT}`))
