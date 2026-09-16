// Modified for standalone community distribution; see NOTICE.
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';
import type {
  CanvasNode,
  CanvasEdge,
  CanvasState,
  Viewport,
  ToolType,
  Position,
  Size,
  NodeType,
} from '@/types/canvas/index';

// 生成唯一 ID
const generateId = () => crypto.randomUUID();

const rebuildNodeConnections = (nodes: CanvasNode[], edges: CanvasEdge[]) => {
  const connectionMap = new Map<string, Set<string>>();
  nodes.forEach((node) => connectionMap.set(node.id, new Set<string>()));

  edges.forEach((edge) => {
    connectionMap.get(edge.source)?.add(edge.target);
    connectionMap.get(edge.target)?.add(edge.source);
  });

  nodes.forEach((node) => {
    node.connections = Array.from(connectionMap.get(node.id) || []);
  });
};

// 默认视口
const defaultViewport: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

// 待添加到对话框的图片附件
interface PendingChatAttachment {
  url: string;
  name: string;
  contentType: string;
}

// 🆕 拾取的物品信息
export interface PickedObject {
  // 原图信息
  imageUrl: string;
  imageNodeId: string;

  // 点击位置（相对坐标 0-1）
  clickX: number;
  clickY: number;

  // AI 识别结果
  objectName: string;        // ≤8字，格式：[颜色/材质]+[物品]
  objectPosition: string;    // 固定4字，如"左上区域"
  confidence: number;        // 置信度 0-1

  // 物品边界框
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type ImageNodeActionType = 'box-cutout' | 'text-edit' | 'local-edit';

export interface ImageNodeActionRequest {
  nodeId: string;
  action: ImageNodeActionType;
  requestId: string;
}

// Store 状态接口
interface CanvasStore {
  // 项目信息
  projectId: string | null;
  projectTitle: string;

  // 画布状态
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  viewport: Viewport;
  tool: ToolType;
  suppressedMediaKeys: string[];

  // 历史记录（用于撤销/重做）
  history: CanvasState[];
  historyIndex: number;

  // UI 状态
  isPanelOpen: boolean;
  isGenerating: boolean;

  // 🆕 待添加到对话框的图片（用于从画布添加图片到对话）
  pendingChatAttachments: PendingChatAttachment[];

  // 🆕 物品拾取模式
  isPickerMode: boolean;
  pickerTargetNodeId: string | null;
  isPickerLoading: boolean;
  pickedObject: PickedObject | null;
  pendingPickedObjects: PickedObject[];
  imageNodeActionRequest: ImageNodeActionRequest | null;

  // 🆕 新增节点（用于自动聚焦）
  lastAddedNodeId: string | null;

  // 项目操作
  setProject: (id: string | null, title?: string) => void;
  setProjectTitle: (title: string) => void;

  // 节点操作
  addNode: (node: Omit<CanvasNode, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;
  addSuppressedMediaKeys: (keys: string[]) => void;

  // 选择操作
  selectNode: (id: string, multi?: boolean) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // 边操作
  addEdge: (edge: Omit<CanvasEdge, 'id'>) => string;
  deleteEdge: (id: string) => void;

  // 视口操作
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  fitToScreen: () => void;
  centerNode: (nodeId: string) => void;

  // 工具操作
  setTool: (tool: ToolType) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // UI 操作
  togglePanel: () => void;
  setGenerating: (isGenerating: boolean) => void;

  // 批量操作
  loadCanvas: (state: Partial<CanvasState>) => void;
  clearCanvas: () => void;
  getCanvasState: () => CanvasState;

  // 节点位置操作
  moveNode: (id: string, position: Position) => void;
  resizeNode: (id: string, size: Size) => void;

  // 辅助方法
  getNode: (id: string) => CanvasNode | undefined;
  getSelectedNodes: () => CanvasNode[];
  getNodesByType: (type: NodeType) => CanvasNode[];

  // 🆕 对话框附件操作
  addPendingChatAttachment: (attachment: PendingChatAttachment) => void;
  clearPendingChatAttachments: () => void;

  // 🆕 物品拾取操作
  setPickerMode: (enabled: boolean, nodeId?: string) => void;
  setPickerLoading: (loading: boolean) => void;
  setPickedObject: (obj: PickedObject | null) => void;
  addPendingPickedObject: (obj: PickedObject) => void;
  clearPendingPickedObjects: () => void;
  requestImageNodeAction: (nodeId: string, action: ImageNodeActionType) => void;
  clearImageNodeActionRequest: () => void;

  // 🆕 自动聚焦控制
  clearLastAddedNodeId: () => void;
}

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初始状态
        projectId: null,
        projectTitle: '未命名画布',
        nodes: [],
        edges: [],
        selectedNodeIds: [],
        viewport: defaultViewport,
        tool: 'select',
        suppressedMediaKeys: [],
        history: [],
        historyIndex: -1,
        isPanelOpen: true,
        isGenerating: false,
        pendingChatAttachments: [], // 🆕 待添加到对话框的图片

        // 🆕 物品拾取模式初始状态
        isPickerMode: false,
        pickerTargetNodeId: null,
        isPickerLoading: false,
        pickedObject: null,
        pendingPickedObjects: [],
        imageNodeActionRequest: null,
        lastAddedNodeId: null,

        // 项目操作
        setProject: (id, title) => set((state) => {
          state.projectId = id;
          if (title) state.projectTitle = title;
        }),

        setProjectTitle: (title) => set((state) => {
          state.projectTitle = title;
        }),

        // 节点操作
        addNode: (nodeData) => {
          const imageMetadata =
            nodeData.type === 'image' && nodeData.data && typeof nodeData.data === 'object'
              ? (((nodeData.data as any).metadata ?? {}) as Record<string, unknown>)
              : {};
          const shouldPreserveImagePosition =
            imageMetadata.allowOverlap === true || imageMetadata.placementMode === 'overlay';

          const resolveImagePosition = (
            basePosition: Position,
            size: Size,
            nodes: CanvasNode[]
          ): Position => {
            if (nodeData.type !== 'image' || shouldPreserveImagePosition) return basePosition;
            const padding = 20;
            const width = size?.width || 300;
            const height = size?.height || 300;
            const stepX = width + padding;
            const stepY = height + padding;

            const overlaps = (pos: Position) => nodes.some(n => {
              const nSize = n.size || { width: 300, height: 300 };
              return !(
                pos.x + width + padding <= n.position.x ||
                pos.x >= n.position.x + nSize.width + padding ||
                pos.y + height + padding <= n.position.y ||
                pos.y >= n.position.y + nSize.height + padding
              );
            });

            if (!overlaps(basePosition)) return basePosition;

            const maxRings = 20;
            for (let ring = 1; ring <= maxRings; ring++) {
              for (let dx = -ring; dx <= ring; dx++) {
                for (let dy = -ring; dy <= ring; dy++) {
                  if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
                  const candidate = {
                    x: basePosition.x + dx * stepX,
                    y: basePosition.y + dy * stepY,
                  };
                  if (!overlaps(candidate)) {
                    return candidate;
                  }
                }
              }
            }

            return basePosition;
          };

          const id = generateId();
          const now = new Date();
          const basePosition = nodeData.position || { x: 0, y: 0 };
          const nodeSize = nodeData.size || { width: 300, height: 300 };
          const finalPosition = resolveImagePosition(basePosition, nodeSize, get().nodes);
          const node: CanvasNode = {
            ...nodeData,
            id,
            createdAt: now,
            updatedAt: now,
            position: finalPosition,
          };

          set((state) => {
            state.nodes.push(node);
            if (node.type === 'image') {
              state.lastAddedNodeId = id;
            }
          });

          // 添加到历史
          get().pushHistory();

          return id;
        },

        updateNode: (id, updates) => set((state) => {
          const index = state.nodes.findIndex(n => n.id === id);
          if (index !== -1) {
            state.nodes[index] = {
              ...state.nodes[index],
              ...updates,
              updatedAt: new Date(),
            };
          }
        }),

        addSuppressedMediaKeys: (keys) => set((state) => {
          const normalized = Array.from(
            new Set((keys || []).map((item) => String(item || "").trim()).filter(Boolean))
          );
          if (normalized.length === 0) return;
          const existing = new Set(state.suppressedMediaKeys);
          normalized.forEach((key) => existing.add(key));
          state.suppressedMediaKeys = Array.from(existing);
        }),

        deleteNode: (id) => {
          set((state) => {
            const targetNode = state.nodes.find(n => n.id === id);
            if (targetNode && (targetNode.type === 'image' || targetNode.type === 'video')) {
              const data = ((targetNode.data as any) || {}) as Record<string, any>;
              const metadata = ((data.metadata as any) || {}) as Record<string, any>;
              const sourceMessageId = String(metadata.sourceMessageId || "").trim();
              const sourceImageKey = String(metadata.sourceImageKey || "").trim();
              const sourceMediaUrl = String(data.src || "").trim();
              const suppressionKeys = [
                sourceMessageId && sourceImageKey ? `image:${sourceMessageId}::${sourceImageKey}` : "",
                targetNode.type === 'video' && sourceMediaUrl ? `video:${sourceMediaUrl}` : "",
                targetNode.type === 'image' && sourceMediaUrl ? `image-url:${sourceMediaUrl}` : "",
              ].filter(Boolean);
              if (suppressionKeys.length > 0) {
                const existing = new Set(state.suppressedMediaKeys);
                suppressionKeys.forEach((key) => existing.add(key));
                state.suppressedMediaKeys = Array.from(existing);
              }
            }
            state.nodes = state.nodes.filter(n => n.id !== id);
            state.edges = state.edges.filter(e => e.source !== id && e.target !== id);
            rebuildNodeConnections(state.nodes, state.edges);
            state.selectedNodeIds = state.selectedNodeIds.filter(nid => nid !== id);
          });
          get().pushHistory();
        },

        deleteSelectedNodes: () => {
          const { selectedNodeIds } = get();
          set((state) => {
            const selectedNodes = state.nodes.filter(n => selectedNodeIds.includes(n.id));
            const existing = new Set(state.suppressedMediaKeys);
            selectedNodes.forEach((targetNode) => {
              if (targetNode.type !== 'image' && targetNode.type !== 'video') return;
              const data = ((targetNode.data as any) || {}) as Record<string, any>;
              const metadata = ((data.metadata as any) || {}) as Record<string, any>;
              const sourceMessageId = String(metadata.sourceMessageId || "").trim();
              const sourceImageKey = String(metadata.sourceImageKey || "").trim();
              const sourceMediaUrl = String(data.src || "").trim();
              const suppressionKeys = [
                sourceMessageId && sourceImageKey ? `image:${sourceMessageId}::${sourceImageKey}` : "",
                targetNode.type === 'video' && sourceMediaUrl ? `video:${sourceMediaUrl}` : "",
                targetNode.type === 'image' && sourceMediaUrl ? `image-url:${sourceMediaUrl}` : "",
              ].filter(Boolean);
              suppressionKeys.forEach((key) => existing.add(key));
            });
            state.suppressedMediaKeys = Array.from(existing);
            state.nodes = state.nodes.filter(n => !selectedNodeIds.includes(n.id));
            state.edges = state.edges.filter(
              e => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
            );
            rebuildNodeConnections(state.nodes, state.edges);
            state.selectedNodeIds = [];
          });
          get().pushHistory();
        },

        // 选择操作
        selectNode: (id, multi = false) => set((state) => {
          if (multi) {
            const index = state.selectedNodeIds.indexOf(id);
            if (index === -1) {
              state.selectedNodeIds.push(id);
            } else {
              state.selectedNodeIds.splice(index, 1);
            }
          } else {
            state.selectedNodeIds = [id];
          }
        }),

        selectNodes: (ids) => set((state) => {
          state.selectedNodeIds = ids;
        }),

        clearSelection: () => set((state) => {
          state.selectedNodeIds = [];
        }),

        selectAll: () => set((state) => {
          state.selectedNodeIds = state.nodes.map(n => n.id);
        }),

        // 边操作
        addEdge: (edgeData) => {
          const id = generateId();
          const edge: CanvasEdge = { ...edgeData, id };
          let added = false;

          set((state) => {
            // 检查是否已存在相同的边
            const exists = state.edges.some(
              e => e.source === edge.source && e.target === edge.target
            );
            if (!exists) {
              state.edges.push(edge);
              rebuildNodeConnections(state.nodes, state.edges);
              added = true;
            }
          });

          if (added) {
            get().pushHistory();
          }

          return id;
        },

        deleteEdge: (id) => {
          let deleted = false;
          set((state) => {
            const nextEdges = state.edges.filter(e => e.id !== id);
            deleted = nextEdges.length !== state.edges.length;
            state.edges = nextEdges;
            rebuildNodeConnections(state.nodes, state.edges);
          });
          if (deleted) {
            get().pushHistory();
          }
        },

        // 视口操作
        setViewport: (viewport) => set((state) => {
          state.viewport = { ...state.viewport, ...viewport };
        }),

        zoomIn: () => set((state) => {
          state.viewport.zoom = Math.min(state.viewport.zoom * 1.2, 4);
        }),

        zoomOut: () => set((state) => {
          state.viewport.zoom = Math.max(state.viewport.zoom / 1.2, 0.1);
        }),

        zoomTo: (zoom) => set((state) => {
          state.viewport.zoom = Math.max(0.1, Math.min(zoom, 4));
        }),

        fitToScreen: () => set((state) => {
          // TODO: 计算所有节点的边界并调整视口
          state.viewport = { x: 0, y: 0, zoom: 1 };
        }),

        centerNode: (nodeId) => {
          const node = get().getNode(nodeId);
          if (node) {
            set((state) => {
              state.viewport.x = -node.position.x - node.size.width / 2;
              state.viewport.y = -node.position.y - node.size.height / 2;
            });
          }
        },

        // 工具操作
        setTool: (tool) => set((state) => {
          state.tool = tool;
        }),

        // 历史操作
        undo: () => set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex -= 1;
            const prevState = state.history[state.historyIndex];
            state.nodes = prevState.nodes;
            state.edges = prevState.edges;
            state.selectedNodeIds = prevState.selectedNodeIds;
          }
        }),

        redo: () => set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            const nextState = state.history[state.historyIndex];
            state.nodes = nextState.nodes;
            state.edges = nextState.edges;
            state.selectedNodeIds = nextState.selectedNodeIds;
          }
        }),

        pushHistory: () => set((state) => {
          const currentState: CanvasState = {
            nodes: JSON.parse(JSON.stringify(state.nodes)),
            edges: JSON.parse(JSON.stringify(state.edges)),
            selectedNodeIds: [...state.selectedNodeIds],
            viewport: { ...state.viewport },
            tool: state.tool,
            suppressedMediaKeys: [...state.suppressedMediaKeys],
          };

          // 移除当前位置之后的历史
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(currentState);
          state.historyIndex = state.history.length - 1;

          // 限制历史记录数量
          if (state.history.length > 50) {
            state.history = state.history.slice(-50);
            state.historyIndex = state.history.length - 1;
          }
        }),

        // UI 操作
        togglePanel: () => set((state) => {
          state.isPanelOpen = !state.isPanelOpen;
        }),

        setGenerating: (isGenerating) => set((state) => {
          state.isGenerating = isGenerating;
        }),

        // 批量操作
        loadCanvas: (canvasState) => set((state) => {
          if (canvasState.nodes) state.nodes = canvasState.nodes;
          if (canvasState.edges) state.edges = canvasState.edges;
          rebuildNodeConnections(state.nodes, state.edges);
          if (canvasState.selectedNodeIds) state.selectedNodeIds = canvasState.selectedNodeIds;
          if (canvasState.viewport) state.viewport = canvasState.viewport;
          if (canvasState.tool) state.tool = canvasState.tool;
          state.suppressedMediaKeys = Array.isArray(canvasState.suppressedMediaKeys)
            ? canvasState.suppressedMediaKeys.map((item) => String(item || "").trim()).filter(Boolean)
            : [];
        }),

        clearCanvas: () => set((state) => {
          state.nodes = [];
          state.edges = [];
          state.selectedNodeIds = [];
          state.viewport = defaultViewport;
          state.suppressedMediaKeys = [];
          state.history = [];
          state.historyIndex = -1;
        }),

        getCanvasState: () => {
          const state = get();
          return {
            nodes: state.nodes,
            edges: state.edges,
            selectedNodeIds: state.selectedNodeIds,
            viewport: state.viewport,
            tool: state.tool,
            suppressedMediaKeys: state.suppressedMediaKeys,
          };
        },

        // 节点位置操作
        moveNode: (id, position) => set((state) => {
          const node = state.nodes.find(n => n.id === id);
          if (node) {
            node.position = position;
            node.updatedAt = new Date();
          }
        }),

        resizeNode: (id, size) => set((state) => {
          const node = state.nodes.find(n => n.id === id);
          if (node) {
            node.size = size;
            node.updatedAt = new Date();
          }
        }),

        // 辅助方法
        getNode: (id) => get().nodes.find(n => n.id === id),

        getSelectedNodes: () => {
          const { nodes, selectedNodeIds } = get();
          return nodes.filter(n => selectedNodeIds.includes(n.id));
        },

        getNodesByType: (type) => get().nodes.filter(n => n.type === type),

        // 🆕 对话框附件操作
        addPendingChatAttachment: (attachment) => set((state) => {
          // 避免重复添加
          if (!state.pendingChatAttachments.some(a => a.url === attachment.url)) {
            state.pendingChatAttachments.push(attachment);
          }
        }),

        clearPendingChatAttachments: () => set((state) => {
          state.pendingChatAttachments = [];
        }),

        // 🆕 物品拾取操作
        setPickerMode: (enabled, nodeId) => set((state) => {
          state.isPickerMode = enabled;
          state.pickerTargetNodeId = enabled ? (nodeId || null) : null;
          if (!enabled) {
            state.pickedObject = null;
            state.isPickerLoading = false;
          }
        }),

        setPickerLoading: (loading) => set((state) => {
          state.isPickerLoading = loading;
        }),

        setPickedObject: (obj) => set((state) => {
          state.pickedObject = obj;
        }),

        addPendingPickedObject: (obj) => set((state) => {
          // 避免重复添加
          if (!state.pendingPickedObjects.some(o =>
            o.imageUrl === obj.imageUrl &&
            o.clickX === obj.clickX &&
            o.clickY === obj.clickY
          )) {
            state.pendingPickedObjects.push(obj);
          }
        }),

        clearPendingPickedObjects: () => set((state) => {
          state.pendingPickedObjects = [];
        }),

        requestImageNodeAction: (nodeId, action) => set((state) => {
          state.imageNodeActionRequest = {
            nodeId,
            action,
            requestId: generateId(),
          };
        }),

        clearImageNodeActionRequest: () => set((state) => {
          state.imageNodeActionRequest = null;
        }),

        clearLastAddedNodeId: () => set((state) => {
          state.lastAddedNodeId = null;
        }),
      })),
      {
        name: 'canvas-storage',
        partialize: (state) => ({
          // 只持久化部分状态
          projectId: state.projectId,
          projectTitle: state.projectTitle,
        }),
      }
    ),
    { name: 'canvas-store' }
  )
);

// 导出选择器
export const canvasSelectors = {
  nodes: (state: CanvasStore) => state.nodes,
  edges: (state: CanvasStore) => state.edges,
  selectedNodeIds: (state: CanvasStore) => state.selectedNodeIds,
  viewport: (state: CanvasStore) => state.viewport,
  tool: (state: CanvasStore) => state.tool,
  isGenerating: (state: CanvasStore) => state.isGenerating,
  hasSelection: (state: CanvasStore) => state.selectedNodeIds.length > 0,
  canUndo: (state: CanvasStore) => state.historyIndex > 0,
  canRedo: (state: CanvasStore) => state.historyIndex < state.history.length - 1,
};
