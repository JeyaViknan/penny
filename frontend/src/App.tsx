import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth, RequireRole } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/ui/Toast'
import { AccountDetailPage } from './pages/AccountDetailPage'
import { AccountsPage } from './pages/AccountsPage'
import { ActivityPage } from './pages/ActivityPage'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PeoplePage } from './pages/PeoplePage'
import { TransferDetailPage } from './pages/TransferDetailPage'
import { TransferPage } from './pages/TransferPage'
import { ThemeProvider } from './theme/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/transfers/:id" element={<TransferDetailPage />} />
              <Route
                path="/transfer"
                element={
                  <RequireRole roles={['CUSTOMER', 'TELLER', 'ADMIN']}>
                    <TransferPage />
                  </RequireRole>
                }
              />
              <Route
                path="/people"
                element={
                  <RequireRole roles={['ADMIN', 'AUDITOR']}>
                    <PeoplePage />
                  </RequireRole>
                }
              />
              <Route
                path="/audit"
                element={
                  <RequireRole roles={['AUDITOR', 'ADMIN']}>
                    <AuditPage />
                  </RequireRole>
                }
              />
              {/* A real 404 rather than a silent redirect home -- bouncing the
                  user without explanation makes a mistyped URL look like the
                  app losing their place. */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
