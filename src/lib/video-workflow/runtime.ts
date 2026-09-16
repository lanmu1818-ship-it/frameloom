// Modified for standalone community distribution; see NOTICE.
import type { VideoGenerationMode } from "@/types/ai";
import type {
  CanvasEdge,
  CanvasNode,
  ImageNodeData,
  TextNodeData,
  VideoNodeData,
  WorkflowNodeData,
} from "@/types/canvas/index";

export type WorkflowMediaKind = "image" | "video";

export interface WorkflowMediaReference {
  nodeId: string;
  kind: WorkflowMediaKind;
  url: string;
  title?: string;
  prompt?: string;
  source: "node" | "workflow-result" | "workflow-preview";
}

export interface WorkflowStoryboardShot {
  index: number;
  sourceNodeId: string;
  title: string;
  description: string;
  prompt: string;
}

export interface WorkflowCharacterRecord {
  sourceNodeId: string;
  name: string;
  description: string;
  prompt: string;
  look?: string;
  wardrobe?: string;
  signatureAction?: string;
  traits: string[];
}

export interface WorkflowSceneRecord {
  sourceNodeId: string;
  name: string;
  description: string;
  prompt: string;
  mood?: string;
  lighting?: string;
  props: string[];
}

export interface WorkflowAssetRecord {
  sourceNodeId: string;
  kind: "character" | "scene";
  name: string;
  description: string;
  prompt: string;
}

export interface WorkflowStructuredData {
  characters: WorkflowCharacterRecord[];
  scenes: WorkflowSceneRecord[];
  characterAssets: WorkflowAssetRecord[];
  sceneAssets: WorkflowAssetRecord[];
  relationships: string[];
  recommendedNextSteps: string[];
  agentPlan: string[];
  deliverables: string[];
  recommendedNodes: string[];
}

export interface WorkflowGraphContext {
  nodeMap: Map<string, CanvasNode>;
  incoming: Map<string, string[]>;
  outgoing: Map<string, string[]>;
}

function appendEdge(map: Map<string, string[]>, key: string, value: string) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((item) => String(item || "").trim()).filter(Boolean))
  );
}

function normalizeHttpUrl(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return /^https?:\/\//i.test(normalized) ? normalized : "";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractStructuredPromptTexts(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .flatMap((item) => {
      const raw = asRecord(item);
      const traits = Array.isArray(raw.traits)
        ? raw.traits.map((trait) => String(trait || "").trim()).filter(Boolean)
        : [];
      const props = Array.isArray(raw.props)
        ? raw.props.map((prop) => String(prop || "").trim()).filter(Boolean)
        : [];
      return [
        raw.name,
        raw.title,
        raw.description,
        raw.prompt,
        raw.look,
        raw.wardrobe,
        raw.signatureAction,
        raw.mood,
        raw.lighting,
        traits.join("、"),
        props.join("、"),
      ];
    })
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function extractWorkflowPromptCandidates(node: CanvasNode) {
  if (node.type === "text") {
    const data = node.data as TextNodeData;
    return [data.content];
  }

  if (node.type === "image") {
    const data = node.data as ImageNodeData;
    return [data.prompt, data.title, data.note];
  }

  if (node.type === "video") {
    const data = node.data as VideoNodeData;
    return [data.prompt];
  }

  if (node.type === "workflow") {
    const data = node.data as WorkflowNodeData;
    const metadata = (data.metadata || {}) as Record<string, unknown>;
    const storyboardShots = Array.isArray(metadata.storyboardShots)
      ? metadata.storyboardShots
      : [];
    const entityTexts = [
      ...extractStructuredPromptTexts(metadata.characters),
      ...extractStructuredPromptTexts(metadata.scenes),
      ...extractStructuredPromptTexts(metadata.characterAssets),
      ...extractStructuredPromptTexts(metadata.sceneAssets),
      ...(Array.isArray(metadata.agentPlan)
        ? metadata.agentPlan.map((item) => String(item || "").trim()).filter(Boolean)
        : []),
      ...(Array.isArray(metadata.recommendedNextSteps)
        ? metadata.recommendedNextSteps
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : []),
    ];
    const storyboardTexts = storyboardShots
      .map((item) => {
        const raw = (item || {}) as Record<string, unknown>;
        return [raw.title, raw.description].map((value) => String(value || "").trim()).filter(Boolean).join(" - ");
      })
      .filter(Boolean);

    return [
      String(metadata.sourcePrompt || ""),
      data.summary || "",
      data.description || "",
      data.title || "",
      ...storyboardTexts,
      ...entityTexts,
    ];
  }

  return [];
}

function extractWorkflowMedia(node: CanvasNode): WorkflowMediaReference[] {
  if (node.type === "image") {
    const data = node.data as ImageNodeData;
    const url = normalizeHttpUrl(data.src);
    return url
      ? [
          {
            nodeId: node.id,
            kind: "image",
            url,
            title: data.title,
            prompt: data.prompt,
            source: "node",
          },
        ]
      : [];
  }

  if (node.type === "video") {
    const data = node.data as VideoNodeData;
    const url = normalizeHttpUrl(data.src);
    const posterUrl = normalizeHttpUrl(
      data.coverImage ||
        data.thumbnail ||
        String(data.metadata?.coverUrl || data.metadata?.posterUrl || data.metadata?.lastFrameUrl || "")
    );
    const items: WorkflowMediaReference[] = [];

    if (url) {
      items.push({
        nodeId: node.id,
        kind: "video",
        url,
        prompt: data.prompt,
        source: "node",
      });
    }

    if (posterUrl) {
      items.push({
        nodeId: node.id,
        kind: "image",
        url: posterUrl,
        title: "视频封面",
        prompt: data.prompt,
        source: "node",
      });
    }

    return items;
  }

  if (node.type !== "workflow") {
    return [];
  }

  const data = node.data as WorkflowNodeData;
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  const resultUrl = normalizeHttpUrl(String(metadata.resultMediaUrl || ""));
  const previewUrl = normalizeHttpUrl(String(metadata.previewMediaUrl || ""));
  const resultPosterUrl = normalizeHttpUrl(String(metadata.resultPosterUrl || ""));
  const resultKind =
    String(metadata.resultMediaKind || "").trim() === "video" ? "video" : "image";
  const previewKind =
    String(metadata.previewMediaKind || "").trim() === "video" ? "video" : "image";
  const title = String(metadata.resultMediaTitle || data.title || "").trim() || undefined;
  const prompt = String(metadata.sourcePrompt || data.summary || data.description || "").trim() || undefined;
  const items: WorkflowMediaReference[] = [];

  if (resultUrl) {
    items.push({
      nodeId: node.id,
      kind: resultKind,
      url: resultUrl,
      title,
      prompt,
      source: "workflow-result",
    });
  }

  if (resultPosterUrl) {
    items.push({
      nodeId: node.id,
      kind: "image",
      url: resultPosterUrl,
      title:
        String(metadata.resultPosterTitle || `${data.title || "视频结果"}-封面`).trim() ||
        undefined,
      prompt,
      source: "workflow-preview",
    });
  }

  if (previewUrl && previewUrl !== resultUrl) {
    items.push({
      nodeId: node.id,
      kind: previewKind,
      url: previewUrl,
      title:
        String(metadata.previewMediaTitle || data.title || "").trim() || undefined,
      prompt,
      source: "workflow-preview",
    });
  }

  return items;
}

function normalizeTextList(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, limit)
    )
  );
}

function normalizeCharacterRecord(
  value: unknown,
  sourceNodeId: string
): WorkflowCharacterRecord | null {
  const raw = asRecord(value);
  const name = String(raw.name || raw.title || "").trim();
  const description = String(raw.description || raw.summary || "").trim();
  const prompt = uniqueStrings([
    String(raw.prompt || "").trim(),
    name,
    description,
    String(raw.look || "").trim(),
    String(raw.wardrobe || "").trim(),
    String(raw.signatureAction || "").trim(),
    normalizeTextList(raw.traits, 6).join("、"),
  ]).join("\n");

  if (!name && !description && !prompt) {
    return null;
  }

  return {
    sourceNodeId,
    name: name || "未命名角色",
    description,
    prompt,
    look: String(raw.look || "").trim() || undefined,
    wardrobe: String(raw.wardrobe || "").trim() || undefined,
    signatureAction: String(raw.signatureAction || "").trim() || undefined,
    traits: normalizeTextList(raw.traits, 6),
  };
}

function normalizeSceneRecord(
  value: unknown,
  sourceNodeId: string
): WorkflowSceneRecord | null {
  const raw = asRecord(value);
  const name = String(raw.name || raw.title || "").trim();
  const description = String(raw.description || raw.summary || "").trim();
  const prompt = uniqueStrings([
    String(raw.prompt || "").trim(),
    name,
    description,
    String(raw.mood || "").trim(),
    String(raw.lighting || "").trim(),
    normalizeTextList(raw.props, 6).join("、"),
  ]).join("\n");

  if (!name && !description && !prompt) {
    return null;
  }

  return {
    sourceNodeId,
    name: name || "未命名场景",
    description,
    prompt,
    mood: String(raw.mood || "").trim() || undefined,
    lighting: String(raw.lighting || "").trim() || undefined,
    props: normalizeTextList(raw.props, 6),
  };
}

function normalizeAssetRecord(
  value: unknown,
  sourceNodeId: string,
  kind: "character" | "scene"
): WorkflowAssetRecord | null {
  const raw = asRecord(value);
  const name = String(raw.name || raw.title || "").trim();
  const description = String(raw.description || raw.summary || "").trim();
  const prompt = uniqueStrings([
    String(raw.prompt || "").trim(),
    name,
    description,
  ]).join("\n");

  if (!name && !description && !prompt) {
    return null;
  }

  return {
    sourceNodeId,
    kind,
    name: name || (kind === "character" ? "角色资产" : "场景资产"),
    description,
    prompt,
  };
}

function normalizeStoryboardShot(
  raw: unknown,
  index: number,
  sourceNodeId: string
): WorkflowStoryboardShot | null {
  const item = (raw || {}) as Record<string, unknown>;
  const title = String(item.title || `镜头 ${index + 1}`).trim();
  const description = String(item.description || "").trim();
  const prompt = uniqueStrings([title, description]).join("\n");

  if (!title && !description) {
    return null;
  }

  return {
    index,
    sourceNodeId,
    title: title || `镜头 ${index + 1}`,
    description,
    prompt,
  };
}

function extractWorkflowStoryboardShots(node: CanvasNode): WorkflowStoryboardShot[] {
  if (node.type !== "workflow") {
    return [];
  }

  const data = node.data as WorkflowNodeData;
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  const storyboardShots = Array.isArray(metadata.storyboardShots)
    ? metadata.storyboardShots
    : [];

  return storyboardShots
    .map((item, index) => normalizeStoryboardShot(item, index, node.id))
    .filter((item): item is WorkflowStoryboardShot => Boolean(item));
}

export function createWorkflowGraphContext(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): WorkflowGraphContext {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  edges.forEach((edge) => {
    appendEdge(incoming, edge.target, edge.source);
    appendEdge(outgoing, edge.source, edge.target);
  });

  return {
    nodeMap,
    incoming,
    outgoing,
  };
}

export function getDirectUpstreamNodes(nodeId: string, graph: WorkflowGraphContext) {
  return (graph.incoming.get(nodeId) || [])
    .map((id) => graph.nodeMap.get(id) || null)
    .filter((node): node is CanvasNode => Boolean(node));
}

export function getDirectDownstreamNodes(nodeId: string, graph: WorkflowGraphContext) {
  return (graph.outgoing.get(nodeId) || [])
    .map((id) => graph.nodeMap.get(id) || null)
    .filter((node): node is CanvasNode => Boolean(node));
}

export function getRecursiveUpstreamNodes(nodeId: string, graph: WorkflowGraphContext) {
  const queue = [...(graph.incoming.get(nodeId) || [])];
  const visited = new Set<string>();
  const ordered: CanvasNode[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = graph.nodeMap.get(currentId);
    if (!node) continue;
    ordered.push(node);
    queue.push(...(graph.incoming.get(currentId) || []));
  }

  return ordered;
}

export function collectWorkflowPrompts(nodeId: string, graph: WorkflowGraphContext) {
  const upstreamNodes = getRecursiveUpstreamNodes(nodeId, graph);
  return uniqueStrings(
    upstreamNodes.flatMap((node) =>
      extractWorkflowPromptCandidates(node).filter(
        (value): value is string => typeof value === "string"
      )
    )
  );
}

export function buildWorkflowPrompt(nodeId: string, graph: WorkflowGraphContext) {
  const prompts = collectWorkflowPrompts(nodeId, graph);
  if (prompts.length === 0) return "";
  return prompts.slice(0, 4).join("\n");
}

export function collectWorkflowMedia(nodeId: string, graph: WorkflowGraphContext) {
  const upstreamNodes = getRecursiveUpstreamNodes(nodeId, graph);
  const seen = new Set<string>();
  const media: WorkflowMediaReference[] = [];

  upstreamNodes.forEach((node) => {
    extractWorkflowMedia(node).forEach((item) => {
      const key = `${item.kind}:${item.url}`;
      if (seen.has(key)) return;
      seen.add(key);
      media.push(item);
    });
  });

  return media;
}

export function collectWorkflowStoryboardShots(
  nodeId: string,
  graph: WorkflowGraphContext
) {
  const currentNode = graph.nodeMap.get(nodeId);
  if (currentNode) {
    const currentShots = extractWorkflowStoryboardShots(currentNode);
    if (currentShots.length > 0) {
      return currentShots;
    }
  }

  const upstreamNodes = getRecursiveUpstreamNodes(nodeId, graph);
  for (const node of upstreamNodes) {
    const shots = extractWorkflowStoryboardShots(node);
    if (shots.length > 0) {
      return shots;
    }
  }

  return [];
}

export function collectWorkflowStructuredData(
  nodeId: string,
  graph: WorkflowGraphContext
): WorkflowStructuredData {
  const orderedNodes = [
    graph.nodeMap.get(nodeId) || null,
    ...getRecursiveUpstreamNodes(nodeId, graph),
  ].filter((node): node is CanvasNode => Boolean(node));

  const characters: WorkflowCharacterRecord[] = [];
  const scenes: WorkflowSceneRecord[] = [];
  const characterAssets: WorkflowAssetRecord[] = [];
  const sceneAssets: WorkflowAssetRecord[] = [];
  const relationships: string[] = [];
  const recommendedNextSteps: string[] = [];
  const agentPlan: string[] = [];
  const deliverables: string[] = [];
  const recommendedNodes: string[] = [];
  const seen = new Set<string>();

  orderedNodes.forEach((node) => {
    if (node.type !== "workflow") return;
    const data = node.data as WorkflowNodeData;
    const metadata = (data.metadata || {}) as Record<string, unknown>;

    const pushUnique = <T extends { name?: string; description?: string; prompt?: string }>(
      bucket: T[],
      item: T | null,
      kind: string
    ) => {
      if (!item) return;
      const key = `${kind}:${String(item.name || "").trim().toLowerCase()}:${String(
        item.description || item.prompt || ""
      )
        .trim()
        .toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      bucket.push(item);
    };

    (Array.isArray(metadata.characters) ? metadata.characters : []).forEach((item) => {
      pushUnique(characters, normalizeCharacterRecord(item, node.id), "character");
    });
    (Array.isArray(metadata.scenes) ? metadata.scenes : []).forEach((item) => {
      pushUnique(scenes, normalizeSceneRecord(item, node.id), "scene");
    });
    (Array.isArray(metadata.characterAssets) ? metadata.characterAssets : []).forEach((item) => {
      pushUnique(
        characterAssets,
        normalizeAssetRecord(item, node.id, "character"),
        "character-asset"
      );
    });
    (Array.isArray(metadata.sceneAssets) ? metadata.sceneAssets : []).forEach((item) => {
      pushUnique(sceneAssets, normalizeAssetRecord(item, node.id, "scene"), "scene-asset");
    });

    normalizeTextList(metadata.relationships, 8).forEach((item) => {
      if (!relationships.includes(item)) relationships.push(item);
    });
    normalizeTextList(metadata.recommendedNextSteps, 8).forEach((item) => {
      if (!recommendedNextSteps.includes(item)) recommendedNextSteps.push(item);
    });
    normalizeTextList(metadata.agentPlan, 8).forEach((item) => {
      if (!agentPlan.includes(item)) agentPlan.push(item);
    });
    normalizeTextList(metadata.deliverables, 8).forEach((item) => {
      if (!deliverables.includes(item)) deliverables.push(item);
    });
    normalizeTextList(metadata.recommendedNodes, 8).forEach((item) => {
      if (!recommendedNodes.includes(item)) recommendedNodes.push(item);
    });
  });

  return {
    characters,
    scenes,
    characterAssets,
    sceneAssets,
    relationships,
    recommendedNextSteps,
    agentPlan,
    deliverables,
    recommendedNodes,
  };
}

export function getBestWorkflowPreviewMedia(
  nodeId: string,
  graph: WorkflowGraphContext
): WorkflowMediaReference | null {
  return collectWorkflowMedia(nodeId, graph)[0] || null;
}

export function inferVideoGenerationModeFromMedia(
  media: WorkflowMediaReference[]
): VideoGenerationMode {
  const imageRefs = media.filter((item) => item.kind === "image");
  if (imageRefs.length >= 3) return "reference-images";
  if (imageRefs.length >= 2) return "first-last-frame";
  if (imageRefs.length === 1) return "first-frame";
  return "text-to-video";
}

export function summarizeWorkflowInputs(nodeId: string, graph: WorkflowGraphContext) {
  const media = collectWorkflowMedia(nodeId, graph);
  const prompts = collectWorkflowPrompts(nodeId, graph);
  return {
    promptCount: prompts.length,
    imageCount: media.filter((item) => item.kind === "image").length,
    videoCount: media.filter((item) => item.kind === "video").length,
  };
}
