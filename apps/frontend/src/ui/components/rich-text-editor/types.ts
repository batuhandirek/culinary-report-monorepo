import type { Editor } from '@tiptap/core';
import type { Component } from 'svelte';

// A toolbar button a caller adds to the editor; `run`/`active`/`disabled` receive the live editor
// instance so the button can drive it (e.g. insert a custom node).
export type EditorTool = {
	icon: Component;
	title: string;
	run: (editor: Editor) => void;
	active?: (editor: Editor) => boolean;
	disabled?: (editor: Editor) => boolean;
};
