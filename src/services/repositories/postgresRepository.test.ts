import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application } from '../../types';

const application: Application = {
  id: 'APP-1',
  instituteId: 'INST-1',
  instituteName: 'Sunrise Institute',
  type: 'Extension of Approval',
  region: 'Northern',
  state: 'Delhi',
  stage: 'Submitted',
  status: 'In Progress',
  lastUpdated: '01 Nov 2026',
  appliedDate: '2026-10-31',
  category: 'Technical',
  intakeProposed: 120,
  programs: ['CSE'],
  contactEmail: 'office@example.edu',
  contactPhone: '+91 11 29581000',
  timeline: [],
  documents: [],
  remarks: '',
  version: 1
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function loadRepository() {
  const module = await import('./postgresRepository');
  return module.postgresRepository;
}

describe('postgres repository', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the authenticated snapshot with cookies', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ applications: [application], config: null }));
    const repository = await loadRepository();

    const snapshot = await repository.loadRemote();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/snapshot',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(snapshot?.applications?.[0].id).toBe('APP-1');
  });

  it('creates unknown rows and updates rows already in the snapshot', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ applications: [application] }));
    const repository = await loadRepository();
    await repository.loadRemote();

    fetchMock.mockResolvedValueOnce(jsonResponse({ entity: application }));
    const updated = await repository.upsertApplication(application);
    expect(updated).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/applications/APP-1',
      expect.objectContaining({ method: 'PUT' })
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ entity: application }, 201));
    const created = await repository.upsertApplication({ ...application, id: 'APP-NEW' });
    expect(created).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/applications',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('retries once after a network failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse({ entity: application }, 201));
    const repository = await loadRepository();

    const saved = await repository.upsertApplication(application);

    expect(saved).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports server rejections without retrying', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'REGULATED_FIELD', text: 'Not through this endpoint.' }, 403)
    );
    const repository = await loadRepository();
    const messages: string[] = [];
    repository.onWriteError((message) => messages.push(message));

    const saved = await repository.upsertApplication(application);

    expect(saved).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(messages).toEqual(['Not through this endpoint.']);
  });

  it('returns null and reports when the snapshot cannot be fetched', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    const repository = await loadRepository();
    const messages: string[] = [];
    repository.onWriteError((message) => messages.push(message));

    await expect(repository.loadRemote()).resolves.toBeNull();
    expect(messages).toHaveLength(1);
  });
});
