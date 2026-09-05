import { api } from "../lib/axios";
import type { OrganizeProposal, OrganizeApplyResult, SearchResult } from "../types";

export const semanticSearch = (q: string) =>
  api.get<SearchResult[]>("/search/semantic", { params: { q } }).then((r) => r.data);

export const proposeOrganize = (folderId: string) =>
  api.post<OrganizeProposal>(`/ai/organize/${folderId}`).then((r) => r.data);

export const applyOrganize = (folderId: string, proposal: OrganizeProposal) =>
  api.post<OrganizeApplyResult>(`/ai/organize/${folderId}/apply`, proposal)
    .then((r) => r.data);
