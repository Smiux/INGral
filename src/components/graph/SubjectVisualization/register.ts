import type { DataTransformer, SubjectInfo } from './types';

const subjects: Map<string, DataTransformer> = new Map();

export function registerSubject (key: string, transformer: DataTransformer): void {
  subjects.set(key, transformer);
}

export function getSubject (key: string): DataTransformer | undefined {
  return subjects.get(key);
}

export function getAvailableSubjects (): SubjectInfo[] {
  const result: SubjectInfo[] = [];
  subjects.forEach((transformer, subjectKey) => {
    const info = transformer.getSubjectInfo();
    result.push({
      'key': subjectKey,
      'name': info.name,
      'rootName': info.rootName
    });
  });
  return result;
}
