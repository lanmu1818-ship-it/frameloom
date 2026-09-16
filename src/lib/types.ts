// Modified for standalone community distribution; see NOTICE.
import type { UIMessage } from "ai";
import { z } from "zod";
import type { AppUsage } from "@/src/lib/usage";

type WeatherAtLocation = Record<string, unknown>;

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type FrontendTool<Input = Record<string, unknown>, Output = unknown> = {
  input: Input;
  output: Output;
};

type ToolErrorOutput = {
  error: string;
};

export type DocumentToolOutput = {
  id: string;
  title: string;
  kind: ArtifactKind;
};

export type ChatTools = {
  getWeather: FrontendTool<Record<string, unknown>, WeatherAtLocation>;
  createDocument: FrontendTool<
    Record<string, unknown>,
    DocumentToolOutput | ToolErrorOutput
  >;
  updateDocument: FrontendTool<
    Record<string, unknown>,
    DocumentToolOutput | ToolErrorOutput
  >;
  requestSuggestions: FrontendTool<
    Record<string, unknown>,
    DocumentToolOutput | ToolErrorOutput
  >;
};

export type ArtifactKind = "text" | "code" | "image" | "sheet";

export type SuggestionData = {
  id: string;
  teamId: string | null;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: SuggestionData;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
  assetId?: string;
};

export type DocumentData = {
  id: string;
  teamId: string | null;
  createdAt: Date;
  title: string;
  content: string | null;
  kind: ArtifactKind;
  userId: string;
};

export type VoteData = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};
