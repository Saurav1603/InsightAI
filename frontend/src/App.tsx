import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Invoices } from './pages/Invoices';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Expenses } from './pages/Expenses';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Analytics } from './pages/Analytics';
import { Forecasting } from './pages/Forecasting';
import { AIAssistant } from './pages/AIAssistant';
import { Documents } from './pages/Documents';
import { Recommendations } from './pages/Recommendations';
import { DataImport } from './pages/DataImport';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="customers" element={<Customers />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="forecasting" element={<Forecasting />} />
              <Route path="ai" element={<AIAssistant />} />
              <Route path="documents" element={<Documents />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="imports" element={<DataImport />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
