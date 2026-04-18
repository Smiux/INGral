import type { GraphData } from './types';

export interface ProcessedGraphData extends GraphData {
  idToNameMap?: Record<string, string>;
}

const dataCache = new Map<string, ProcessedGraphData>();
const loadingPromises = new Map<string, Promise<ProcessedGraphData>>();

const DATA_PATHS: Record<string, string> = {
  'msc2020': '/data/msc2020/processed.json',
  'physh': '/data/physh/processed.json',
  'mesh': '/data/mesh/processed.json',
  'chebi': '/data/chebi/processed.json'
};

export const loadData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  if (dataCache.has(subjectKey)) {
    return dataCache.get(subjectKey)!;
  }

  if (loadingPromises.has(subjectKey)) {
    return loadingPromises.get(subjectKey)!;
  }

  const path = DATA_PATHS[subjectKey];
  if (!path) {
    throw new Error(`Unknown subject: ${subjectKey}`);
  }

  const promise = fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
      }
      return response.json() as Promise<ProcessedGraphData>;
    })
    .then((data) => {
      dataCache.set(subjectKey, data);
      loadingPromises.delete(subjectKey);
      return data;
    })
    .catch((error) => {
      loadingPromises.delete(subjectKey);
      throw error;
    });

  loadingPromises.set(subjectKey, promise);
  return promise;
};

export const getCachedData = (subjectKey: string): ProcessedGraphData | null => {
  return dataCache.get(subjectKey) || null;
};

export const isDataLoaded = (subjectKey: string): boolean => {
  return dataCache.has(subjectKey);
};

export const preloadAllData = async (): Promise<void> => {
  const keys = Object.keys(DATA_PATHS);
  await Promise.all(keys.map((key) => loadData(key)));
};
