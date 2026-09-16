// Modified for standalone community distribution; see NOTICE.
import type {
  AgentGenerationProject,
  AgentGenerationProjectPersistedState,
} from "@/types/agent";
import { apiFetch } from "@/src/client/api";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const AGENT_PROJECT_REQUEST_TIMEOUT_MS = 15_000;

async function fetchAgentProjectApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    AGENT_PROJECT_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await apiFetch(input, {
      ...init,
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function getAgentProjectRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `${fallback}：请求超时`;
  }
  return fallback;
}

export const agentProjectService = {
  async getProjects(): Promise<ApiResponse<AgentGenerationProject[]>> {
    try {
      return await fetchAgentProjectApi<AgentGenerationProject[]>(
        "/api/agent-projects",
        { cache: "no-store" }
      );
    } catch (error) {
      return {
        success: false,
        error: getAgentProjectRequestErrorMessage(
          error,
          "获取生图项目列表失败"
        ),
      };
    }
  },

  async getProject(id: string): Promise<ApiResponse<AgentGenerationProject>> {
    try {
      return await fetchAgentProjectApi<AgentGenerationProject>(
        `/api/agent-projects/${id}`,
        { cache: "no-store" }
      );
    } catch (error) {
      return {
        success: false,
        error: getAgentProjectRequestErrorMessage(error, "获取生图项目失败"),
      };
    }
  },

  async createProject(payload: {
    title?: string;
    description?: string | null;
    thumbnail?: string | null;
    projectState?: AgentGenerationProjectPersistedState;
  }): Promise<ApiResponse<AgentGenerationProject>> {
    try {
      return await fetchAgentProjectApi<AgentGenerationProject>(
        "/api/agent-projects",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      return {
        success: false,
        error: getAgentProjectRequestErrorMessage(error, "创建生图项目失败"),
      };
    }
  },

  async updateProject(
    id: string,
    payload: {
      title?: string;
      description?: string | null;
      thumbnail?: string | null;
      projectState?: AgentGenerationProjectPersistedState;
    }
  ): Promise<ApiResponse<AgentGenerationProject>> {
    try {
      return await fetchAgentProjectApi<AgentGenerationProject>(
        `/api/agent-projects/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      return {
        success: false,
        error: getAgentProjectRequestErrorMessage(error, "保存生图项目失败"),
      };
    }
  },

  async deleteProject(id: string): Promise<ApiResponse> {
    try {
      return await fetchAgentProjectApi(`/api/agent-projects/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      return {
        success: false,
        error: getAgentProjectRequestErrorMessage(error, "删除生图项目失败"),
      };
    }
  },
};
