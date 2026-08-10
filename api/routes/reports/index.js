import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    createReportValidation, updateReportValidation, idParamValidation, sendsValidation,
} from '../../validations/reports.validation.js';
import {
    listReports, createReport, updateReport, deleteReport, downloadPdf, sendNow, sends,
    siteAdHocPdf,
} from '../../controllers/reports/reports.controllers.js';

const reports = Router();

reports.use(validateToken);

// Las rutas literales van antes que /:id para que no las capture como id.
reports.get('/sends', validate(sendsValidation), sends);
reports.get('/site/:id/pdf', validate(idParamValidation), siteAdHocPdf);

reports.get('/', listReports);
reports.post('/', validate(createReportValidation), createReport);
reports.get('/:id/pdf', validate(idParamValidation), downloadPdf);
reports.post('/:id/send', validate(idParamValidation), sendNow);
reports.put('/:id', validate(updateReportValidation), updateReport);
reports.delete('/:id', validate(idParamValidation), deleteReport);

export default reports;
