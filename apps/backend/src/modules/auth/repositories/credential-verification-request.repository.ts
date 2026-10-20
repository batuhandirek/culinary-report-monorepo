import { EntityRepository } from '@mikro-orm/postgresql';

import { CredentialVerificationRequest } from '../entities/credential-verification-request.entity.js';

export class CredentialVerificationRequestRepository extends EntityRepository<CredentialVerificationRequest> {}
