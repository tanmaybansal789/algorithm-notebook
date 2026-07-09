import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuid } from 'uuid';
import type { ModuleType, NotebookModule, Project } from './types';
import { emptyModuleData } from './types';

class NotebookDB extends Dexie {
	projects!: EntityTable<Project, 'id'>;
	modules!: EntityTable<NotebookModule, 'id'>;

	constructor() {
		super('algorithm-notebook');
		this.version(1).stores({
			projects: 'id, name, updatedAt',
			modules: 'id, projectId, updatedAt'
		});
	}
}

export const db = new NotebookDB();

export async function createProject(input: {
	name: string;
	description?: string;
	url?: string;
	tags?: string[];
	rating?: number | null;
}): Promise<Project> {
	const now = Date.now();
	const project: Project = {
		id: uuid(),
		name: input.name,
		description: input.description ?? '',
		url: input.url ?? '',
		tags: input.tags ?? [],
		rating: input.rating ?? null,
		createdAt: now,
		updatedAt: now,
		moduleOrder: []
	};
	await db.projects.add(project);
	return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
	await db.projects.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
	await db.transaction('rw', db.projects, db.modules, async () => {
		await db.modules.where('projectId').equals(id).delete();
		await db.projects.delete(id);
	});
}

export async function listProjects(): Promise<Project[]> {
	return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
	return db.projects.get(id);
}

export async function addModule(
	projectId: string,
	type: ModuleType,
	title?: string
): Promise<NotebookModule> {
	const now = Date.now();
	const module: NotebookModule = {
		id: uuid(),
		projectId,
		type,
		title: title ?? defaultTitleFor(type),
		createdAt: now,
		updatedAt: now,
		data: emptyModuleData(type)
	};
	await db.transaction('rw', db.modules, db.projects, async () => {
		await db.modules.add(module);
		const project = await db.projects.get(projectId);
		if (project) {
			await db.projects.update(projectId, {
				moduleOrder: [...project.moduleOrder, module.id],
				updatedAt: now
			});
		}
	});
	return module;
}

export async function updateModule(id: string, patch: Partial<NotebookModule>): Promise<void> {
	await db.modules.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteModule(id: string, projectId: string): Promise<void> {
	await db.transaction('rw', db.modules, db.projects, async () => {
		await db.modules.delete(id);
		const project = await db.projects.get(projectId);
		if (project) {
			await db.projects.update(projectId, {
				moduleOrder: project.moduleOrder.filter((m) => m !== id),
				updatedAt: Date.now()
			});
		}
	});
}

export async function reorderModules(projectId: string, moduleOrder: string[]): Promise<void> {
	await db.projects.update(projectId, { moduleOrder, updatedAt: Date.now() });
}

export async function listModules(projectId: string): Promise<NotebookModule[]> {
	return db.modules.where('projectId').equals(projectId).toArray();
}

function defaultTitleFor(type: ModuleType): string {
	switch (type) {
		case 'note':
			return 'Observations';
		case 'graph':
			return 'Graph';
		case 'list':
			return 'Array';
		case 'trace':
			return 'Trace';
		case 'python':
			return 'Scratchpad';
		case 'excalidraw':
			return 'Sketch';
	}
}

export async function exportProject(projectId: string): Promise<string> {
	const project = await getProject(projectId);
	const modules = await listModules(projectId);
	return JSON.stringify({ project, modules }, null, 2);
}

export async function importProject(json: string): Promise<string> {
	const parsed = JSON.parse(json) as { project: Project; modules: NotebookModule[] };
	const now = Date.now();
	const newId = uuid();
	const idMap = new Map<string, string>();
	const project: Project = {
		...parsed.project,
		id: newId,
		createdAt: now,
		updatedAt: now
	};
	const modules: NotebookModule[] = parsed.modules.map((m) => {
		const newModuleId = uuid();
		idMap.set(m.id, newModuleId);
		return { ...m, id: newModuleId, projectId: newId, createdAt: now, updatedAt: now };
	});
	project.moduleOrder = parsed.project.moduleOrder
		.map((oldId) => idMap.get(oldId))
		.filter((v): v is string => Boolean(v));
	await db.transaction('rw', db.projects, db.modules, async () => {
		await db.projects.add(project);
		await db.modules.bulkAdd(modules);
	});
	return newId;
}
