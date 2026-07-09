export type ModuleType = 'note' | 'graph' | 'list' | 'trace' | 'python' | 'excalidraw';

export interface Project {
	id: string;
	name: string;
	description: string;
	url: string;
	tags: string[];
	rating: number | null;
	createdAt: number;
	updatedAt: number;
	moduleOrder: string[];
}

export interface NoteData {
	markdown: string;
}

export interface GraphData {
	nodes: unknown[];
	edges: unknown[];
}

export interface ListData {
	label: string;
	items: string[];
	highlighted: number[];
}

export interface TraceData {
	columns: string[];
	rows: string[][];
}

export interface TestCase {
	id: string;
	name: string;
	stdin: string;
	expected: string;
}

export interface PythonData {
	code: string;
	testCases: TestCase[];
}

export interface ExcalidrawData {
	elements: unknown[];
	appState: Record<string, unknown>;
	files: Record<string, unknown>;
}

export type ModuleData =
	| NoteData
	| GraphData
	| ListData
	| TraceData
	| PythonData
	| ExcalidrawData;

export interface NotebookModule {
	id: string;
	projectId: string;
	type: ModuleType;
	title: string;
	createdAt: number;
	updatedAt: number;
	data: ModuleData;
}

export const MODULE_LABELS: Record<ModuleType, string> = {
	note: 'Notes',
	graph: 'Graph',
	list: 'List / Array',
	trace: 'Trace Table',
	python: 'Python',
	excalidraw: 'Sketch'
};

export const MODULE_ICONS: Record<ModuleType, string> = {
	note: '📝',
	graph: '🕸️',
	list: '📊',
	trace: '📋',
	python: '🐍',
	excalidraw: '✏️'
};

export function emptyModuleData(type: ModuleType): ModuleData {
	switch (type) {
		case 'note':
			return { markdown: '' } satisfies NoteData;
		case 'graph':
			return { nodes: [], edges: [] } satisfies GraphData;
		case 'list':
			return { label: 'array', items: [], highlighted: [] } satisfies ListData;
		case 'trace':
			return { columns: ['step', 'state'], rows: [] } satisfies TraceData;
		case 'python':
			return {
				code: '# Write Python here\ndef solve():\n    pass\n',
				testCases: []
			} satisfies PythonData;
		case 'excalidraw':
			return { elements: [], appState: {}, files: {} } satisfies ExcalidrawData;
	}
}
