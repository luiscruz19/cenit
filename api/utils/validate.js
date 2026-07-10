import { validationResult } from 'express-validator';
import { errorMessage } from './messages.js';

/**
 * Envuelve un array de validaciones de express-validator y corta con 400
 * en el primer error.
 */
export const validate = (validations) => [
    ...validations,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errorMessage({ message: errors.array()[0].msg }));
        }
        next();
    },
];
