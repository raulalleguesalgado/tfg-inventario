// app.js — CORRECCIÓN MÍNIMA aplicada:
// 1. Convertido a ES Modules (import/export) para unificar con el resto del proyecto (Patrón 1)
// 2. Rutas registradas — el LLM generó app.js sin importar ninguna route (Patrón 8)
// El resto del fichero es el output original del prompt 01.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import productRoutes from './routes/product.routes.js';
import movementRoutes from './routes/movement.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/products', productRoutes);
app.use('/movements', movementRoutes);
app.use('/users', userRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
