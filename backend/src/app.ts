import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

// Import routes (will create these next)
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import categoryRoutes from './routes/category.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import assistantRoutes from './routes/assistant.routes';

const app: Application = express();

// Behind Render's (or any) proxy: use the real client IP for rate limiting and secure cookies
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

// FRONTEND_URL may list several origins, comma-separated (e.g. production + preview URLs)
const allowedOrigins = config.frontendUrl.split(',').map((origin) => origin.trim().replace(/\/$/, ''));

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// Body parsing - webhook route needs raw body
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
const apiPrefix = `/api/${config.apiVersion}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/cart`, cartRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/categories`, categoryRoutes);
app.use(`${apiPrefix}/webhooks`, webhookRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/uploads`, uploadRoutes);
app.use(`${apiPrefix}/assistant`, assistantRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
