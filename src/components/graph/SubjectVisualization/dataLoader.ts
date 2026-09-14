import type { GraphData } from './types';

export interface ProcessedGraphData extends GraphData {
  idToNameMap?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

const dataCache = new Map<string, ProcessedGraphData>();
const loadingPromises = new Map<string, Promise<ProcessedGraphData>>();

const loadSingleFileData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  const path = `/data/${subjectKey}/processed.json`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  return response.json() as Promise<ProcessedGraphData>;
};

export const loadData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  const cached = dataCache.get(subjectKey);
  if (cached) {
    return cached;
  }

  const loading = loadingPromises.get(subjectKey);
  if (loading) {
    return loading;
  }

  const promise = loadSingleFileData(subjectKey)
    .then((data) => {
      dataCache.set(subjectKey, data);
      return data;
    })
    .finally(() => {
      loadingPromises.delete(subjectKey);
    });

  loadingPromises.set(subjectKey, promise);
  return promise;
};

export const getCachedData = (subjectKey: string): ProcessedGraphData | null => {
  return dataCache.get(subjectKey) || null;
};
