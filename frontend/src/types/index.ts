export interface User {
  id: string; email: string; display_name: string;
  storage_used_bytes: number; storage_quota_bytes: number;
}
export interface Folder {
  id: string; owner_id: string; parent_id: string | null;
  name: string; is_trashed: boolean; created_at: string;
}
export interface FileItem {
  id: string; name: string; folder_id?: string | null;
  mime_type?: string | null; size_bytes: number;
  status?: string; created_at?: string;
}
export interface TrashItem {
  id: string; item_type: "file" | "folder"; name: string; trashed_at: string | null;
}
export interface DriveListing { folders: Folder[]; files: FileItem[]; }
export interface FolderListing { folder: Folder; folders: Folder[]; files: FileItem[]; }
export interface BreadcrumbEntry { id: string; name: string; }
export interface SearchResult { id: string; type: "file" | "folder"; name: string; mime_type?: string | null; }
export interface InitUploadResponse { file_id: string; upload_url: string; storage_key: string; }
export interface SharedItem {
  id: string; item_type: "file" | "folder"; name: string;
  role: string; owner_email: string;
}
export interface StarredItem {
  id: string; item_type: "file" | "folder"; name: string;
  mime_type?: string | null; size_bytes?: number | null;
}
export interface ShareGrant {
  id: string; file_id: string | null; folder_id: string | null;
  grantee_user_id: string; grantee_email: string; role: string; created_at: string;
}
export interface LinkShare {
  id: string; token: string; url: string; role: string;
  has_password: boolean; expires_at: string | null; created_at: string;
}
export interface OrganizeGroup { name: string; file_ids: string[]; folder_ids: string[]; }
export interface OrganizeProposal { groups: OrganizeGroup[]; }
export interface OrganizeApplyResult { created_folders: { id: string; name: string }[]; moved: number; }
