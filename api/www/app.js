import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import notFound from '../middlewares/not-found.js';
import errorHandler from '../middlewares/error-handler.js';
import routes from '../routes/index.js';

const app = express();

// Detrás de Traefik: confiar en el proxy para que el rate-limit vea la IP real del cliente.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

// Límite general amplio (el dashboard hace varias llamadas por pantalla vía el BFF).
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 0, message: 'Demasiadas solicitudes. Probá de nuevo en un momento.' },
}));

// Límite estricto para autenticación: frena fuerza bruta sobre el login.
app.use('/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 0, message: 'Demasiados intentos de inicio de sesión. Esperá unos minutos.' },
}));

// Healthcheck: liviano, sin tocar la base, para monitores y el orquestador.
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'cenit-api', uptime: Math.round(process.uptime()) });
});

app.use('/', routes);

app.use(notFound);      // 404 para rutas desconocidas.
app.use(errorHandler);  // Manejador central de errores: SIEMPRE el último.

export default app;
