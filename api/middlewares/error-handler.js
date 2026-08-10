import { errorMessage } from '../utils/messages.js';

/**
 * Manejador central de errores. Va registrado como ÚLTIMO middleware (con 4 argumentos,
 * que es como Express reconoce un error handler). Con `express-async-errors` importado en
 * app.js, cualquier throw dentro de un controlador async llega hasta acá en vez de colgar
 * el request.
 *
 * Loguea el detalle del lado del server y devuelve un JSON limpio al cliente, sin filtrar
 * el stack. En producción el mensaje es genérico; en desarrollo se incluye el real.
 */
// eslint-disable-next-line no-unused-vars -- Express identifica el handler por la aridad (4 args).
const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;

    // 5xx son fallas nuestras: se loguean completas. 4xx son del cliente: no ensucian los logs.
    if (status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl} →`, err.stack || err.message);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const message = status >= 500 && isProd
        ? 'Ocurrió un error en el servidor. Ya quedó registrado.'
        : (err.message || 'Error');

    if (res.headersSent) return next(err);
    return res.status(status).json(errorMessage({ message }));
};

export default errorHandler;
