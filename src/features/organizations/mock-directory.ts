import type { NormalizedWebsite } from "./domain-normalization";
import { createOrReuseDirectoryCompany } from "./directory";
import { mockCompanies } from "./mock-data";
import type { DirectoryCompany } from "./types";

const storeKey = "__looplineMockCompanyDirectory";
type MockGlobal = typeof globalThis & {
  __looplineMockCompanyDirectory?: DirectoryCompany[];
};

function directoryStore() {
  const shared = globalThis as MockGlobal;
  shared[storeKey] ??= [...mockCompanies];
  return shared[storeKey];
}

export function getMockDirectoryCompanies() {
  return [...directoryStore()];
}

export function createOrReuseMockCompany(
  name: string,
  normalized: NormalizedWebsite,
) {
  const directory = directoryStore();
  const result = createOrReuseDirectoryCompany(directory, name, normalized);
  if (result.created) directory.push(result.company);
  return { company: result.company, created: result.created };
}

export function resetMockDirectoryForTests() {
  const shared = globalThis as MockGlobal;
  shared[storeKey] = [...mockCompanies];
}
