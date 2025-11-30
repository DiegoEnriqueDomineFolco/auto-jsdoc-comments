/**
 * ================================================================
 *  HELPERS MODULE – JSDoc/Test Automation Utilities
 * ------------------------------------------------
 * Purpose:
 *   Centralized utilities for automated JSDoc and test generation in JS/TS codebases.
 *   Provides symbol extraction, type/parameter inference, deduplication, and test skeleton helpers.
 *
 * Main Exports:
 *   - getAllFiles: Recursively lists valid source files.
 * 	 - showDiff: Simple diff output for original vs updated content.
 *
 * Design:
 *   - Modular, DRY, and extensible (matcher pipelines for parsing, helpers for formatting).
 *   - No heavy AST parsing; relies on robust regex and heuristics for speed and maintainability.
 *
 * For onboarding, see also: generate-comments-jsdoc.mjs (main orchestrator).
 * Author: Diego Enrique Dómine Folco
 * ================================================================
 */

import fs from "fs";
import path from "path";

/* ================================================================
	UTILITY FUNCTIONS
	--------------------------------------------------------------- */
/**
 * Recursively traverses directories and returns the list of valid files.
 */
export function getAllFiles(dir, testFolder, validExtensions, files = []) {

	//is a single file ??
	if (fs.lstatSync(dir).isFile()) {
		if (validExtensions.includes(path.extname(dir))) {
			files.push(dir);
		}
		return files;
	}

	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== testFolder) getAllFiles(fullPath, testFolder, validExtensions, files);
		} else if (validExtensions.includes(path.extname(entry.name))) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Utility: Get today's date in YYYY-MM-DD
 */
export function getToday() {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Utility: Simple diff output (shows lines added)
 */
export function showDiff(original, updated, file) {
	const origLines = original.split('\n');
	const updLines = updated.split('\n');
	console.log(`\n--- ${file} ---`);
	let i = 0, j = 0;
	while (i < origLines.length || j < updLines.length) {
		if (origLines[i] !== updLines[j]) {
			if (updLines[j] && (!origLines[i] || origLines[i] !== updLines[j])) {
				console.log(`+ ${updLines[j]}`);
			}
		}
		i++;
		j++;
	}
	console.log('--- END DIFF ---\n');
}

/**
 * Checks if a line is a normalized (coded) comment (from codeManualComments).
 * @param {string} line
 * @returns {boolean}
 */
export function isCodedComment(line) {
	return typeof line === 'string' && (
		line.trim().startsWith('/****') ||
		line.trim().startsWith('/**') ||
		line.trim().startsWith('//') ||
		line.trim().startsWith('*') ||
		line.trim().startsWith('*/')
	);
}