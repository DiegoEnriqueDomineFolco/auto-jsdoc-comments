/**
 * ================================================================
 * 🧪 AUTO COMMENTS GENERATOR – Base Script v1.7
 * ------------------------------------------------
 * Purpose:
 *   Scans JS/TS source files, detects all declarations (functions, classes, constants, types, interfaces),
 *   and inserts uniform, auto-generated JSDoc blocks above each symbol.
 *
 * Main Flow (Step Diagram):
 *   1. getAllFiles: Recursively find all source files in baseDir (excluding test/BASE folders).
 *   2. For each file:
 *      a. removeJsdocBlocks: Remove previous auto-generated JSDoc blocks.
 *      b. codeManualComments: Temporarily encode manual // comments to avoid collision.
 *      c. addJsdocBlocks: For each detected symbol, insert a new JSDoc block (via jsdocBlock & helpers).
 *      d. decodeManualComments: Restore manual comments to original form.
 *      e. Prepend a global header.
 *      f. Write file (or show diff if dryRun).
 *
 * Key Functions Table:
 *   | Function              | Purpose                                                      |
 *   |-----------------------|--------------------------------------------------------------|
 *   | codeManualComments    | Encodes manual // comments for safe processing               |
 *   | decodeManualComments  | Restores manual comments to original form                    |
 *   | addJsdocBlocks        | Inserts new JSDoc blocks above each symbol                   |
 *   | jsdocBlock            | Generates a JSDoc block for a symbol by type 				|
 *
 * Design:
 *   - Modular, DRY, and extensible (delegates symbol parsing and formatting to helpers.mjs).
 *
 * For symbol extraction, type inference, and formatting, see: helpers.mjs
 * Author: Diego Enrique Dómine Folco
 * ================================================================
 */
//importing reading files fns
import fs from "fs";

//importing utils
import { extractDeclarations, inferReturnType, parseDefaultParams, removeJsdocBlocks, getParamType } from "./helpers.mjs";
import { getAllFiles, getToday, showDiff, isCodedComment } from "./utils.mjs";

/* ================================================================
CONFIGURATION
--------------------------------------------------------------- */
//importing config
import config from "./config.mjs";

const { baseDir, excludeFolders, validExtensions, dryRun, flagCodeBlocks } = config;

// const whereToLook = "./";
// const baseDir = path.resolve(whereToLook);
// const excludeFolders = ["__tests__", "BASE__tests__", "node_modules"];
// const validExtensions = [".js", ".ts"];
// const dryRun = false; // false = writing changes; true = showing diffs on console
// const flagCodeBlocks = "Automated Testing Block - Do Not Change";

/* ================================================================
 UTILITY FUNCTIONS
	--------------------------------------------------------------- */
/**
 * Utility: Encode manual comments in the file (just for automated JSDoc processing)
 * transforms all lines // ... into commented block
 * @param {*} content of file, already without auto-generated JSDoc comments
 * @returns content with normalized comments
 */
function codeManualComments(content) {
	const lines = content.split('\n');
	const codedLines = [];
	for (let line of lines) {
		if (line.trim().startsWith('//')) {
			// before and after "//"
			const before = line.substring(0, line.indexOf("//"));
			const after = line.substring(before.length);
			line = before + '/**** ' + after.trim().substring(2).trim() + ' */';
		}
		codedLines.push(line);
	}

	return codedLines.join('\n');
}

/**
 * Utility: Decode manual comments in the file (just for automated JSDoc processing)
 * transforms all lines // ... into commented block
 * @param {*} content of file, already without auto-generated JSDoc comments
 * @returns content with normalized comments
 */
function decodeManualComments(content) {
	const lines = content.split('\n');
	const decodedLines = [];
	for (let line of lines) {
		if (line.trim().startsWith('/****')) {
			// before and after "//"
			const before = line.substring(0, line.indexOf("/****"));
			const after = line.substring(before.length);
			line = before + '// ' + after.trim().substring(5).trim();
			line = line.slice(0, -3);
		}
		decodedLines.push(line);
	}

	return decodedLines.join('\n');
}

/* ================================================================
 BLOCK FUNCTIONS
	--------------------------------------------------------------- */

/**
 * Formats a JSDoc line in a uniform way.
 * @param {string} tag - The JSDoc tag (e.g. param, returns, async, export)
 * @param {string} [type] - The data type (e.g. string, number), normalized to lowercase and wrapped in braces if present
 * @param {string} [name] - The parameter or entity name
 * @param {string} [description] - Optional description
 * @returns {string} Formatted JSDoc line
 */
function formatJsdocLine(tag, type, name, description) {
	let line = ` * @${tag}`;
	if (type) {
		// Normalize type to lowercase and wrap in braces
		line += ` {${String(type).toLowerCase()}}`;
	}
	if (name) {
		line += ` ${name}`;
	}
	if (description) {
		line += ` ${description}`;
	}
	return line;
}
/**
 * Deduplicates and cleans tags for JSDoc blocks or arrays (strings or objects).
 * If key is provided, deduplicates by that key (for array of objects), else by value (for strings).
 * @param {Array} arr - Array to clean (strings or objects)
 * @param {string} [key] - Key to compare by (optional)
 * @returns {Array}
 */
function cleanTags(arr, key) {
	if (!Array.isArray(arr)) return [];
	const filtered = arr.filter(Boolean);
	if (!key) {
		// Deduplicate by value (for string arrays)
		return Array.from(new Set(filtered));
	}
	// Deduplicate by key (for object arrays)
	const seen = new Set();
	return filtered.filter(item => {
		const val = item[key];
		if (seen.has(val)) return false;
		seen.add(val);
		return true;
	});
}

/**
 * Utility: Insert JSDoc above all function/const/class exports and internals, and preserves manual comments
 * @param {*} content of file, already normalized
 * @returns content with JSDoc comments added
 */
function addJsdocBlocks(content) {
	const symbols = extractDeclarations(content);
	let lines = content.split('\n');
	let linesAdded = 0;
	// console.log("symbols received:", symbols);

	// Already filtered, using all
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		// console.log("SYMBOL PARAMS:", sym.params);
		// console.log(`🔍 Processing symbol: ${sym.name} (type: ${sym.type}), sym: `, sym);

		// Use startLine to insert the JSDoc block right before the declaration
		const insertIdx = sym.insertBlockLine + linesAdded;
		const jsdocLines = jsdocBlock(sym, content).split('\n');
		// // console.log("BLOCK TO ADD:", jsdocLines);
		// Insert jsdocLines at insertIdx
		lines.splice(insertIdx, 0, ...jsdocLines);
		linesAdded += jsdocLines.length;
	}
	return lines.join('\n');
}

/**
 * Utility: Generate JSDoc block for a given symbol
 * @param {*} symbol from extractExportedFunctions
 * @returns {string}
 */
function jsdocBlock(symbol, content) {
	const header = [`/** ${flagCodeBlocks}`, ` * Details about: ${symbol.name}.`];
	// lines.push(` * Raw: ${symbol.rawLine}`);
	let lines = [];
	 switch (symbol.type) {
	 	case 'function':
	 	case 'arrow':
	 	case 'arrow-single':
	 		lines = jsdocForFunction(symbol, content);
	 		break;
	 	case 'class':
	 		lines = jsdocForClass(symbol);
	 		break;
	 	case 'constant':
	 		lines = jsdocForConstant(symbol);
	 		break;
	 	case 'type':
	 		lines = jsdocForType(symbol);
	 		break;
	 	case 'interface':
	 	case 'interface-method':
	 		lines = jsdocForInterfaceMethod(symbol);
	 		break;
	 	default:
	 		lines = [` * @unknown`];
	 }
	return [...header, ...lines, ' */'].join("\n");
}

/**
 * jsdocBlock type function | arrow | arrow-single
 * @param {*} symbol 
 * @param {*} content 
 * @returns 
 */
function jsdocForFunction(symbol, content) {
	const lines = [];
	const defaults = parseDefaultParams(symbol.rawLine);
	// 1. Params (using the new symbol.params structure)
	for (const p of symbol.params) {
		// p already has: name, optional, tsType, rest, destructured, defaultValue
		const def = defaults.find(d => d.name === (p.name || p));
		// Prefer defaultValue from parseParams if exists
		const defaultVal = p.defaultValue !== undefined ? p.defaultValue : (def && def.defaultValue);
		const paramType = getParamType(p, def);
		let descParts = [];
		if (defaultVal !== undefined) descParts.push(`(default: ${defaultVal})`);
		if (p.optional) descParts.push('[optional]');
		if (p.rest) descParts.push('[rest]');
		// if (p.destructured) descParts.push('[destructured]');
		const description = descParts.length ? descParts.join(' ') : undefined;
		lines.push(formatJsdocLine('param', paramType, p.name, description));
	}

	// 2. Async
	if (symbol.async) lines.push(formatJsdocLine('async'));
	
	// 3. Export/internal tags
	let tags = [];
	if (symbol.exportType) tags.push(symbol.exportType);
	
	// 4. Return
	const bodyLines = content.split('\n').slice(symbol.startLineNum, symbol.endLineNum);
	let closingLine = [];

	//lets find end line with return, reading backwards, triming each line,
	//fetch until first founded line with length >= 6(6 because "return" has 6 characters);
	//using this line if it has "return" word, otherwise not;
	for (let j = bodyLines.length -1; j >= 0; j--) {
		// // console.log("Checking body line numb ", j, " for return:", bodyLines[j]);
		const line = bodyLines[j].trim();
		
		//avoid commented lines
		if (isCodedComment(line)) continue;

		if (line.length >= 6 && line.includes("return")) {
			// // console.log("Found possible return line:", line);
			closingLine.push(line);
			break;
		}
	}///end for

	const hasReturnWithValue = closingLine.some(l => /return\s+[^;]+/.test(l));
	const hasReturnVoid = closingLine.some(l => /return\s*;/.test(l));
	const hasAnyReturn = closingLine.some(l => /return\b/.test(l));

	if (hasReturnWithValue) {
		lines.push(formatJsdocLine('returns', inferReturnType(symbol, content)));
	} else if (hasReturnVoid || symbol.async || hasAnyReturn) {
		// Si hay return; o la función es async (aunque no retorne valor), documentar correctamente
		if (symbol.async) {
			lines.push(formatJsdocLine('returns', 'Promise<void>'));
		} else {
			lines.push(formatJsdocLine('returns', 'void'));
		}
	}

	// final cleaning
	cleanTags(tags).forEach(tag => {
		lines.push(formatJsdocLine(tag));
	});

	return lines;
}

/**
 * jsdocBlock type class | 
 * @param {*} symbol 
 * @returns 
 */
function jsdocForClass(symbol) {
	// Always use standard format
	return [
		formatJsdocLine('class', undefined, symbol.name),
		formatJsdocLine(symbol.exportType)
	];
}

/**
 * jsdocBlock type constant | 
 * @param {*} symbol 
 * @returns 
 */
function jsdocForConstant(symbol) {
		const lines = [];
		let value = symbol.value;
		let type = symbol.jsType || '*';
		let summary = '';

		if (value) {
			const trimmed = value.trim();
			if (trimmed.startsWith('[')) {
				type = 'array';
				try {
					// Solo para arrays simples de strings/números
					const arr = eval(trimmed);
					if (Array.isArray(arr) && arr.every(v => typeof v === 'string' || typeof v === 'number')) {
						summary = `(${JSON.stringify(arr)})`;
					} else {
						summary = '([items])';
					}
				} catch {
					summary = '([items])';
				}
			} else if (trimmed.startsWith('{')) {
				type = 'object';
				summary = '({ ... })';
			} else if (type !== '*' && value !== undefined) {
				// Para primitivas, mostrar el valor
				lines.push(formatJsdocLine('value', undefined, undefined, value));
			}
		}
		lines.push(formatJsdocLine('type', type, undefined, summary));
		let tags = [];
		if (symbol.exportType) tags.push(symbol.exportType);
		cleanTags(tags).forEach(tag => {
			lines.push(formatJsdocLine(tag));
		});
		return lines;
}

/**
 * jsdocBlock type type | 
 * @param {*} symbol 
 * @returns 
 */
function jsdocForType(symbol) {
	// Use standard format for typedef and returns
	return [
		formatJsdocLine('typedef', 'function', symbol.name),
		formatJsdocLine('returns', symbol.value)
	];
}

/**
 * jsdocBlock type interface | interface-method | 
 * @param {*} symbol 
 * @returns 
 */
function jsdocForInterfaceMethod(symbol) {
	const lines = [formatJsdocLine('method', undefined, symbol.name)];
	for (const p of symbol.params) {
		// Type is unknown, use '*'
		lines.push(formatJsdocLine('param', '*', p));
	}
	lines.push(formatJsdocLine('returns', symbol.value));
	return lines;
}

/* ================================================================
 MAIN PROCESS
	--------------------------------------------------------------- */
function generateCommentsForAllFiles(dryRun, excludeFolders) {
	if (!fs.existsSync(baseDir)) {
		console.error(`⚠️ Base directory does not exist: ${baseDir}`);
		return;
	}

	console.log(`🧭 Searching for source files to comment in:\n${baseDir}\n...`);

	const allFiles = getAllFiles(baseDir, null, validExtensions);
	let count = 0;

	const today = getToday();
	let header = `/** ${flagCodeBlocks}\n`
		+ ` * 🧪 AUTO-GENERATED JSDoc COMMENTS. Generated: ${today}\n`
		+ ` * This file's comments were generated automatically. Please supervise and inform any issues.\n`
		+ ` * ================================================================\n`
		+ ` */\n`;

	for (const file of allFiles) {
		// Exclude folders
		if (excludeFolders.some(ex => file.includes(ex))) continue;
		console.log(`\n🔍 Processing file: ${file}`);

		const content = fs.readFileSync(file, "utf8");
		const cleaned = removeJsdocBlocks(content, flagCodeBlocks);
		const coded = codeManualComments(cleaned);
		const updated = addJsdocBlocks(coded);
		const final = decodeManualComments(updated);
		const finalContent = header + final;

		//have been changes?
		if (content != finalContent){
			if (dryRun) {
				showDiff(content, finalContent, file);
			} else {
				fs.writeFileSync(file, finalContent, "utf8");
				console.log(`\n✅ Updated: ${file}\n\n`);
			}
			count++;
		}
		
	}

	if (dryRun) {
		console.log(`\n✨ [DRY-RUN] ${count} files would be updated.`);
	} else {
		console.log(`\n✨ ${count} files updated successfully.`);
	}
}

/* ================================================================
	EXECUTION
	--------------------------------------------------------------- */
generateCommentsForAllFiles(dryRun, excludeFolders);
/* ================================================================ */