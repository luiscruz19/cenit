import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import { callbackValidation } from '../../validations/auth.validation.js';
import { getGoogleUrl, googleCallback, me } from '../../controllers/auth/auth.controllers.js';

const auth = Router();

// Públicos: son el propio flujo de login.
auth.get('/google/url', getGoogleUrl);
auth.post('/google/callback', validate(callbackValidation), googleCallback);

auth.get('/me', validateToken, me);

export default auth;
