import { body } from 'express-validator';
import messages from '../config/messages.js';

export const callbackValidation = [
    body('code').notEmpty().withMessage(messages.auth.code_required),
    body('state').notEmpty().withMessage(messages.auth.state_invalid),
];
