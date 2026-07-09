export function relativeTime(ts: number): string {
	const diff = Date.now() - ts;
	const sec = Math.round(diff / 1000);
	if (sec < 60) return 'just now';
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.round(hr / 24);
	if (day < 30) return `${day}d ago`;
	return new Date(ts).toLocaleDateString();
}

export function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	wait = 400
): (...args: Args) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
}

export function download(filename: string, content: string, mime = 'application/json') {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
