import { marked } from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

function renderMath(expr: string, displayMode: boolean): string {
	try {
		return katex.renderToString(expr.trim(), { displayMode, throwOnError: false });
	} catch {
		return `<span class="text-error">${expr}</span>`;
	}
}

export function renderMarkdown(source: string): string {
	const store: string[] = [];
	const stash = (html: string) => {
		store.push(html);
		return `@@MATH${store.length - 1}@@`;
	};

	let text = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) =>
		stash(renderMath(expr, true))
	);
	text = text.replace(/\$([^$\n]+?)\$/g, (_, expr: string) => stash(renderMath(expr, false)));

	let html = marked.parse(text, { async: false }) as string;
	html = html.replace(/@@MATH(\d+)@@/g, (_, i: string) => store[Number(i)]);

	return DOMPurify.sanitize(html, { ADD_TAGS: ['math'], ADD_ATTR: ['display'] });
}
