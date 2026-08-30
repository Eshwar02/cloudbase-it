import { api } from "../lib/axios";
import type { DriveListing } from "../types";

export const getDrive = () => api.get<DriveListing>("/drive").then((r) => r.data);
