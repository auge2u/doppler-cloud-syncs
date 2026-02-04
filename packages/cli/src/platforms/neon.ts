const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export interface NeonConfig {
  apiKey: string;
  projectId?: string;
  orgId?: string;
}

export interface NeonProject {
  id: string;
  name: string;
  org_id?: string;
  created_at: string;
  default_endpoint_settings: {
    autoscaling_limit_min_cu: number;
    autoscaling_limit_max_cu: number;
  };
}

export interface NeonBranch {
  id: string;
  project_id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  current_state: string;
}

export interface NeonEndpoint {
  id: string;
  host: string;
  branch_id: string;
  project_id: string;
  type: string;
  current_state: string;
}

export interface NeonRole {
  name: string;
  password?: string;
  branch_id: string;
}

export interface NeonDatabase {
  id: number;
  name: string;
  owner_name: string;
  branch_id: string;
}

export interface NeonConnectionInfo {
  host: string;
  database: string;
  role: string;
  password: string;
  connectionString: string;
}

export class NeonClient {
  private apiKey: string;
  private projectId?: string;
  private orgId?: string;

  constructor(options: NeonConfig) {
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.orgId = options.orgId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${NEON_API_BASE}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neon API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  // Project methods
  async listProjects(): Promise<NeonProject[]> {
    const result = await this.request<{ projects: NeonProject[] }>('GET', '/projects');
    return result.projects;
  }

  async getProject(projectId: string): Promise<NeonProject> {
    const result = await this.request<{ project: NeonProject }>('GET', `/projects/${projectId}`);
    return result.project;
  }

  async createProject(name: string, options?: {
    region?: string;
    orgId?: string;
  }): Promise<{ project: NeonProject; connectionUri: string; role: NeonRole }> {
    const body: Record<string, unknown> = {
      project: {
        name,
        region_id: options?.region || 'aws-us-east-2',
      },
    };

    if (options?.orgId || this.orgId) {
      body.project = { ...body.project as object, org_id: options?.orgId || this.orgId };
    }

    const result = await this.request<{
      project: NeonProject;
      connection_uris: Array<{ connection_uri: string }>;
      roles: NeonRole[];
    }>('POST', '/projects', body);

    return {
      project: result.project,
      connectionUri: result.connection_uris[0]?.connection_uri || '',
      role: result.roles[0],
    };
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}`);
  }

  // Branch methods
  async listBranches(projectId?: string): Promise<NeonBranch[]> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ branches: NeonBranch[] }>(
      'GET',
      `/projects/${pid}/branches`
    );
    return result.branches;
  }

  async getBranch(branchId: string, projectId?: string): Promise<NeonBranch> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ branch: NeonBranch }>(
      'GET',
      `/projects/${pid}/branches/${branchId}`
    );
    return result.branch;
  }

  async createBranch(
    name: string,
    options?: {
      projectId?: string;
      parentId?: string;
      endpoint?: boolean;
    }
  ): Promise<{ branch: NeonBranch; endpoints: NeonEndpoint[] }> {
    const pid = options?.projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const body: Record<string, unknown> = {
      branch: { name },
      endpoints: options?.endpoint !== false ? [{ type: 'read_write' }] : [],
    };

    if (options?.parentId) {
      body.branch = { ...body.branch as object, parent_id: options.parentId };
    }

    const result = await this.request<{
      branch: NeonBranch;
      endpoints: NeonEndpoint[];
    }>('POST', `/projects/${pid}/branches`, body);

    return result;
  }

  async deleteBranch(branchId: string, projectId?: string): Promise<void> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    await this.request<void>('DELETE', `/projects/${pid}/branches/${branchId}`);
  }

  async resetBranch(
    branchId: string,
    options?: { projectId?: string; parentId?: string }
  ): Promise<NeonBranch> {
    const pid = options?.projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ branch: NeonBranch }>(
      'POST',
      `/projects/${pid}/branches/${branchId}/reset`,
      options?.parentId ? { parent_id: options.parentId } : {}
    );

    return result.branch;
  }

  // Endpoint methods
  async listEndpoints(projectId?: string): Promise<NeonEndpoint[]> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ endpoints: NeonEndpoint[] }>(
      'GET',
      `/projects/${pid}/endpoints`
    );
    return result.endpoints;
  }

  async getEndpointForBranch(branchId: string, projectId?: string): Promise<NeonEndpoint | null> {
    const endpoints = await this.listEndpoints(projectId);
    return endpoints.find(e => e.branch_id === branchId) || null;
  }

  // Role/password methods
  async getRolePassword(
    branchId: string,
    roleName: string,
    projectId?: string
  ): Promise<string> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ password: string }>(
      'GET',
      `/projects/${pid}/branches/${branchId}/roles/${roleName}/reveal_password`
    );
    return result.password;
  }

  async listRoles(branchId: string, projectId?: string): Promise<NeonRole[]> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ roles: NeonRole[] }>(
      'GET',
      `/projects/${pid}/branches/${branchId}/roles`
    );
    return result.roles;
  }

  // Database methods
  async listDatabases(branchId: string, projectId?: string): Promise<NeonDatabase[]> {
    const pid = projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const result = await this.request<{ databases: NeonDatabase[] }>(
      'GET',
      `/projects/${pid}/branches/${branchId}/databases`
    );
    return result.databases;
  }

  // Connection string helper
  async getConnectionInfo(
    branchId: string,
    options?: {
      projectId?: string;
      database?: string;
      role?: string;
    }
  ): Promise<NeonConnectionInfo> {
    const pid = options?.projectId || this.projectId;
    if (!pid) throw new Error('Project ID required');

    const endpoint = await this.getEndpointForBranch(branchId, pid);
    if (!endpoint) throw new Error(`No endpoint found for branch ${branchId}`);

    const roles = await this.listRoles(branchId, pid);
    const role = options?.role
      ? roles.find(r => r.name === options.role)
      : roles[0];
    if (!role) throw new Error('No role found');

    const databases = await this.listDatabases(branchId, pid);
    const database = options?.database
      ? databases.find(d => d.name === options.database)
      : databases[0];
    if (!database) throw new Error('No database found');

    const password = await this.getRolePassword(branchId, role.name, pid);

    const connectionString = `postgresql://${role.name}:${password}@${endpoint.host}/${database.name}?sslmode=require`;

    return {
      host: endpoint.host,
      database: database.name,
      role: role.name,
      password,
      connectionString,
    };
  }

  // Helper to find branch by name
  async findBranchByName(name: string, projectId?: string): Promise<NeonBranch | null> {
    const branches = await this.listBranches(projectId);
    return branches.find(b => b.name === name) || null;
  }

  // Helper to get main branch
  async getMainBranch(projectId?: string): Promise<NeonBranch> {
    const branches = await this.listBranches(projectId);
    const main = branches.find(b => b.name === 'main' || !b.parent_id);
    if (!main) throw new Error('Main branch not found');
    return main;
  }
}
