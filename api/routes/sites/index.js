import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    createSiteValidation, updateSiteValidation, idParamValidation, mappingValidation,
} from '../../validations/site.validation.js';
import {
    listSites, createSite, updateSite, deleteSite, discovery, applyMapping,
} from '../../controllers/sites/sites.controllers.js';

const sites = Router();

sites.use(validateToken);

sites.get('/', listSites);
sites.get('/discovery', discovery);
sites.post('/mapping', validate(mappingValidation), applyMapping);
sites.post('/', validate(createSiteValidation), createSite);
sites.put('/:id', validate(updateSiteValidation), updateSite);
sites.delete('/:id', validate(idParamValidation), deleteSite);

export default sites;
