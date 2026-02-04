import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NeonClient } from '../../src/platforms/neon.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NeonClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should fetch projects from Neon API', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'test-project', created_at: '2024-01-01' },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ projects: mockProjects }),
      });

      const client = new NeonClient({ apiKey: 'test-key' });
      const projects = await client.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.neon.tech/api/v2/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
      expect(projects).toEqual(mockProjects);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const mockResult = {
        project: { id: 'proj-new', name: 'new-project' },
        connection_uris: [{ connection_uri: 'postgresql://...' }],
        roles: [{ name: 'admin', password: 'secret' }],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const client = new NeonClient({ apiKey: 'test-key' });
      const result = await client.createProject('new-project');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.neon.tech/api/v2/projects',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('new-project'),
        })
      );
      expect(result.project.name).toBe('new-project');
      expect(result.connectionUri).toBe('postgresql://...');
    });
  });

  describe('listBranches', () => {
    it('should fetch branches for a project', async () => {
      const mockBranches = [
        { id: 'br-main', name: 'main', project_id: 'proj-1' },
        { id: 'br-dev', name: 'dev', project_id: 'proj-1' },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ branches: mockBranches }),
      });

      const client = new NeonClient({ apiKey: 'test-key', projectId: 'proj-1' });
      const branches = await client.listBranches();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.neon.tech/api/v2/projects/proj-1/branches',
        expect.any(Object)
      );
      expect(branches).toHaveLength(2);
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      const mockResult = {
        branch: { id: 'br-new', name: 'feature-branch', project_id: 'proj-1' },
        endpoints: [{ id: 'ep-1', host: 'ep-xyz.neon.tech' }],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const client = new NeonClient({ apiKey: 'test-key', projectId: 'proj-1' });
      const result = await client.createBranch('feature-branch');

      expect(result.branch.name).toBe('feature-branch');
      expect(result.endpoints).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const client = new NeonClient({ apiKey: 'bad-key' });

      await expect(client.listProjects()).rejects.toThrow('Neon API error (401)');
    });
  });
});
