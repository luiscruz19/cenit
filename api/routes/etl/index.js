import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    runValidation, backfillValidation, runIdValidation,
} from '../../validations/etl.validation.js';
import {
    triggerRun, triggerBackfill, listRuns, getRun,
} from '../../controllers/etl/etl.controllers.js';

const etl = Router();

etl.use(validateToken);

etl.post('/run', validate(runValidation), triggerRun);
etl.post('/backfill', validate(backfillValidation), triggerBackfill);
etl.get('/runs', listRuns);
etl.get('/runs/:id', validate(runIdValidation), getRun);

export default etl;
