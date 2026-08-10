import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    createRuleValidation, updateRuleValidation, idParamValidation, eventsValidation,
} from '../../validations/alerts.validation.js';
import {
    schema, listRules, createRule, updateRule, deleteRule, run, events, testMail,
} from '../../controllers/alerts/alerts.controllers.js';

const alerts = Router();

alerts.use(validateToken);

alerts.get('/schema', schema);
alerts.get('/events', validate(eventsValidation), events);
alerts.post('/run', run);
alerts.post('/test-mail', testMail);

alerts.get('/rules', listRules);
alerts.post('/rules', validate(createRuleValidation), createRule);
alerts.put('/rules/:id', validate(updateRuleValidation), updateRule);
alerts.delete('/rules/:id', validate(idParamValidation), deleteRule);

export default alerts;
