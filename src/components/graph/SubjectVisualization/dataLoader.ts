import type { GraphData, SubjectNode, SubjectLink } from './types';

export interface ProcessedGraphData extends GraphData {
  idToNameMap?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

interface ChunkData {
  nodes: SubjectNode[];
  chunkIndex: number;
}

interface Metadata {
  chunkCount: number;
  linkChunkCount?: number;
  mapChunkCount?: number;
}

const dataCache = new Map<string, ProcessedGraphData>();
const loadingPromises = new Map<string, Promise<ProcessedGraphData>>();

const CHUNKED_SUBJECTS = new Set(['ncbi', 'mesh', 'chebi']);
const FULLY_CHUNKED_SUBJECTS = new Set(['ncbi']);

const loadFullyChunkedData = async (subjectKey: string, metadata: Metadata): Promise<ProcessedGraphData> => {
  const allNodes: SubjectNode[] = [];
  const nodeChunkPromises: Promise<ChunkData>[] = [];

  for (let i = 0; i < metadata.chunkCount; i += 1) {
    const chunkPath = `/data/${subjectKey}/chunks/chunk_${i.toString().padStart(3, '0')}.json`;
    nodeChunkPromises.push(
      fetch(chunkPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load chunk ${i}`);
          }
          return res.json() as Promise<ChunkData>;
        })
    );
  }

  const nodeChunks = await Promise.all(nodeChunkPromises);
  nodeChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  for (const chunk of nodeChunks) {
    for (let i = 0; i < chunk.nodes.length; i += 1) {
      const node = chunk.nodes[i];
      if (node) {
        allNodes.push(node);
      }
    }
  }

  const linkChunkCount = metadata.linkChunkCount || 1;
  const allLinks: SubjectLink[] = [];
  const linkChunkPromises: Promise<SubjectLink[]>[] = [];

  for (let i = 0; i < linkChunkCount; i += 1) {
    const chunkPath = `/data/${subjectKey}/links_chunks/link_chunk_${i.toString().padStart(3, '0')}.json`;
    linkChunkPromises.push(
      fetch(chunkPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load link chunk ${i}`);
          }
          return res.json() as Promise<SubjectLink[]>;
        })
    );
  }

  const linkChunks = await Promise.all(linkChunkPromises);
  for (const chunk of linkChunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      const link = chunk[i];
      if (link) {
        allLinks.push(link);
      }
    }
  }

  const mapChunkCount = metadata.mapChunkCount || 1;
  const idToNameMap: Record<string, string> = {};
  const mapChunkPromises: Promise<Record<string, string>>[] = [];

  for (let i = 0; i < mapChunkCount; i += 1) {
    const chunkPath = `/data/${subjectKey}/idToNameMap_chunks/map_chunk_${i.toString().padStart(3, '0')}.json`;
    mapChunkPromises.push(
      fetch(chunkPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load map chunk ${i}`);
          }
          return res.json() as Promise<Record<string, string>>;
        })
    );
  }

  const mapChunks = await Promise.all(mapChunkPromises);
  for (const chunk of mapChunks) {
    const keys = Object.keys(chunk);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key) {
        const value = chunk[key];
        if (value !== undefined) {
          idToNameMap[key] = value;
        }
      }
    }
  }

  return {
    'nodes': allNodes,
    'links': allLinks,
    idToNameMap,
    'metadata': metadata as unknown as Record<string, unknown>
  };
};

const loadChunkedData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  const metadataResponse = await fetch(`/data/${subjectKey}/metadata.json`);
  if (!metadataResponse.ok) {
    throw new Error(`Failed to load metadata for ${subjectKey}`);
  }
  const metadata = await metadataResponse.json() as Metadata;

  if (FULLY_CHUNKED_SUBJECTS.has(subjectKey)) {
    return loadFullyChunkedData(subjectKey, metadata);
  }

  const allNodes: SubjectNode[] = [];
  const chunkPromises: Promise<ChunkData>[] = [];

  for (let i = 0; i < metadata.chunkCount; i += 1) {
    const chunkPath = `/data/${subjectKey}/chunks/chunk_${i.toString().padStart(3, '0')}.json`;
    chunkPromises.push(
      fetch(chunkPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load chunk ${i}`);
          }
          return res.json() as Promise<ChunkData>;
        })
    );
  }

  const chunks = await Promise.all(chunkPromises);

  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  for (const chunk of chunks) {
    for (let i = 0; i < chunk.nodes.length; i += 1) {
      const node = chunk.nodes[i];
      if (node) {
        allNodes.push(node);
      }
    }
  }

  const linksResponse = await fetch(`/data/${subjectKey}/links.json`);
  if (!linksResponse.ok) {
    throw new Error(`Failed to load links for ${subjectKey}`);
  }
  const links = await linksResponse.json() as SubjectLink[];

  const idToNameMapResponse = await fetch(`/data/${subjectKey}/idToNameMap.json`);
  const idToNameMap = idToNameMapResponse.ok
    ? await idToNameMapResponse.json() as Record<string, string>
    : {};

  return {
    'nodes': allNodes,
    links,
    idToNameMap,
    'metadata': metadata as unknown as Record<string, unknown>
  };
};

const loadSingleFileData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  const path = `/data/${subjectKey}/processed.json`;
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }

  return response.json() as Promise<ProcessedGraphData>;
};

export const loadData = async (subjectKey: string): Promise<ProcessedGraphData> => {
  if (dataCache.has(subjectKey)) {
    return dataCache.get(subjectKey)!;
  }

  if (loadingPromises.has(subjectKey)) {
    return loadingPromises.get(subjectKey)!;
  }

  const promise = (async () => {
    let data: ProcessedGraphData;

    if (CHUNKED_SUBJECTS.has(subjectKey)) {
      data = await loadChunkedData(subjectKey);
    } else {
      data = await loadSingleFileData(subjectKey);
    }

    dataCache.set(subjectKey, data);
    loadingPromises.delete(subjectKey);
    return data;
  })();

  loadingPromises.set(subjectKey, promise);
  return promise;
};

export const getCachedData = (subjectKey: string): ProcessedGraphData | null => {
  return dataCache.get(subjectKey) || null;
};
