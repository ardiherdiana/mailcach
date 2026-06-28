import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/contexts/auth-context"
import { CreditProvider } from "@/contexts/credit-context"
import ProtectedRoute from "@/components/protected-route"
import AdminRoute from "@/components/admin-route"
import LoginPage from "@/pages/login"
import RegisterPage from "@/pages/register"
import DashboardLayout from "@/pages/dashboard-layout"
import DashboardPage from "@/pages/dashboard"
import GeneratePage from "@/pages/generate"
import DownloaderPage from "@/pages/downloader"
import HistoryPage from "@/pages/history"
import TopUpPage from "@/pages/topup"
import AdminUsersPage from "@/pages/admin/users"
import AdminVouchersPage from "@/pages/admin/vouchers"
import AdminEnvatoSessionPage from "@/pages/admin/envato-session"
import InboxPage from "@/pages/inbox"

export default function App() {
  return (
    <AuthProvider>
      <CreditProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="generate" element={<GeneratePage />} />
              <Route path="envato" element={<DownloaderPage serviceId="envato" />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="topup" element={<TopUpPage />} />
              <Route
                path="admin/users"
                element={<AdminRoute><AdminUsersPage /></AdminRoute>}
              />
              <Route
                path="admin/vouchers"
                element={<AdminRoute><AdminVouchersPage /></AdminRoute>}
              />
              <Route
                path="admin/envato-session"
                element={<AdminRoute><AdminEnvatoSessionPage /></AdminRoute>}
              />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CreditProvider>
    </AuthProvider>
  )
}
