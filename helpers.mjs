/**
 * ================================================================
 *  HELPERS MODULE – JSDoc/Test Automation Utilities
 * ------------------------------------------------
 * Purpose:
 *   Centralized utilities for automated JSDoc and test generation in JS/TS codebases.
 *   Provides symbol extraction, type/parameter inference, deduplication, and test skeleton helpers.
 *
 * Main fns:
 *   - extractDeclarations: Detects exported/internal functions, constants, classes, types, interfaces.
 *   - inferReturnType: Heuristic return type inference.
 *   - removeJsdocBlocks: Removes previous auto-generated JSDoc blocks.
 *   - parseParams: Parses function/method parameter lists into structured objects.
 * 		
 *
 * Design:
 *   - Modular, DRY, and extensible (matcher pipelines for parsing, helpers for formatting).
 *   - No heavy AST parsing; relies on robust regex and heuristics for speed and maintainability.
 *
 * For onboarding, see also: generate-comments-jsdoc.mjs (main orchestrator).
 * Author: Diego Enrique Dómine Folco
 * ================================================================
 */

import { isCodedComment } from './utils.mjs';

/* ================================================================
 EXTRACT DECLARATIONS & HELPER FUNCTIONS
	--------------------------------------------------------------- */
/**
 * Detects declarations by applying multiple regex const declarationsPatterns.
 * @param {string} content
 */
export function extractDeclarations(content) {

	// console.log("Extracting declarations from content:", content);
	const results = [];
	// const lines = content.split('\n');

	// Processing all patterns
	for (const pattern of declarationsPatterns) {
		// console.log("Processing pattern:", pattern);
		const allMatchs = Array.from(content.matchAll(pattern.regex));
		// console.log("Found matches for pattern:", pattern.regex, allMatchs.length);
		// // if (allMatchs.length > 0) {
		// // 	// console.log("Matches:", allMatchs);
		// // }
		for (const match of allMatchs) {
			let raw = match[0];
			const rawTrimmed = raw.trim();
			const lines = rawTrimmed.split('\n');
			let rawLastLine = [];
			rawLastLine = lines[lines.length - 1];
			rawLastLine = rawLastLine.split('//')[0].trim();
			const openChar = rawLastLine[rawLastLine.length - 1];

			const matchIndex = match.index;
			const endIndexDeclared = matchIndex + raw.length;
			// // Calculate startLine using match.index over the input(lines)
			const { startLineNum, insertBlockLine, lineFromIndex } = getLineFromIndex(match.input, matchIndex, endIndexDeclared);

			// console.log("\n=========================");
			// console.log("rawLastLine", rawLastLine);
			// console.log("Processing match:", match);
			// console.log("match.index:", matchIndex);
			// console.log("raw length:", raw.length);
			// console.log("match regex:", pattern.regex);
			// console.log("raw:", raw.trim());
			// console.log("startLineNum:", startLineNum);
			// console.log("lineFromIndex:", lineFromIndex);
			// console.log("openChar:", openChar);
			// console.log("endIndexDeclared:", endIndexDeclared);


			let endLineNum;
			if (openChar === ';') {
				endLineNum = startLineNum;
			} else {
				endLineNum = findBlockEnd(match.input, endIndexDeclared, openChar);
			}

			if (!endLineNum || endLineNum === null) {
				console.warn("No se pudo encontrar el final del bloque para la declaración en la línea:", startLineNum);
				continue;
			}
			// console.log("endLineNum:", endLineNum);

			const mapped = pattern.map(match);
			if (!mapped) continue;
			if (Array.isArray(mapped)) {
				for (const m of mapped) {
					results.push({ ...m, rawLine: m.rawLine || raw, startLineNum, endLineNum, insertBlockLine });
				}
			} else {
				results.push({ ...mapped, rawLine: raw, startLineNum, endLineNum, insertBlockLine });
			}

		}
	} // End pattern loop

	const proccesedResults = processDeclarationsResults(results);
	// console.log("PROCESSED RESULTS:", proccesedResults);

	return proccesedResults;
}

/**
 * Processes raw extraction results to finalize symbol details, sorting, avoiding nested.
 */
function processDeclarationsResults(results) {
	results.sort((a, b) => a.startLineNum - b.startLineNum);

	// Filter out nested symbols, keeping only top-level
	const topLevel = results.filter(sym => {
		return !results.some(
			other =>
				other !== sym &&
				other.startLineNum != null && other.endLineNum != null &&
				sym.startLineNum != null && sym.endLineNum != null &&
				sym.startLineNum > other.startLineNum && sym.endLineNum <= other.endLineNum
		);
	});

	// Remove exact duplicates of startLineNum and name
	const finalTopLevel = [];
	for (const sym of topLevel) {
		if (!finalTopLevel.some(s => s.name === sym.name && s.startLineNum === sym.startLineNum)) {
			finalTopLevel.push(sym);
		}
	}

	return finalTopLevel;
}

/**
 * Getting line related to index
 * @param {string} input 
 * @param {int} index 
 * @param {int} endIndex 
 * @returns 
 */
function getLineFromIndex(input, index, endIndex) {
	const startLineNum = getLineNumberFromIndex(input, index);
	const lines = input.split('\n');

	let insertBlockLine = startLineNum;
	// Check previous lines for comments (using isCodedComment function)
	// If a comment line is found, set insertBlockLine to that line; otherwise, keep startLineNum
	// Search backwards until a non-comment line is found, then stop
	for (let i = startLineNum - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (isCodedComment(line)) {
			insertBlockLine = i;
		} else {
			break;
		}
	}

	let lineFromIndex;
	const line = lines[startLineNum];

	const lineLength = line.length;
	if (index + lineLength <= endIndex) {
		lineFromIndex = input.slice(index, endIndex);
	} else {
		lineFromIndex = line;
	}

	// If the line contains an inline comment, remove that part
	// Example: "const flatResult = {}; //flatResult is a flat array of all fields"
	lineFromIndex = lineFromIndex.split('//')[0];

	return { line: lines[startLineNum], startLineNum, insertBlockLine, lineFromIndex: lineFromIndex.trim() };
}

/**
 * Getting number line related to index
 * @param {string} input 
 * @param {int} index 
 * @returns 
 */
function getLineNumberFromIndex(input, index) {
	// Counts line breaks (\n or \r\n) before the index
	const pre = input.slice(0, index);
	return pre.split(/\r?\n/).length - 1; // Returns the line number (1-based)
}

/**
 * Finds the end line of a block delimited by braces from a starting index.
 * @param {string} input 
 * @param {int} startIndex 
 * @param {char} openChar 
 * @returns 
 */
function findBlockEnd(input, startIndex, openChar = '{') {
	const pairs = {
		'(': ')',
		'[': ']',
		'{': '}',
		'>': ';',
	};

	if (!pairs[openChar]) openChar = '{';// Fallback default to {
	const closeChar = pairs[openChar];

	let count = 1;
	let insideBlock = true;
	// // console.log('Finding block end from index:', startIndex, "to find matching for:", openChar, closeChar, "until index:", input.length);
	for (let i = startIndex; i <= input.length; i++) {
		const char = input[i];
		// console.log("analyzing char", char, "at index:", i, "count", count);
		if (char === openChar) {
			count++;
			insideBlock = true;
			//   console.log("encontrado abre, index:", i, "count:", count, "inside block?", insideBlock);
		}

		if (char === closeChar) {
			count--;
			insideBlock = false;
			//   console.log("encontrado cierra, index:", i, "count:", count, "inside block?", insideBlock);
		}

		if (count === 0 && insideBlock === false) {
			// Final line, calculate number
			const pre = input.slice(0, i);
			const endLineNum = pre.split('\n').length;
			return endLineNum;
		}
	}/// End for

	return null; // not founding end
}


/* ================================================================
 JSDOC BLOCK FUNCTIONS
	--------------------------------------------------------------- */
/**
 * Utility: Remove existing auto-generated JSDoc comments
 * @param {*} content of file
 * @returns content without auto-generated JSDoc comments
 */
export function removeJsdocBlocks(content, flagCodeBlocks) {
	const lines = content.split('\n');
	const cleanedLines = [];
	let skipping = false;

	for (let line of lines) {
		if (line.trim().startsWith(`/** ${flagCodeBlocks}`)) {
			skipping = true;
			continue;
		}

		if (skipping) {
			if (line.trim().endsWith('*/')) {
				skipping = false;
			}
			continue;
		}
		cleanedLines.push(line);
	}
	return cleanedLines.join('\n');
}

/* ================================================================
 PARAMS PARSING FUNCTIONS
	--------------------------------------------------------------- */

/**
 * Extracts a destructuring block ({} or []) and optional TS type annotation from a parameter string.
 * Optimized for clarity and robustness.
 * @param {string} str
 * @returns {{ block: string, rest: string, typeAnnotation: string|null }}
 */
function extractDestructuringBlock(str) {
	let i = 0;
	// Skip leading whitespace
	while (str[i] && str[i].trim() === '') i++;
	const open = str[i];
	const close = open === '{' ? '}' : ']';
	let depth = 0;
	let inString = false;
	let stringChar = '';
	let block = '';
	for (; i < str.length; i++) {
		const c = str[i];
		block += c;
		if (inString) {
			if (c === stringChar && str[i - 1] !== '\\') {
				inString = false;
				stringChar = '';
			}
			continue;
		}
		if (c === '"' || c === "'" || c === '`') {
			inString = true;
			stringChar = c;
			continue;
		}
		if (c === open) depth++;
		if (c === close) depth--;
		if (depth === 0) {
			i++;
			break;
		}
	}
	// Extract type annotation after block, if present
	let rest = str.slice(i).trim();
	let typeAnnotation = null;
	if (rest.startsWith(':')) {
		const m = rest.match(/^:\s*([\w\[\]\<\>\|\.]+)/);
		if (m) typeAnnotation = m[1];
	}
	return { block, rest, typeAnnotation };
}

/**
 * Extracts parameters from a JS/TS signature, supporting destructuring, rest, complex types, and default values.
 * Optimized for clarity, performance, and maintainability.
 * @param {string} paramsStr
 * @returns {Array<{name: string, optional: boolean, tsType: string|null, rest: boolean, destructured: boolean, defaultValue: string|undefined}>}
 */
function parseParams(paramsStr) {
	if (!paramsStr) return [];

	// Split by commas, ignoring those inside nested structures or strings
	const params = [];
	let current = '';
	let depth = 0;
	let inString = false;
	let stringChar = '';
	for (let i = 0; i < paramsStr.length; i++) {
		const c = paramsStr[i];
		if (inString) {
			current += c;
			if (c === stringChar && paramsStr[i - 1] !== '\\') {
				inString = false;
				stringChar = '';
			}
			continue;
		}
		if (c === '"' || c === "'" || c === '`') {
			inString = true;
			stringChar = c;
			current += c;
			continue;
		}

		if (c === '{' || c === '[' || c === '(') depth++;
		if (c === '}' || c === ']' || c === ')') depth--;
		if (c === ',' && depth === 0) {
			if (current.trim() && !isCodedComment(current.trim())) {
				params.push(current.trim());
			}
			current = '';
		} else {
			current += c;
		}
	}
	if (current.trim() && !isCodedComment(current.trim())) params.push(current.trim());

	// Helper: detect destructuring start
	const isDestructuringStart = p => p.trim().startsWith('{') || p.trim().startsWith('[');

	// Main parse loop
	const paramObjs = [];
	let idx = 0;
	while (idx < params.length) {
		let p = params[idx];
		if (isDestructuringStart(p)) {
			// Try to join multiline destructuring blocks
			let joined = p;
			let j = idx + 1;
			while (true) {
				const { block, rest, typeAnnotation } = extractDestructuringBlock(joined);
				if (block && block.length > 1 && (block[0] === '{' || block[0] === '[') && (block[block.length - 1] === '}' || block[block.length - 1] === ']')) {
					// Parse inner params
					const inner = block.slice(1, -1);
					let innerParams = parseParams(inner);
					if (typeAnnotation) innerParams.forEach(ip => ip.tsType = typeAnnotation);
					innerParams.forEach(ip => ip.destructured = true);
					paramObjs.push({ __destructured: true, params: innerParams });
					break;
				} else if (j < params.length) {
					joined += ',' + params[j];
					j++;
					idx = j - 1;
				} else {
					// Could not close block, treat as normal string
					paramObjs.push({ name: p });
					break;
				}
			}///end loop
			idx++;
			continue;
		}///end if destructuring

		// Parse rest, default, name, type
		let obj = { name: '', optional: false, tsType: null, rest: false, destructured: false, defaultValue: undefined };
		if (p.startsWith('...')) {
			obj.rest = true;
			p = p.slice(3).trim();
		}

		// Default value
		if (/=/.test(p)) {
			const [left, defVal] = p.split(/=(.+)/).map(s => s && s.trim());
			obj.defaultValue = defVal;
			p = left;
		}

		// Match name, optional, type
		const match = p.match(/^([\w\$]+)(\??)(\s*:\s*(.+))?/);
		if (match) {
			obj.name = match[1];
			obj.optional = !!match[2];
			if (match[4]) obj.tsType = match[4].trim();
		} else {
			obj.name = p;
		}
		paramObjs.push(obj);
		idx++;
	}
	return flattenParams(paramObjs);
}

// Flattens nested parameters (from destructuring) into a flat list
function flattenParams(params) {
	const flat = [];
	for (const p of params) {
		if (p && typeof p === 'object' && p.__destructured && Array.isArray(p.params)) {
			flat.push(...flattenParams(p.params));
		} else {
			flat.push(p);
		}
	}
	return flat;
}

/**
 * Retrieves the JSDoc type for a parameter based on its definition and default value.
 * @param {*} param 
 * @param {*} def 
 * @returns 
 */
export function getParamType(param, def) {
	let name = typeof param === 'string' ? param : param.name;
	let tsType = typeof param === 'object' && param.tsType;
	let value = def && def.defaultValue;
	// If there is a tsType, prioritize it
	if (tsType) {
		return inferTypeFromValue({ value: tsType, name });
	}
	// If there is a default value, use it
	if (value) {
		return inferTypeFromValue({ value, name });
	}
	// If only the name is present
	return inferTypeFromValue({ name });
}

/**
 * Infers the return type of a symbol for JSDoc.
 * @param {object} symbol
 * @param {string} content
 * @returns {string}
 */
// Utility: infers type from value, name or body
function inferTypeFromValue({ value, name, body }) {
	// 1. By value
	if (typeof value === 'string') {
		const val = value.trim();
		if (/^\[.*\]$/.test(val)) return 'Array';
		if (/^\{.*\}$/.test(val)) return 'Object';
		if (/^['"`]/.test(val)) return 'string';
		if (/^-?\d+(\.\d+)?$/.test(val)) return 'number';
		if (/^(true|false)$/.test(val)) return 'boolean';
		if (/^\(.*=>.*\)$/.test(val)) return 'Function';
		if (/null|undefined/.test(val)) return 'null|undefined';
	}
	// 2. By name
	if (name) {
		if (/list$|array$|rows$|items$|data$|group$|record$|values$/i.test(name)) return 'Array';
		if (/obj$|map$|dict$|entity$|row$/i.test(name)) return 'Object';
		if (/callback$|cb$|fn$|func$|handler$/i.test(name)) return 'Function';
		if (/date$|time$/i.test(name)) return 'Date|string';
		if (/id$|count$|num$|length$|index$|amount$|total$/i.test(name)) return 'number';
		if (/name$|label$|desc$|type$|text$|str$|title$/i.test(name)) return 'string';
		if (/flag$|is[A-Z]/.test(name)) return 'boolean';
	}
	// 3. By body
	if (body) {
		if (/return\s+\[/.test(body)) return 'Array';
		if (/return\s+\{/.test(body)) return 'Object';
		if (/return\s+['"`]/.test(body)) return 'string';
		if (/return\s+-?\d+(\.\d+)?/.test(body)) return 'number';
		if (/return\s+(true|false)/.test(body)) return 'boolean';
		if (/return\s+null|return\s+undefined/.test(body)) return 'null|undefined';
		if (/return\s+\(.*=>.*\)/.test(body)) return 'Function';
	}
	return '*';
}

/**
 * Infers the return type of a function or arrow for JSDoc.
 * Context: Only used for function/arrow/arrow-single types in jsdocForFunction.
 * - No tsReturnType field in symbol mapping (not supported).
 * - Not called for constants (handled elsewhere).
 * - If async, wraps type in Promise<...>.
 * - Uses heuristics on function body and name.
 */
export function inferReturnType(symbol, content) {
	let baseType = '*';
	let body = '';
	const lines = content.split('\n').slice(symbol.startLine - 1, symbol.endLine);
	body = lines.join('\n');
	baseType = inferTypeFromValue({ name: symbol.name, body });
	if (symbol.async) return `Promise<${baseType}>`;
	return baseType;
}

/**
 * Parses default parameter values from a function signature.
 * @param {string} rawLine
 * @returns {Array<{name: string, defaultValue: string}>}
 */
export function parseDefaultParams(rawLine) {
	const params = [];
	const paramRegex = /([\w$]+)\s*=\s*([^,\)]+)/g;
	let match;
	while ((match = paramRegex.exec(rawLine)) !== null) {
		params.push({ name: match[1], defaultValue: match[2] });
	}
	return params;
}


/* ================================================================
 * MATCH REGEX PATTERNS
	--------------------------------------------------------------- */

/**
 * Centralized mapping for constant declarations (primitive, array, object).
 * Applies type inference and standardizes output structure.
 */
function mapConstantDeclaration({ name, value, exportType, matching, regex, matched }) {
	return {
		name,
		type: 'constant',
		params: [],
		async: false,
		exportType,
		value,
		jsType: inferTypeFromValue({ value, name }),
		matching,
		regex,
		matched,
	};
}

/* ================================================================
 * MATCH REGEX PATTERNS DEFINITIONS
	--------------------------------------------------------------- */

// Array of pattern descriptors (includes ALL original patterns)
const declarationsPatterns = [

	// =======================
	// EXPORT PATTERNS
	// =======================
	// Exported arrow function (single-line, no block)
	{
		name: 'exported arrow single-line',
		regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*([^\{].*)$/gm,
		map: match => ({
			name: match[1],
			type: 'arrow-single',
			params: parseParams(match[3].slice(1, -1)),
			async: !!match[2],
			exportType: 'export',
			value: match[4],
			matching: "export const fname = async (...) => expr",
			regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*([^\{].*)$/gm,
			matched: match,
		})
	},
	// Exported default async function
	{
		name: 'exported default async function',
		regex: /^[ \t]*export\s+default\s+async\s+function\s+(\w+)?\s*\(([\s\S]*?)\)\s*{/gm,
		map: match => ({
			name: match[1] || 'default',
			type: 'function',
			params: parseParams(match[2]),
			async: true,
			exportType: 'export default',
			value: undefined,
			matching: "export default async function fname(...) {...}",
			regex: /^[ \t]*export\s+default\s+async\s+function\s+(\w+)?\s*\(([\s\S]*?)\)\s*{/gm,
			matched: match,
		})
	},
	// Exported async or regular function
	{
		name: 'exported function',
		regex: /^[ \t]*export\s+(async\s+)?function\s+(\w+)\s*\(([\s\S]*?)\)\s*{/gm,
		map: match => ({
			name: match[2],
			type: 'function',
			params: parseParams(match[3]),
			async: !!match[1],
			exportType: 'export',
			value: undefined,
			matching: "export async function fname(...) {...}",
			regex: /^[ \t]*export\s+(async\s+)?function\s+(\w+)\s*\(([\s\S]*?)\)\s*{/gm,

			matched: match,
		})
	},
	// Exported arrow function (block required)
	{
		name: 'exported arrow',
		regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?(\([\s\S]*?\))\s*=>\s*{/gm,
		map: match => ({
			name: match[1],
			type: 'arrow',
			params: parseParams(match[3].slice(1, -1)),
			async: !!match[2],
			exportType: 'export',
			value: undefined,
			matching: "export const fname = async (...) => {...}",
			regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?(\([\s\S]*?\))\s*=>\s*{/gm,
			matched: match,
		})
	},
	// Exported default function (block required)
	{
		name: 'exported default function',
		regex: /^[ \t]*export\s+default\s+function\s+(\w+)?\s*\(([\s\S]*?)\)\s*{/gm,
		map: match => ({
			name: match[1] || 'default',
			type: 'function',
			params: parseParams(match[2]),
			async: false,
			exportType: 'export default',
			value: undefined,
			matching: "export default function fname(...) {...}",
			regex: /^[ \t]*export\s+default\s+function\s+(\w+)?\s*\(([\s\S]*?)\)\s*{/gm,
			matched: match,
		})
	},
	// Exported default arrow (block required)
	{
		name: 'exported default arrow',
		regex: /^[ \t]*export\s+default\s*(async\s*)?(\([\s\S]*?\))\s*=>\s*{/gm,
		map: match => ({
			name: 'default',
			type: 'arrow',
			params: parseParams(match[2].slice(1, -1)),
			async: !!match[1],
			exportType: 'export default',
			value: undefined,
			matching: "export default async (...) => {...}",
			regex: /^[ \t]*export\s+default\s*(async\s*)?(\([\s\S]*?\))\s*=>\s*{/gm,
			matched: match,
		})
	},
	// Exported const function expression
	{
		name: 'exported const function expr',
		regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?function\s*\(([\s\S]*?)\)/gm,
		map: match => ({
			name: match[1],
			type: 'function',
			params: parseParams(match[3]),
			async: !!match[2],
			exportType: 'export',
			value: undefined,
			matching: "export const fname = function(...) {...}",
			regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(async\s*)?function\s*\(([\s\S]*?)\)/gm,
			matched: match,
		})
	},
	// Exported class
	{
		name: 'exported class',
		regex: /^[ \t]*export\s+class\s+(\w+)\s*{/gm,
		map: match => ({
			name: match[1],
			type: 'class',
			params: [],
			async: false,
			exportType: 'export',
			value: undefined,
			matching: "export class fname {...}",
			regex: /^[ \t]*export\s+class\s+(\w+)\s*{/gm,
			matched: match,
		})
	},
	// Exported constant array/object
	{
		name: 'exported constant array/object',
		regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*([\[\{][\s\S]*?[\]\}]);/gm,
		map: match => {
			const value = match[2].trim();
			if (/^(\(?\s*async\s*)?function/.test(value) || /^(async\s*)?\([\s\S]*?\)\s*=>/.test(value)) {
				return null;
			}
			return mapConstantDeclaration({
				name: match[1],
				value,
				exportType: 'export',
				matching: "export const <name> = [ ... ];  and export const <name> = { ... };",
				regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*([\[\{][\s\S]*?[\]\}]);/gm,
				matched: match,
			});
		}
	},
	// Exported constant primitive (number, string, boolean, null, undefined)
	{
		name: 'exported constant primitive',
		regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(?:(["'].*?["'])|(true|false)|(null)|(undefined)|(-?\d+(?:\.\d+)?))(?:;|$)/gm,
		map: match => {
			let value = match[2] || match[3] || match[4] || match[5] || match[6];
			return mapConstantDeclaration({
				name: match[1],
				value,
				exportType: 'export',
				matching: "export const <name> = <primitive>;",
				regex: /^[ \t]*export\s+const\s+(\w+)\s*=\s*(?:([\"'].*?[\"'])|(true|false)|(null)|(undefined)|(-?\\d+(?:\\.\\d+)?))(?:;|$)/gm,
				matched: match,
			});
		}
	},
	// =======================
	// INTERNAL PATTERNS
	// =======================
	// Internal arrow function (single-line, no block)
	{
		name: 'internal arrow single-line',
		regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*([^\{].*)$/gm,
		map: match => {
			let paramsRaw = match[3].trim();
			let params = paramsRaw.startsWith('(') && paramsRaw.endsWith(')')
				? parseParams(paramsRaw.slice(1, -1))
				: paramsRaw ? [paramsRaw] : [];
			return {
				name: match[1],
				type: 'arrow-single',
				params,
				async: !!match[2],
				exportType: 'internal',
				value: match[4],
				matching: "const fname = async (...) => expr",
				regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*([^\{].*)$/gm,
				matched: match,
			};
		}
	},
	// // Internal constant (array, object, primitive; excludes arrow and function)
	{
		name: 'internal constant',
		regex: /^[ \t]*const\s+(\w+)\s*=\s*([\s\S]*?);/gm,
		map: match => {
			const value = match[2].trim();
			if (
				/^(\(?\s*async\s*)?function/.test(value) ||
				/^(async\s*)?\([\s\S]*?\)\s*=>/.test(value)
			) {
				return null;
			}
			return mapConstantDeclaration({
				name: match[1],
				value,
				exportType: 'internal',
				matching: "const <name> = value;",
				regex: /^[ \t]*const\s+(\w+)\s*=\\s*([\\s\\S]*?);/gm,
				matched: match,
			});
		}
	},
	// Internal arrow (block required)
	{
		name: 'internal arrow',
		// Solo matchea si el => y el { están en la misma línea (no multilinea)
		regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*{/gm,
		map: match => {
			let paramsRaw = match[3].trim();
			let params = paramsRaw.startsWith('(') && paramsRaw.endsWith(')')
				? parseParams(paramsRaw.slice(1, -1))
				: paramsRaw ? [paramsRaw] : [];
			return {
				name: match[1],
				type: 'arrow',
				params,
				async: !!match[2],
				exportType: 'internal',
				value: undefined,
				matching: "const fname = async (...) => {...}",
				regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?(\([^\)]*\))\s*=>\s*{/gm,
				matched: match,
				rawLine: match[0],
			};
		}
	},
	// Internal async or regular function
	{
		name: 'internal function',
		regex: /^[ \t]*(async\s+)?function\s+(\w+)\s*\(([\s\S]*?)\)\s*{/gm,
		map: match => ({
			name: match[2],
			type: 'function',
			params: parseParams(match[3]),
			async: !!match[1],
			exportType: 'internal',
			value: undefined,
			matching: "async function fname(...) {...}",
			regex: /^[ \t]*(async\s+)?function\s+(\w+)\s*\(([\s\S]*?)\)\s*{/gm,
			matched: match,
		})
	},
	// Internal const function expression
	{
		name: 'internal const function expr',
		regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?function\s*\(([\s\S]*?)\)/gm,
		map: match => ({
			name: match[1],
			type: 'function',
			params: parseParams(match[3]),
			async: !!match[2],
			exportType: 'internal',
			value: undefined,
			matching: "const fname = function(...) {...}",
			regex: /^[ \t]*const\s+(\w+)\s*=\s*(async\s*)?function\s*\(([\s\S]*?)\)/gm,
			matched: match,
		})
	},
	// =======================
	// TYPESCRIPT PATTERNS
	// =======================

	// Type function
	{
		name: 'type function',
		regex: /^[ \t]*type\s+(\w+)\s*=\s*\(([\s\S]*?)\)\s*=>\s*([\w\[\]\<\>]+)/gm,
		map: match => ({
			name: match[1],
			type: 'type',
			params: parseParams(match[2]),
			async: false,
			exportType: 'type',
			value: match[3],
			rawLine: match[0],
			matching: "type fname = (...) => ReturnType",
			regex: /^[ \t]*type\s+(\w+)\s*=\s*\(([\s\S]*?)\)\s*=>\s*([\w\[\]\<\>]+)/gm,
			matched: match,
		})
	},
	// Interface method
	{
		name: 'interface method',
		regex: /^[ \t]*interface\s+(\w+)\s*{([\s\S]*?)}/gm,
		map: (match) => {
			const ifaceName = match[1];
			const body = match[2];
			const methodRegex = /(\w+)\s*\(([\s\S]*?)\)\s*:\s*([\w\[\]\<\>]+)/g;
			const methods = [];
			for (const m of body.matchAll(methodRegex)) {
				methods.push({
					name: `${ifaceName}.${m[1]}`,
					type: 'interface-method',
					params: parseParams(m[2]),
					async: false,
					exportType: 'interface',
					value: m[3],
					rawLine: m[0],
					matching: "interface fname { method(...) : ReturnType; }",
					regex: methodRegex,
					matched: m,
				});
			}
			return methods.length ? methods : null;
		}
	},
];