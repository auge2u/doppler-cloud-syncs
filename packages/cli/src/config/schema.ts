import { z } from 'zod';

export const platformConfigSchema = z.object({
  neon: z.object({
    project_id: z.string().optional(),
    branch_mapping: z.record(z.string()).optional(),
  }).optional(),
  firebase: z.object({
    project_id: z.string(),
  }).optional(),
  cloudflare: z.object({
    account_id: z.string(),
    worker: z.string().optional(),
  }).optional(),
  gcp: z.object({
    project_id: z.string(),
    region: z.string().optional(),
  }).optional(),
});

export const syncTriggerSchema = z.object({
  type: z.enum(['git-hook', 'webhook']),
  branch: z.string().optional(),
  target: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

export const dcsConfigSchema = z.object({
  project: z.string(),
  doppler: z.object({
    project: z.string(),
    configs: z.record(z.string()),
  }),
  platforms: platformConfigSchema,
  sync: z.object({
    triggers: z.array(syncTriggerSchema).optional(),
  }).optional(),
});

export type DcsConfig = z.infer<typeof dcsConfigSchema>;
export type PlatformConfig = z.infer<typeof platformConfigSchema>;
