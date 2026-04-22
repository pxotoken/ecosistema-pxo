import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { submitKycSchema, reviewKycSchema } from '@pxo/shared/schemas/kyc';
import {
  KycRepository,
  UserKycStatusRepository,
  type KycDocument,
  type KycPersonalInfo,
  type KycSubmissionStatus,
} from '../lib/kyc-repository.js';
import { requireAdmin, requireCaller } from '../middleware/identity.js';

interface SubmitBody {
  documents: KycDocument[];
  personalInfo: KycPersonalInfo;
}

interface ReviewBody {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export function kycRoutes(
  submissions: KycRepository,
  userStatus: UserKycStatusRepository,
): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    // --- User-facing endpoints ---
    app.get('/status', { preHandler: requireCaller }, async (req, reply) => {
      const userId = await userStatus.getIdByWalletAddress(req.caller!.walletAddress);
      if (!userId) return reply.code(404).send({ error: 'User not found' });

      const latest = await submissions.getLatestByUserId(userId);
      return reply.send({
        submission: latest,
        status: latest?.status ?? 'not_started',
      });
    });

    app.post<{ Body: SubmitBody }>('/submit', { preHandler: requireCaller }, async (req, reply) => {
      const { error, value } = submitKycSchema.validate(req.body);
      if (error) {
        return reply.code(400).send({
          error: 'Invalid request data',
          details: error.details.map((d) => d.message),
        });
      }

      const userId = await userStatus.getIdByWalletAddress(req.caller!.walletAddress);
      if (!userId) return reply.code(404).send({ error: 'User not found' });

      const existing = await submissions.getLatestByUserId(userId);
      if (existing && existing.status === 'pending_review') {
        return reply.code(409).send({
          error: 'A submission is already pending review',
          submissionId: existing.id,
        });
      }
      if (existing && existing.status === 'approved') {
        return reply.code(409).send({ error: 'KYC already approved' });
      }

      const body = value as SubmitBody;
      const created = await submissions.create({
        user_id: userId,
        documents: body.documents,
        personal_info: body.personalInfo,
      });

      await userStatus.setStatus(userId, 'VALIDATING');
      return reply.code(201).send({ submission: created });
    });

    // --- Admin endpoints ---
    app.get<{ Querystring: { status?: KycSubmissionStatus } }>(
      '/submissions',
      { preHandler: requireAdmin },
      async (req, reply) => {
        const status = (req.query.status ?? 'pending_review') as KycSubmissionStatus;
        const list = await submissions.listByStatus(status);
        return reply.send({ submissions: list });
      },
    );

    app.post<{ Params: { id: string }; Body: ReviewBody }>(
      '/submissions/:id/review',
      { preHandler: requireAdmin },
      async (req, reply) => {
        const { error, value } = reviewKycSchema.validate(req.body);
        if (error) {
          return reply.code(400).send({
            error: 'Invalid request data',
            details: error.details.map((d) => d.message),
          });
        }

        const submission = await submissions.getById(req.params.id);
        if (!submission) return reply.code(404).send({ error: 'Submission not found' });
        if (submission.status !== 'pending_review') {
          return reply.code(409).send({
            error: `Submission is ${submission.status}, cannot review`,
          });
        }

        const reviewerId = await userStatus.getIdByWalletAddress(req.caller!.walletAddress);
        if (!reviewerId) return reply.code(403).send({ error: 'Reviewer not registered' });

        const body = value as ReviewBody;
        const decision = body.action === 'approve' ? 'approved' : 'rejected';
        const updated = await submissions.review(
          req.params.id,
          reviewerId,
          decision,
          body.rejectionReason,
        );

        await userStatus.setStatus(
          submission.user_id,
          decision === 'approved' ? 'VALIDATED' : 'REJECTED',
        );

        return reply.send({ submission: updated });
      },
    );
  };
}
